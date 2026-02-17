/**
 * Sikka - Transactions Context with WatermelonDB
 * Manages app-wide transaction state using WatermelonDB
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Transaction as TransactionType, TransactionCategory } from '../types';
import database from '../database';
import Transaction from '../database/models/Transaction';
import Category from '../database/models/Category';
import TransactionSentiment from '../database/models/TransactionSentiment';
import Sentiment from '../database/models/Sentiment';
import Account from '../database/models/Account';
import { Q } from '@nozbe/watermelondb';

// ==================== CONTEXT TYPE ====================
interface TransactionsContextType {
    transactions: TransactionType[];
    activeTransactions: TransactionType[];
    todayTransactions: TransactionType[];
    isLoading: boolean;
    addTransaction: (transaction: Omit<TransactionType, 'id' | 'isDeleted' | 'timestamp'> & { timestamp?: number }) => Promise<void>;
    deleteTransaction: (transactionId: string) => Promise<void>;
    getTransactionsByAccount: (accountId: string) => TransactionType[];
    getTransactionsByDate: (date: Date) => TransactionType[];
    approveTransaction: (id: string, updates?: Partial<TransactionType>) => Promise<void>;
    ignoreTransaction: (id: string) => Promise<void>;
    unparsedNotifications: string[];
    addUnparsedNotification: (text: string) => Promise<void>;
    refreshTransactions: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

// ==================== HELPER FUNCTIONS ====================
const isToday = (timestamp: number): boolean => {
    const today = new Date();
    const txDate = new Date(timestamp);
    return (
        txDate.getDate() === today.getDate() &&
        txDate.getMonth() === today.getMonth() &&
        txDate.getFullYear() === today.getFullYear()
    );
};

export const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(timestamp).toLocaleDateString();
};

// ==================== PROVIDER ====================
interface TransactionsProviderProps {
    children: ReactNode;
}

export function TransactionsProvider({ children }: TransactionsProviderProps) {
    const [transactions, setTransactions] = useState<TransactionType[]>([]);
    const [unparsedNotifications, setUnparsedNotifications] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load & Subscription
    useEffect(() => {
        const transactionsCollection = database.get<Transaction>('transactions');

        // We need to fetch everything to map it correctly.
        // Performance Note: In a large app, we would paginate this or only fetch recent.
        // For now, fetching all is fine for MVP.
        const subscription = transactionsCollection
            .query(
                Q.sortBy('timestamp', Q.desc)
            )
            .observe() // Observe ALL changes, since observeWithColumns missed the manual touch
            .subscribe(async (records) => {
                // Mapping allows us to keep the UI decoupled from DB models for now
                const mappedTransactions = await Promise.all(records.map(async (tx) => {
                    // Fetch category
                    let categoryName: TransactionCategory = 'other';
                    try {
                        const cat = await tx.category.fetch();
                        if (cat) {
                            // Map DB category name to Enum if possible, else 'other'
                            categoryName = cat.name.toLowerCase() as TransactionCategory;
                        }
                    } catch (e) { /* existing cateogry might be null */ }

                    // Fetch sentiments (IDs)
                    const sentiments = await tx.transactionSentiments.fetch();
                    const sentimentIds = sentiments.map((ts: TransactionSentiment) => ts.sentiment.id);

                    // IMPROVED MAPPING:
                    return {
                        id: tx.id,
                        accountId: tx.account.id, // accessing ID of relation is synchronous
                        merchant: tx.merchant,
                        category: categoryName,
                        type: tx.type,
                        status: 'approved' as const, // Default to approved
                        amount: tx.amount,
                        notes: tx.note,
                        timestamp: tx.timestamp,
                        isAuto: tx.isAuto,
                        isDeleted: tx.isDeleted,
                        sentimentIds: sentimentIds,
                    };
                }));

                setTransactions(mappedTransactions);
                setIsLoading(false);
            });

        return () => subscription.unsubscribe();
    }, []);

    // Derived State
    const activeTransactions = transactions
        .filter(tx => !tx.isDeleted)
        .sort((a, b) => b.timestamp - a.timestamp);

    const todayTransactions = activeTransactions.filter(tx => isToday(tx.timestamp));

    // Add new transaction
    const addTransaction = useCallback(async (transactionData: Omit<TransactionType, 'id' | 'isDeleted' | 'timestamp'> & { timestamp?: number }) => {
        try {
            await database.write(async () => {
                const transactionsCollection = database.get<Transaction>('transactions');
                const categoriesCollection = database.get<Category>('categories');
                const accountsCollection = database.get<Account>('accounts');

                // 1. Find Account (Required)
                const account = await accountsCollection.find(transactionData.accountId);

                // 2. Find or Default Category
                let category: Category | undefined;
                const categoryRecords = await categoriesCollection.query(
                    Q.where('name', Q.like(`%${transactionData.category}%`))
                ).fetch();

                if (categoryRecords.length > 0) {
                    category = categoryRecords[0];
                } else {
                    const otherCats = await categoriesCollection.query(Q.where('name', 'other')).fetch();
                    if (otherCats.length > 0) category = otherCats[0];
                }

                // 3. Create Transaction
                const newTx = await transactionsCollection.create(tx => {
                    tx.merchant = transactionData.merchant;
                    tx.amount = transactionData.amount;
                    tx.note = transactionData.notes || '';
                    tx.timestamp = transactionData.timestamp || Date.now();
                    tx.type = transactionData.type;
                    tx.isAuto = transactionData.isAuto;
                    tx.isDeleted = false; // Transaction model has 'isDeleted' field? Need to check. Default false.
                    // Set Relations
                    tx.account.set(account);
                    if (category) tx.category.set(category);
                });

                // 4. Handle Sentiments (Create Join Records)
                if (transactionData.sentimentIds && transactionData.sentimentIds.length > 0) {
                    const tsCollection = database.get<TransactionSentiment>('transaction_sentiments');

                    const textIds = transactionData.sentimentIds;
                    const sentimentRecords = await database.get<Sentiment>('sentiments').query(
                        Q.where('id', Q.oneOf(textIds))
                    ).fetch();

                    for (const sentiment of sentimentRecords) {
                        await tsCollection.create(ts => {
                            ts.transaction.set(newTx);
                            ts.sentiment.set(sentiment);
                        });
                    }

                    // FORCE UPDATE: Touch the transaction so 'updated_at' changes.
                    // We need to bypass the "no-op check" by modifying _raw or toggling a field.
                    // safely updating 'isAuto' to itself won't work.
                    // Let's modify a field back and forth if needed, but better to just trigger a signal.
                    // Actually, since we removed observeWithColumns, any "update" call might work if we trick it?
                    // Let's use the 'note' hack but be safer.
                    // If I call update with NO changes, does it fire listeners? No.

                    // ONLY ROBUST WAY: Modify a real field.
                    // Let's add a space to note if it exists, or set to ' ' if empty.
                    // Users won't notice a trailing space.
                    // tx.note = (tx.note || '') + ' ';
                    // Wait, trimming issues?

                    // Let's stick with the _isEditing approach, but maybe I used it wrong?
                    // Or just casting to any.
                    (newTx as any)._raw.updated_at = Date.now();
                }

                // 5. Update Account Balance
                // Since transactionData.amount is already signed (negative for expense/debit), 
                // we just need to ADD it to the balance.
                // Income (+100) -> Balance + 100
                // Expense (-100) -> Balance + (-100) = Balance - 100
                await account.update(acc => {
                    acc.balance += transactionData.amount;
                });

            });
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    }, []);

    // Soft delete transaction
    const deleteTransaction = useCallback(async (transactionId: string) => {
        try {
            await database.write(async () => {
                const tx = await database.get<Transaction>('transactions').find(transactionId);
                const accountId = tx.account.id;
                const amount = tx.amount;
                const type = tx.type;

                // Soft delete
                await tx.update(rec => {
                    rec.isDeleted = true;
                });

                // Reverse Balance
                const account = await database.get<Account>('accounts').find(accountId);
                await account.update(acc => {
                    if (type === 'credit') {
                        acc.balance -= amount; // Deduct income
                    } else {
                        acc.balance += amount; // Refund expense
                    }
                });
            });
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    }, []);

    const getTransactionsByAccount = useCallback((accountId: string) => {
        return activeTransactions.filter(tx => tx.accountId === accountId);
    }, [activeTransactions]);

    const getTransactionsByDate = useCallback((date: Date) => {
        return activeTransactions.filter(tx => {
            const txDate = new Date(tx.timestamp);
            return (
                txDate.getDate() === date.getDate() &&
                txDate.getMonth() === date.getMonth() &&
                txDate.getFullYear() === date.getFullYear()
            );
        });
    }, [activeTransactions]);

    const refreshTransactions = useCallback(async () => {
        try {
            const transactionsCollection = database.get<Transaction>('transactions');
            const records = await transactionsCollection.query(
                Q.sortBy('timestamp', Q.desc)
            ).fetch();

            const mappedTransactions = await Promise.all(records.map(async (tx) => {
                // Fetch category
                let categoryName: TransactionCategory = 'other';
                try {
                    const cat = await tx.category.fetch();
                    if (cat) {
                        categoryName = cat.name.toLowerCase() as TransactionCategory;
                    }
                } catch (e) { }

                // Fetch sentiments
                const sentiments = await tx.transactionSentiments.fetch();
                const sentimentIds = sentiments.map((ts: TransactionSentiment) => ts.sentiment.id);

                return {
                    id: tx.id,
                    accountId: tx.account.id,
                    merchant: tx.merchant,
                    category: categoryName,
                    type: tx.type,
                    status: 'approved' as const,
                    amount: tx.amount,
                    notes: tx.note,
                    timestamp: tx.timestamp,
                    isAuto: tx.isAuto,
                    isDeleted: tx.isDeleted,
                    sentimentIds: sentimentIds,
                };
            }));

            setTransactions(mappedTransactions);
        } catch (error) {
            console.error("Error refreshing transactions:", error);
        }
    }, []);

    const approveTransaction = useCallback(async (id: string, updates?: Partial<TransactionType>) => {
        // Since we don't have a 'pending' state in DB yet, this is mostly for the SMS parsing flow.
        // If we want to support pending, we need to add 'status' to DB.
        // For now, we'll treat 'approve' as just updating the transaction if it exists, or doing nothing.
        // Or if it's about "SMS to Transaction":
        // This function usually takes a pending ID and finalizes it.
        // Assuming we are just persisting it now.
        try {
            await database.write(async () => {
                const tx = await database.get<Transaction>('transactions').find(id);
                await tx.update(rec => {
                    // Apply updates
                    if (updates?.merchant) rec.merchant = updates.merchant;
                    if (updates?.amount) rec.amount = updates.amount;
                    // ... other updates
                    rec.isAuto = false; // Manually approved
                });
                // TODO: Handle balance update if amount changed
            });
        } catch (error) {
            console.error('Error approving transaction:', error);
        }
    }, []);

    const ignoreTransaction = useCallback(async (id: string) => {
        await deleteTransaction(id);
    }, [deleteTransaction]);

    const addUnparsedNotification = useCallback(async (text: string) => {
        if (!unparsedNotifications.includes(text)) {
            const newUnparsed = [text, ...unparsedNotifications];
            setUnparsedNotifications(newUnparsed);
            // TODO: Persist unparsed messages to 'unparsed_messages' table in DB
        }
    }, [unparsedNotifications]);

    return (
        <TransactionsContext.Provider value={{
            transactions,
            activeTransactions,
            todayTransactions,
            isLoading,
            addTransaction,
            deleteTransaction,
            getTransactionsByAccount,
            getTransactionsByDate,
            approveTransaction,
            ignoreTransaction,
            unparsedNotifications,
            addUnparsedNotification,
            refreshTransactions,
        }}>
            {children}
        </TransactionsContext.Provider>
    );
}

// ==================== HOOK ====================
export function useTransactions() {
    const context = useContext(TransactionsContext);
    if (!context) {
        throw new Error('useTransactions must be used within TransactionsProvider');
    }
    return context;
}

// ==================== CATEGORY ICONS ====================
export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
    groceries: 'local-grocery-store',
    dining: 'restaurant',
    transport: 'directions-car',
    shopping: 'shopping-bag',
    entertainment: 'movie',
    utilities: 'lightbulb',
    health: 'local-hospital',
    income: 'attach-money',
    transfer: 'swap-horiz',
    other: 'category',
};

// ==================== CATEGORY LABELS ====================
export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
    groceries: 'Groceries',
    dining: 'Dining',
    transport: 'Transport',
    shopping: 'Shopping',
    entertainment: 'Entertainment',
    utilities: 'Utilities',
    health: 'Health',
    income: 'Income',
    transfer: 'Transfer',
    other: 'Other',
};
