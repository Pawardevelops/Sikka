import { AppRegistry } from 'react-native';
import database from '../database';
import { TransactionCategory, TransactionType } from '../types';
import Transaction from '../database/models/Transaction';
import UnparsedMessage from '../database/models/UnparsedMessage';
import Account from '../database/models/Account';
import Category from '../database/models/Category';
import { Q } from '@nozbe/watermelondb';

// ==================== REGEX PATTERNS ====================
// Patterns to extract amount, merchant, and account info from bank notifications
const BANK_PATTERNS = [
    // HDFC
    {
        name: 'HDFC',
        // Example: Rs 500.00 debited from a/c **1234 to ZOMATO on 20-10-23
        regex: /rs\.?\s*([0-9,.]+)\s*debited\s*from\s*a\/c\s*\**([0-9]+)\s*to\s*(.+?)\s*on/i,
        type: 'debit',
    },
    {
        name: 'HDFC_CREDIT',
        // Example: Rs 5000.00 credited to a/c **1234 on 20-10-23 by UPI
        regex: /rs\.?\s*([0-9,.]+)\s*credited\s*to\s*a\/c\s*\**([0-9]+)\s*on\s*(.+?)\s*by/i,
        type: 'credit',
    },
    // SBI
    {
        name: 'SBI',
        // Example: SBI: Rs 100.00 debited from a/c ending 1234 on 20-Oct-23 to GOOGLE PAY
        regex: /rs\.?\s*([0-9,.]+)\s*debited\s*from\s*.*?ending\s*([0-9]+)\s*on\s*.*?\s*to\s*(.+?)(?:\s*Ref|$)/i,
        type: 'debit',
    },
    // ICICI
    {
        name: 'ICICI',
        // Example: Acct XX1234 debited with INR 500.00 on 14-Oct. Info: SWIGGY. Avlbl Bal...
        regex: /acct\s*XX([0-9]+)\s*debited\s*with\s*inr\s*([0-9,.]+)\s*on\s*.*?\.\s*info:\s*(.+?)\./i,
        type: 'debit',
        fieldOrder: { account: 1, amount: 2, merchant: 3 } // Custom order
    },
    // Generic UPI
    {
        name: 'UPI',
        // Example: Paid Rs 250.00 to PAYTM
        regex: /paid\s*rs\.?\s*([0-9,.]+)\s*to\s*(.+?)(?:\s*from|\s*using|$)/i,
        type: 'debit',
    }
];

// ==================== HELPER FUNCTIONS ====================

const cleanAmount = (amountStr: string): number => {
    return parseFloat(amountStr.replace(/,/g, ''));
};

const cleanMerchant = (merchantStr: string): string => {
    return merchantStr.trim().toUpperCase()
        .replace('UPI', '')
        .replace('Ref', '')
        .trim();
};

const categorizeTransaction = (merchant: string): TransactionCategory => {
    const m = merchant.toLowerCase();
    if (m.includes('zomato') || m.includes('swiggy') || m.includes('food') || m.includes('pizza') || m.includes('burger')) return 'dining';
    if (m.includes('uber') || m.includes('ola') || m.includes('petrol') || m.includes('fuel')) return 'transport';
    if (m.includes('mart') || m.includes('grocery') || m.includes('blinkit') || m.includes('zepto')) return 'groceries';
    if (m.includes('netflix') || m.includes('prime') || m.includes('movie')) return 'entertainment';
    if (m.includes('pharmacy') || m.includes('med') || m.includes('hospital')) return 'health';
    if (m.includes('salary')) return 'income';
    return 'other';
};

/**
 * Headless JS task to handle incoming notifications
 * This runs even when the app is in the background or killed
 */
