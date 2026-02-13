import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, TransactionCategory, TransactionType } from '../types';

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

const STORAGE_KEY = '@sikka_transactions';

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

    const { text } = notification;

    if (!text) return;

    console.log('[Sikka] Processing Notification:', text);

    // ======= TESTING MODE: Capture ALL notifications =======
    // Save every notification to unparsed list for testing
    try {
        const UNPARSED_STORAGE_KEY = '@sikka_transactions_unparsed';
        const stored = await AsyncStorage.getItem(UNPARSED_STORAGE_KEY);
        const unparsedList: string[] = stored ? JSON.parse(stored) : [];

        // Prevent duplicates
        if (!unparsedList.includes(text)) {
            const updatedList = [text, ...unparsedList].slice(0, 100); // Keep latest 100
            await AsyncStorage.setItem(UNPARSED_STORAGE_KEY, JSON.stringify(updatedList));
            console.log('[Sikka] Notification saved to unparsed list');
        }
    } catch (error) {
        console.error('[Sikka] Error saving to unparsed:', error);
    }
    // ======= END TESTING MODE =======

    let matched = false;
    let transactionData: Partial<Transaction> = {};

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
            const category = categorizeTransaction(merchant);
            const type: TransactionType = pattern.type as TransactionType;

            transactionData = {
                amount,
                merchant,
                category,
                type,
                notes: `Auto-tracked from ${pattern.name} notification`,
                accountId: 'default',
            };
            break;
        }
    }

    if (matched && transactionData.amount) {
        try {
            // Load existing transactions
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const currentTransactions: Transaction[] = stored ? JSON.parse(stored) : [];

            // Create new transaction object
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                amount: transactionData.amount || 0,
                type: transactionData.type || 'debit',
                category: transactionData.category || 'other',
                merchant: transactionData.merchant || 'Unknown',
                notes: transactionData.notes,
                accountId: '1', // Default account for now
                isDeleted: false,
                isAuto: true,
                status: 'pending', // Workflow status
            };

            // Prevent duplicates (simple check by timestamp + amount)
            const isDuplicate = currentTransactions.some(tx =>
                tx.amount === newTransaction.amount &&
                tx.merchant === newTransaction.merchant &&
                Math.abs(tx.timestamp - newTransaction.timestamp) < 60000 // Within 1 minute
            );

            if (!isDuplicate) {
                const updatedTransactions = [...currentTransactions, newTransaction];
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTransactions));
                console.log('[Sikka] Transaction saved:', newTransaction);
            } else {
                console.log('[Sikka] Duplicate transaction ignored');
            }

        } catch (error) {
            console.error('[Sikka] Error saving transaction:', error);
        }
    } else {
        console.log('[Sikka] Notification not matched (already saved to unparsed)');
    }
};

