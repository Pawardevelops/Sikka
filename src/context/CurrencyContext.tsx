/**
 * Sikka - Currency Context
 * Manages app-wide currency settings using WatermelonDB
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Currency } from '../types';
import { useOnboarding } from './OnboardingContext';
import database from '../database';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';

const CURRENCY_KEY = 'currency';

// ==================== CURRENCIES ====================
export const CURRENCIES: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const DEFAULT_CURRENCY = CURRENCIES.find(c => c.code === 'INR') || CURRENCIES[0];

// ==================== CONTEXT ====================
interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatAmount: (amount: number, forceShow?: boolean) => string;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// ==================== PROVIDER ====================
interface CurrencyProviderProps {
    children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
    const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
    const [isLoading, setIsLoading] = useState(true);
    const { data: onboardingData } = useOnboarding();

    // Derived from Onboarding Context
    const hideBalances = onboardingData?.hideBalances ?? false;

    // Initial load
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settingsCollection = database.get<Setting>('settings');
                const records = await settingsCollection.query(Q.where('key', CURRENCY_KEY)).fetch();

                if (records.length > 0) {
                    const savedCode = JSON.parse(records[0].value);
                    const found = CURRENCIES.find(c => c.code === savedCode);
                    if (found) setCurrencyState(found);
                } else {
                    // Fallback to onboarding currency if exists (migration scenario or first init)
                    // But simpler to just default to INR if nothing in Settings
                    if (onboardingData?.currency) {
                        const found = CURRENCIES.find(c => c.code === onboardingData.currency);
                        if (found) setCurrencyState(found);
                    }
                }
            } catch (error) {
                console.error('Error loading currency settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, [onboardingData?.currency]); // Reload if onboarding currency changes (initial sync)

    const handleSetCurrency = useCallback(async (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        try {
            await database.write(async () => {
                const settingsCollection = database.get<Setting>('settings');
                const records = await settingsCollection.query(Q.where('key', CURRENCY_KEY)).fetch();
                if (records.length > 0) {
                    await records[0].update(s => {
                        s.value = JSON.stringify(newCurrency.code);
                    });
                } else {
                    await settingsCollection.create(s => {
                        s.key = CURRENCY_KEY;
                        s.value = JSON.stringify(newCurrency.code);
                    });
                }
            });
        } catch (error) {
            console.error('Error saving currency:', error);
        }
    }, []);

    const formatAmount = useCallback((amount: number, forceShow: boolean = false): string => {
        // If hidden and not forced to show
        if (hideBalances && !forceShow) {
            return `***`;
        }

        const formatted = Math.abs(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const sign = amount < 0 ? '-' : '';
        return `${sign}${currency.symbol}${formatted}`;
    }, [currency, hideBalances]);

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrency: handleSetCurrency,
            formatAmount,
            isLoading,
        }}>
            {children}
        </CurrencyContext.Provider>
    );
}

// ==================== HOOK ====================
export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within CurrencyProvider');
    }
    return context;
}

export { CurrencyContext };