export const notificationHandler = async ({ notification }: any) => {
    if (!notification) return;

    const { text, title } = notification;

    if (!text) return;

    console.log('[Sikka] Processing Notification:', text);

    // 1. Save Unparsed Message
    try {
        await database.write(async () => {
            // Basic duplicate check (last 1 min with same body?)
            const existing = await database.get<UnparsedMessage>('unparsed_messages').query(
                Q.where('body', text),
                Q.where('timestamp', Q.gt(Date.now() - 60000))
            ).fetch();

            if (existing.length === 0) {
                await database.get<UnparsedMessage>('unparsed_messages').create(msg => {
                    msg.body = text;
                    msg.sender = title || 'Unknown';
                    msg.timestamp = Date.now();
                });
            }
        });
    } catch (error) {
        console.error('[Sikka] Error saving unparsed:', error);
    }

    let matched = false;
    let transactionData: any = {};

    for (const pattern of BANK_PATTERNS) {
        const match = text.match(pattern.regex);
        if (match) {
            matched = true;
            console.log(`[Sikka] Matched Pattern: ${pattern.name}`);

            const order = (pattern as any).fieldOrder || { amount: 1, account: 2, merchant: 3 };

            // Allow for patterns that might not have account info (like generic UPI)
            let amountStr = match[order.amount] || match[1];
            let merchantStr = match[order.merchant] || match[3] || match[2]; // Fallback logic

            // Special handling if the generic generic UPI pattern
            if (pattern.name === 'UPI') {
                amountStr = match[1];
                merchantStr = match[2];
            } else if (pattern.name === 'ICICI') {
                // Handled by fieldOrder
            } else {
                // Default HDFC/SBI style
                amountStr = match[1];
                merchantStr = match[3];
            }

            const amount = cleanAmount(amountStr);
            const merchant = cleanMerchant(merchantStr);
            const categoryName = categorizeTransaction(merchant);
            const type = pattern.type;

            transactionData = {
                amount,
                merchant,
                categoryName,
                type,
                notes: `Auto-tracked from ${pattern.name} notification`,
            };
            break;
        }
    }

    if (matched && transactionData.amount) {
        try {
            await database.write(async () => {
                const txCollection = database.get<Transaction>('transactions');
                const catCollection = database.get<Category>('categories');
                const accCollection = database.get<Account>('accounts');

                // Check Duplicates in DB
                // Range: +/- 1 minute, same amount
                const duplicates = await txCollection.query(
                    Q.where('amount', transactionData.amount),
                    Q.where('timestamp', Q.between(Date.now() - 60000, Date.now() + 60000))
                ).fetch();

                if (duplicates.length > 0) {
                    console.log('[Sikka] Duplicate transaction ignored');
                    return;
                }

                // Resolve Relations
                // 1. Account: Find default or match? For now, pick FIRST account or specific generic "Bank"
                const accounts = await accCollection.query().fetch();
                let account = accounts.length > 0 ? accounts[0] : null;

                // 2. Category
                let category;
                if (transactionData.categoryName) {
                    const cats = await catCollection.query(Q.where('name', Q.like(`%${transactionData.categoryName}%`))).fetch();
                    if (cats.length > 0) category = cats[0];
                }
                if (!category) {
                    const other = await catCollection.query(Q.where('name', 'other')).fetch();
                    if (other.length > 0) category = other[0];
                }

                if (account) {
                    await txCollection.create(tx => {
                        tx.amount = transactionData.amount;
                        tx.merchant = transactionData.merchant;
                        tx.note = transactionData.notes;
                        tx.timestamp = Date.now();
                        tx.type = transactionData.type;
                        tx.isAuto = true;
                        tx.isDeleted = false;

                        tx.account.set(account);
                        if (category) tx.category.set(category);
                    });

                    // Update Balance
                    await account.update(acc => {
                        if (transactionData.type === 'credit') {
                            acc.balance += transactionData.amount;
                        } else {
                            acc.balance -= transactionData.amount;
                        }
                    });

                    console.log('[Sikka] Transaction saved to DB');
                } else {
                    console.warn('[Sikka] No account found to link auto-transaction');
                }
            });

        } catch (error) {
            console.error('[Sikka] Error saving transaction:', error);
        }
    } else {
        console.log('[Sikka] Notification matched but failed parsing or no amount');
    }
};

