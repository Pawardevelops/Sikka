/**
 * Sikka - Transactions Context with AsyncStorage
 * Manages app-wide transaction state with local persistence
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, TransactionCategory } from '../types';

const STORAGE_KEY = '@sikka_transactions';

// ==================== CONTEXT TYPE ====================
interface TransactionsContextType {
    transactions: Transaction[];
    activeTransactions: Transaction[];
    todayTransactions: Transaction[];
    isLoading: boolean;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'isDeleted' | 'timestamp'> & { timestamp?: number }) => Promise<void>;
    deleteTransaction: (transactionId: string) => Promise<void>;
    getTransactionsByAccount: (accountId: string) => Transaction[];
    getTransactionsByDate: (date: Date) => Transaction[];
    approveTransaction: (id: string, updates?: Partial<Transaction>) => Promise<void>;
    ignoreTransaction: (id: string) => Promise<void>;
    unparsedNotifications: string[];
    addUnparsedNotification: (text: string) => Promise<void>;
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
    /** Callback to adjust an account's balance by a delta amount */
    onUpdateAccountBalance?: (accountId: string, delta: number) => void;
}

export function TransactionsProvider({ children, onUpdateAccountBalance }: TransactionsProviderProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [unparsedNotifications, setUnparsedNotifications] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Get only active (non-deleted) transactions, sorted by timestamp
    const activeTransactions = transactions
        .filter(tx => !tx.isDeleted)
        .sort((a, b) => b.timestamp - a.timestamp);

    // Get today's transactions only
    const todayTransactions = activeTransactions.filter(tx => isToday(tx.timestamp));

    // Load transactions and unparsed items from AsyncStorage
    useEffect(() => {
        const loadData = async () => {
            try {
                const [storedTx, storedUnparsed] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY),
                    AsyncStorage.getItem(STORAGE_KEY + '_unparsed')
                ]);

                if (storedTx) setTransactions(JSON.parse(storedTx));
                if (storedUnparsed) setUnparsedNotifications(JSON.parse(storedUnparsed));

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Save transactions to AsyncStorage
    const saveTransactions = async (newTransactions: Transaction[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTransactions));
        } catch (error) {
            console.error('Error saving transactions:', error);
        }
    };

    // Save unparsed to AsyncStorage
    const saveUnparsed = async (newUnparsed: string[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY + '_unparsed', JSON.stringify(newUnparsed));
        } catch (error) {
            console.error('Error saving unparsed:', error);
        }
    };

    // Add new transaction
    const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'isDeleted' | 'timestamp'> & { timestamp?: number }) => {
        const newTransaction: Transaction = {
            ...transactionData,
            id: Date.now().toString(),
            timestamp: transactionData.timestamp || Date.now(),
            isDeleted: false,
        };
        const newTransactions = [...transactions, newTransaction];
        setTransactions(newTransactions);
        await saveTransactions(newTransactions);

        // Update account balance for non-pending transactions
        if (newTransaction.status !== 'pending' && onUpdateAccountBalance) {
            onUpdateAccountBalance(newTransaction.accountId, newTransaction.amount);
        }
    }, [transactions, onUpdateAccountBalance]);

    // Soft delete transaction — reverses the balance if the transaction was active
    const deleteTransaction = useCallback(async (transactionId: string) => {
        const target = transactions.find(tx => tx.id === transactionId);
        const newTransactions = transactions.map(tx =>
            tx.id === transactionId ? { ...tx, isDeleted: true } : tx
        );
        setTransactions(newTransactions);
        await saveTransactions(newTransactions);

        // Reverse balance only if the transaction was active and not pending
        if (target && !target.isDeleted && target.status !== 'pending' && onUpdateAccountBalance) {
            onUpdateAccountBalance(target.accountId, -target.amount);
        }
    }, [transactions, onUpdateAccountBalance]);

    // Get transactions by account
    const getTransactionsByAccount = useCallback((accountId: string) => {
        return activeTransactions.filter(tx => tx.accountId === accountId);
    }, [activeTransactions]);

    // Get transactions by date
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

    // Approve a pending transaction — now affects account balance
    const approveTransaction = useCallback(async (id: string, updates?: Partial<Transaction>) => {
        const target = transactions.find(tx => tx.id === id);
        const newTransactions = transactions.map(tx =>
            tx.id === id ? { ...tx, ...updates, status: 'approved' as const, isAuto: false } : tx
        );
        setTransactions(newTransactions);
        await saveTransactions(newTransactions);

        // Apply balance now that the transaction is approved
        if (target && onUpdateAccountBalance) {
            const finalAmount = updates?.amount ?? target.amount;
            onUpdateAccountBalance(target.accountId, finalAmount);
        }
    }, [transactions, onUpdateAccountBalance]);

    // Ignore (delete) a pending transaction
    const ignoreTransaction = useCallback(async (id: string) => {
        await deleteTransaction(id);
    }, [deleteTransaction]);

    // Add unparsed notification
    const addUnparsedNotification = useCallback(async (text: string) => {
        // Prevent duplicates
        if (!unparsedNotifications.includes(text)) {
            const newUnparsed = [text, ...unparsedNotifications];
            setUnparsedNotifications(newUnparsed);
            await saveUnparsed(newUnparsed);
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
