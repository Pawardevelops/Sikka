/**
 * Sikka - Accounts Context with WatermelonDB
 *
 * SOLID-compliant account management:
 * - Strategy pattern for Net Worth (Open/Closed)
 * - Hydrates satellite tables (CreditCardDetail, InvestmentHolding)
 * - Pure helpers for credit utilization + P&L
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Account as AccountType, AccountType as AccountTypeEnum } from '../types';
import { CreditCardDetails, InvestmentHoldingData, computeNetWorth, computeCreditUtilization, computePortfolioPnL, CreditUtilization, PortfolioPnL } from '../types/accountTypes';
import database from '../database';
import Account from '../database/models/Account';
import CreditCardDetail from '../database/models/CreditCardDetail';
import InvestmentHolding from '../database/models/InvestmentHolding';
import { Q } from '@nozbe/watermelondb';

// ==================== CONTEXT TYPE ====================
interface AccountsContextType {
    accounts: AccountType[];
    activeAccounts: AccountType[];
    totalBalance: number;    // Legacy: simple sum
    netWorth: number;        // Strategy-based: proper financial calc
    isLoading: boolean;
    addAccount: (
        account: Omit<AccountType, 'id' | 'isDeleted' | 'lastUpdated'>,
        ccDetails?: CreditCardDetails,
        holdings?: Omit<InvestmentHoldingData, 'id'>[],
    ) => Promise<void>;
    deleteAccount: (accountId: string) => Promise<void>;
    restoreAccount: (accountId: string) => Promise<void>;
    updateAccount: (accountId: string, updates: Partial<AccountType>) => Promise<void>;
    getAccount: (accountId: string) => AccountType | undefined;
    refreshAccounts: () => Promise<void>;
    // Type-specific helpers
    getCreditUtilization: (accountId: string) => CreditUtilization | null;
    getPortfolioPnL: (accountId: string) => PortfolioPnL | null;
    // Investment holdings CRUD
    addHolding: (accountId: string, holding: Omit<InvestmentHoldingData, 'id'>) => Promise<void>;
    updateHolding: (holdingId: string, updates: Partial<InvestmentHoldingData>) => Promise<void>;
    deleteHolding: (holdingId: string) => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

// ==================== PROVIDER ====================
interface AccountsProviderProps {
    children: ReactNode;
}

/**
 * Hydrate a WatermelonDB Account model into our plain JS AccountType,
 * including satellite data (CC details, holdings).
 */
async function hydrateAccount(acc: Account): Promise<AccountType> {
    const base: AccountType = {
        id: acc.id,
        name: acc.name,
        type: acc.type as AccountTypeEnum,
        balance: acc.balance,
        icon: acc.icon,
        color: acc.color,
        isDeleted: acc.isDeleted,
        lastUpdated: new Date(acc.updatedAt).toLocaleDateString(),
    };

    // Hydrate Credit Card details (1:1)
    if (acc.type === 'credit') {
        try {
            const ccRecords = await database
                .get<CreditCardDetail>('credit_card_details')
                .query(Q.where('account_id', acc.id))
                .fetch();
            if (ccRecords.length > 0) {
                const cc = ccRecords[0];
                base.creditCardDetails = {
                    creditLimit: cc.creditLimit,
                    billingCycleDate: cc.billingCycleDate,
                    dueDate: cc.dueDate,
                };
            }
        } catch (e) {
            console.warn('Failed to hydrate CC details for', acc.id, e);
        }
    }

    // Hydrate Investment Holdings (1:N)
    if (acc.type === 'investment' || acc.type === 'bitcoin') {
        try {
            const holdingRecords = await database
                .get<InvestmentHolding>('investment_holdings')
                .query(Q.where('account_id', acc.id))
                .fetch();

            const holdings: InvestmentHoldingData[] = holdingRecords.map(h => ({
                id: h.id,
                ticker: h.ticker,
                quantity: h.quantity,
                avgBuyPrice: h.avgBuyPrice,
                currentPrice: h.currentPrice,
            }));

            base.holdings = holdings;
            base.investmentValue = holdings.reduce(
                (sum, h) => sum + h.quantity * h.currentPrice, 0
            );
        } catch (e) {
            console.warn('Failed to hydrate holdings for', acc.id, e);
        }
    }

    return base;
}

