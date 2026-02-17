/**
 * Sikka - Accounts Context with WatermelonDB
 * Manages app-wide account state using WatermelonDB
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Account as AccountType, AccountType as AccountTypeEnum } from '../types';
import database from '../database';
import Account from '../database/models/Account';
import { Q } from '@nozbe/watermelondb';

// ==================== CONTEXT TYPE ====================
interface AccountsContextType {
    accounts: AccountType[]; // We expose the plain JS object or the Model? Let's expose Model or map it?
    // For compatibility with components, let's map it to AccountType for now, 
    // but ideally we should expose Models + Observables in the future.
    // To keep migration simple, we'll map to JS objects in state for now.
    activeAccounts: AccountType[];
    totalBalance: number;
    isLoading: boolean;
    addAccount: (account: Omit<AccountType, 'id' | 'isDeleted' | 'lastUpdated'>) => Promise<void>;
    deleteAccount: (accountId: string) => Promise<void>;
    restoreAccount: (accountId: string) => Promise<void>;
    updateAccount: (accountId: string, updates: Partial<AccountType>) => Promise<void>;
    getAccount: (accountId: string) => AccountType | undefined;
    refreshAccounts: () => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

// ==================== PROVIDER ====================
interface AccountsProviderProps {
    children: ReactNode;
}

// Helper: Convert WatermelonDB Model to Plain JS Object (AccountType)
const mapModelToType = (acc: Account): AccountType => ({
    id: acc.id,
    name: acc.name,
    type: acc.type as AccountTypeEnum,
    balance: acc.balance,
    icon: acc.icon,
    color: acc.color,
    isDeleted: acc.isDeleted,
    lastUpdated: new Date(acc.updatedAt).toLocaleDateString(), // Approximate
});

export function AccountsProvider({ children }: AccountsProviderProps) {
    const [accounts, setAccounts] = useState<AccountType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load & Subscription
    useEffect(() => {
        const accountsCollection = database.get<Account>('accounts');

        // Observe ALL accounts
        const subscription = accountsCollection
            .query()
            .observeWithColumns(['balance', 'updated_at', 'is_deleted'])
            .subscribe(records => {
                const mapped = records.map(mapModelToType);
                setAccounts(mapped);
                setIsLoading(false);
            });

        return () => subscription.unsubscribe();
    }, []);

    // Manual Refresh (for useFocusEffect)
    const refreshAccounts = useCallback(async () => {
        try {
            const accountsCollection = database.get<Account>('accounts');
            const records = await accountsCollection.query().fetch();
            const mapped = records.map(mapModelToType);
            setAccounts(mapped);
        } catch (error) {
            console.error("Error refreshing accounts:", error);
        }
    }, []);

    // Derived State
    const activeAccounts = accounts.filter(acc => !acc.isDeleted);
    const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Add new account
    const addAccount = useCallback(async (accountData: Omit<AccountType, 'id' | 'isDeleted' | 'lastUpdated'>) => {
        try {
            await database.write(async () => {
                const accountsCollection = database.get<Account>('accounts');
                await accountsCollection.create(account => {
                    account.name = accountData.name;
                    account.type = accountData.type;
                    account.balance = accountData.balance;
                    account.icon = accountData.icon;
                    account.color = accountData.color;
                    account.isDeleted = false;
                });
            });
        } catch (error) {
            console.error('Error adding account:', error);
        }
    }, []);

    // Soft delete account
    const deleteAccount = useCallback(async (accountId: string) => {
        try {
            await database.write(async () => {
                const account = await database.get<Account>('accounts').find(accountId);
                await account.update(rec => {
                    rec.isDeleted = true;
                });
            });
        } catch (error) {
            console.error('Error deleting account:', error);
        }
    }, []);

    // Restore deleted account
    const restoreAccount = useCallback(async (accountId: string) => {
        try {
            await database.write(async () => {
                const account = await database.get<Account>('accounts').find(accountId);
                await account.update(rec => {
                    rec.isDeleted = false;
                });
            });
        } catch (error) {
            console.error('Error restoring account:', error);
        }
    }, []);

    // Update account
    const updateAccount = useCallback(async (accountId: string, updates: Partial<AccountType>) => {
        try {
            await database.write(async () => {
                const account = await database.get<Account>('accounts').find(accountId);
                await account.update(rec => {
                    if (updates.name !== undefined) rec.name = updates.name;
                    if (updates.type !== undefined) rec.type = updates.type as string;
                    if (updates.balance !== undefined) rec.balance = updates.balance;
                    if (updates.icon !== undefined) rec.icon = updates.icon;
                    if (updates.color !== undefined) rec.color = updates.color;
                    if (updates.isDeleted !== undefined) rec.isDeleted = updates.isDeleted;
                });
            });
        } catch (error) {
            console.error('Error updating account:', error);
        }
    }, []);

    // Get single account (Sync helper from local state for performance/simplicity in render)
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
            refreshAccounts,
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
export const ACCOUNT_TYPES: { value: AccountTypeEnum; label: string }[] = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'cash', label: 'Cash' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'savings', label: 'Savings' },
    { value: 'investment', label: 'Investment' },
    { value: 'bitcoin', label: 'Crypto' },
];
