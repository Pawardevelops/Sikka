/**
 * Sikka - Accounts Context with AsyncStorage
 * Manages app-wide account state with local persistence
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, AccountType } from '../types';

const STORAGE_KEY = '@sikka_accounts';

// Migration map for backward compatibility
const ICON_MIGRATION: Record<string, string> = {
    '💵': 'payments',
    '🏦': 'account-balance',
    '💳': 'credit-card',
    '💸': 'money-off',
    '📈': 'trending-up',
    '₿': 'currency-bitcoin',
    '📱': 'account-balance-wallet',
    '💰': 'savings',
};

// ==================== CONTEXT TYPE ====================
interface AccountsContextType {
    accounts: Account[];
    activeAccounts: Account[];
    totalBalance: number;
    isLoading: boolean;
    addAccount: (account: Omit<Account, 'id' | 'isDeleted' | 'lastUpdated'>) => Promise<void>;
    deleteAccount: (accountId: string) => Promise<void>;
    restoreAccount: (accountId: string) => Promise<void>;
    updateAccount: (accountId: string, updates: Partial<Account>) => Promise<void>;
    getAccount: (accountId: string) => Account | undefined;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

// ==================== PROVIDER ====================
interface AccountsProviderProps {
    children: ReactNode;
}

export function AccountsProvider({ children }: AccountsProviderProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Get only active (non-deleted) accounts
    const activeAccounts = accounts.filter(acc => !acc.isDeleted);

    // Calculate total balance from active accounts only
    const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Load accounts from AsyncStorage with migration
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    let parsedAccounts: Account[] = JSON.parse(stored);

                    // Migrate legacy icons
                    const migratedAccounts = parsedAccounts.map(acc => {
                        if (ICON_MIGRATION[acc.icon]) {
                            return { ...acc, icon: ICON_MIGRATION[acc.icon] };
                        }
                        return acc;
                    });

                    // If changes were made, save back to storage
                    if (JSON.stringify(migratedAccounts) !== stored) {
                        await saveAccounts(migratedAccounts);
                    }

                    setAccounts(migratedAccounts);
                }
            } catch (error) {
                console.error('Error loading accounts:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAccounts();
    }, []);

    // Save accounts to AsyncStorage
    const saveAccounts = async (newAccounts: Account[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
        } catch (error) {
            console.error('Error saving accounts:', error);
        }
    };

    // Add new account
    const addAccount = useCallback(async (accountData: Omit<Account, 'id' | 'isDeleted' | 'lastUpdated'>) => {
        const newAccount: Account = {
            ...accountData,
            id: Date.now().toString(),
            isDeleted: false,
            lastUpdated: 'Just now',
        };
        const newAccounts = [...accounts, newAccount];
        setAccounts(newAccounts);
        await saveAccounts(newAccounts);
    }, [accounts]);

    // Soft delete account
    const deleteAccount = useCallback(async (accountId: string) => {
        const newAccounts = accounts.map(acc =>
            acc.id === accountId ? { ...acc, isDeleted: true } : acc
        );
        setAccounts(newAccounts);
        await saveAccounts(newAccounts);
    }, [accounts]);

    // Restore deleted account
    const restoreAccount = useCallback(async (accountId: string) => {
        const newAccounts = accounts.map(acc =>
            acc.id === accountId ? { ...acc, isDeleted: false } : acc
        );
        setAccounts(newAccounts);
        await saveAccounts(newAccounts);
    }, [accounts]);

    // Update account
    const updateAccount = useCallback(async (accountId: string, updates: Partial<Account>) => {
        const newAccounts = accounts.map(acc =>
            acc.id === accountId ? { ...acc, ...updates, lastUpdated: 'Just now' } : acc
        );
        setAccounts(newAccounts);
        await saveAccounts(newAccounts);
    }, [accounts]);

    // Get single account
    const getAccount = useCallback((accountId: string) => {
        return accounts.find(acc => acc.id === accountId);
    }, [accounts]);

    return (
        <AccountsContext.Provider value={{
            accounts,
            activeAccounts,
            totalBalance,
            isLoading,
            addAccount,
            deleteAccount,
            restoreAccount,
            updateAccount,
            getAccount,
        }}>
            {children}
        </AccountsContext.Provider>
    );
}

// ==================== HOOK ====================
export function useAccounts() {
    const context = useContext(AccountsContext);
    if (!context) {
        throw new Error('useAccounts must be used within AccountsProvider');
    }
    return context;
}

// ==================== AVAILABLE ICONS ====================
export const ACCOUNT_ICONS = [
    'account-balance', 'payments', 'credit-card', 'local-atm', 'currency-bitcoin', 'savings', 'monetization-on', 'diamond', 'trending-up', 'home', 'directions-car', 'flight', 'school', 'work', 'shopping-cart',
];

// ==================== ACCOUNT TYPES ====================
export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'cash', label: 'Cash' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'savings', label: 'Savings' },
    { value: 'investment', label: 'Investment' },
    { value: 'bitcoin', label: 'Crypto' },
];