export function AccountsProvider({ children }: AccountsProviderProps) {
    const [accounts, setAccounts] = useState<AccountType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Hydrate all accounts from DB
    const loadAccounts = useCallback(async () => {
        try {
            const accountsCollection = database.get<Account>('accounts');
            const records = await accountsCollection.query().fetch();
            const hydrated = await Promise.all(records.map(hydrateAccount));
            setAccounts(hydrated);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading accounts:', error);
            setIsLoading(false);
        }
    }, []);

    // Initial load + observe for changes
    useEffect(() => {
        loadAccounts();

        // Subscribe to changes in accounts table
        const accountsCollection = database.get<Account>('accounts');
        const subscription = accountsCollection
            .query()
            .observeWithColumns(['balance', 'updated_at', 'is_deleted'])
            .subscribe(() => {
                loadAccounts();
            });

        // Also observe satellite tables for live updates
        const ccSub = database.get<CreditCardDetail>('credit_card_details')
            .query()
            .observe()
            .subscribe(() => loadAccounts());

        const holdingSub = database.get<InvestmentHolding>('investment_holdings')
            .query()
            .observe()
            .subscribe(() => loadAccounts());

        return () => {
            subscription.unsubscribe();
            ccSub.unsubscribe();
            holdingSub.unsubscribe();
        };
    }, [loadAccounts]);

    // Derived State
    const activeAccounts = accounts.filter(acc => !acc.isDeleted);
    const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const netWorth = computeNetWorth(activeAccounts);

    // ── ADD ACCOUNT (with satellite data in same batch) ──
    const addAccount = useCallback(async (
        accountData: Omit<AccountType, 'id' | 'isDeleted' | 'lastUpdated'>,
        ccDetails?: CreditCardDetails,
        holdings?: Omit<InvestmentHoldingData, 'id'>[],
    ) => {
        try {
            await database.write(async () => {
                const accountsCollection = database.get<Account>('accounts');
                const newAccount = await accountsCollection.create(account => {
                    account.name = accountData.name;
                    account.type = accountData.type;
                    account.balance = accountData.balance;
                    account.icon = accountData.icon;
                    account.color = accountData.color;
                    account.isDeleted = false;
                });

                // Create CC detail record if credit card
                if (accountData.type === 'credit' && ccDetails) {
                    const ccCollection = database.get<CreditCardDetail>('credit_card_details');
                    await ccCollection.create(cc => {
                        cc.accountId = newAccount.id;
                        cc.creditLimit = ccDetails.creditLimit;
                        cc.billingCycleDate = ccDetails.billingCycleDate;
                        cc.dueDate = ccDetails.dueDate;
                    });
                }

                // Create holding records if investment/crypto
                if ((accountData.type === 'investment' || accountData.type === 'bitcoin') && holdings) {
                    const holdingsCollection = database.get<InvestmentHolding>('investment_holdings');
                    for (const h of holdings) {
                        await holdingsCollection.create(holding => {
                            holding.accountId = newAccount.id;
                            holding.ticker = h.ticker;
                            holding.quantity = h.quantity;
                            holding.avgBuyPrice = h.avgBuyPrice;
                            holding.currentPrice = h.currentPrice;
                        });
                    }
                }
            });
        } catch (error) {
            console.error('Error adding account:', error);
        }
    }, []);

    // ── SOFT DELETE ──
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

    // ── RESTORE ──
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

    // ── UPDATE ACCOUNT ──
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

                // Update CC details if provided
                if (updates.creditCardDetails) {
                    const ccRecords = await database
                        .get<CreditCardDetail>('credit_card_details')
                        .query(Q.where('account_id', accountId))
                        .fetch();

                    if (ccRecords.length > 0) {
                        await ccRecords[0].update(cc => {
                            if (updates.creditCardDetails!.creditLimit !== undefined)
                                cc.creditLimit = updates.creditCardDetails!.creditLimit;
                            if (updates.creditCardDetails!.billingCycleDate !== undefined)
                                cc.billingCycleDate = updates.creditCardDetails!.billingCycleDate;
                            if (updates.creditCardDetails!.dueDate !== undefined)
                                cc.dueDate = updates.creditCardDetails!.dueDate;
                        });
                    }
                }
            });
        } catch (error) {
            console.error('Error updating account:', error);
        }
    }, []);

    // ── GET SINGLE ACCOUNT ──
    const getAccount = useCallback((accountId: string) => {
        return accounts.find(acc => acc.id === accountId);
    }, [accounts]);

    // ── REFRESH ──
    const refreshAccounts = useCallback(async () => {
        await loadAccounts();
    }, [loadAccounts]);

    // ── CREDIT UTILIZATION HELPER ──
    const getCreditUtilization = useCallback((accountId: string): CreditUtilization | null => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc || acc.type !== 'credit' || !acc.creditCardDetails) return null;
        return computeCreditUtilization(acc.balance, acc.creditCardDetails.creditLimit);
    }, [accounts]);

    // ── PORTFOLIO P&L HELPER ──
    const getPortfolioPnL = useCallback((accountId: string): PortfolioPnL | null => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc || !acc.holdings || acc.holdings.length === 0) return null;
        return computePortfolioPnL(acc.holdings);
    }, [accounts]);

    // ── INVESTMENT HOLDINGS CRUD ──
    const addHolding = useCallback(async (accountId: string, holding: Omit<InvestmentHoldingData, 'id'>) => {
        try {
            await database.write(async () => {
                const holdingsCollection = database.get<InvestmentHolding>('investment_holdings');
                await holdingsCollection.create(h => {
                    h.accountId = accountId;
                    h.ticker = holding.ticker;
                    h.quantity = holding.quantity;
                    h.avgBuyPrice = holding.avgBuyPrice;
                    h.currentPrice = holding.currentPrice;
                });
            });
        } catch (error) {
            console.error('Error adding holding:', error);
        }
    }, []);

    const updateHolding = useCallback(async (holdingId: string, updates: Partial<InvestmentHoldingData>) => {
        try {
            await database.write(async () => {
                const holding = await database.get<InvestmentHolding>('investment_holdings').find(holdingId);
                await holding.update(h => {
                    if (updates.ticker !== undefined) h.ticker = updates.ticker;
                    if (updates.quantity !== undefined) h.quantity = updates.quantity;
                    if (updates.avgBuyPrice !== undefined) h.avgBuyPrice = updates.avgBuyPrice;
                    if (updates.currentPrice !== undefined) h.currentPrice = updates.currentPrice;
                });
            });
        } catch (error) {
            console.error('Error updating holding:', error);
        }
    }, []);

    const deleteHolding = useCallback(async (holdingId: string) => {
        try {
            await database.write(async () => {
                const holding = await database.get<InvestmentHolding>('investment_holdings').find(holdingId);
                await holding.destroyPermanently();
            });
        } catch (error) {
            console.error('Error deleting holding:', error);
        }
    }, []);

    return (
        <AccountsContext.Provider value={{
            accounts,
            activeAccounts,
            totalBalance,
            netWorth,
            isLoading,
            addAccount,
            deleteAccount,
            restoreAccount,
            updateAccount,
            getAccount,
            refreshAccounts,
            getCreditUtilization,
            getPortfolioPnL,
            addHolding,
            updateHolding,
            deleteHolding,
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
    'account-balance', 'payments', 'credit-card', 'local-atm', 'currency-bitcoin', 'savings', 'monetization-on', 'diamond', 'trending-up', 'home', 'directions-car', 'flight', 'school', 'work', 'shopping-cart', 'account-balance-wallet',
];

// ==================== ACCOUNT TYPES (Legacy — use ACCOUNT_TYPE_META for new code) ====================
export const ACCOUNT_TYPES: { value: AccountTypeEnum; label: string }[] = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'cash', label: 'Cash' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'savings', label: 'Savings' },
    { value: 'investment', label: 'Investment' },
    { value: 'bitcoin', label: 'Crypto' },
];
