/**
 * Sikka - Currency Context
 * Manages app-wide currency settings
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency } from '../types';

const CURRENCY_KEY = '@sikka_currency';
const ONBOARDING_KEY = '@sikka_onboarding';

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
    formatAmount: (amount: number) => string;
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

    // Load currency from storage on mount
    useEffect(() => {
        const loadCurrency = async () => {
            try {
                // First check if there's a saved currency preference
                let savedCurrencyCode = await AsyncStorage.getItem(CURRENCY_KEY);

                // If not, check onboarding data for initial currency
                if (!savedCurrencyCode) {
                    const onboardingData = await AsyncStorage.getItem(ONBOARDING_KEY);
                    if (onboardingData) {
                        const parsed = JSON.parse(onboardingData);
                        if (parsed.currency) {
                            savedCurrencyCode = parsed.currency;
                        }
                    }
                }

                if (savedCurrencyCode) {
                    const foundCurrency = CURRENCIES.find(c => c.code === savedCurrencyCode);
                    if (foundCurrency) {
                        setCurrencyState(foundCurrency);
                    }
                }
            } catch (error) {
                console.error('Error loading currency:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCurrency();
    }, []);

    const setCurrency = useCallback(async (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        try {
            await AsyncStorage.setItem(CURRENCY_KEY, newCurrency.code);
        } catch (error) {
            console.error('Error saving currency:', error);
        }
    }, []);

    const formatAmount = useCallback((amount: number): string => {
        const formatted = Math.abs(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const sign = amount < 0 ? '-' : '';
        return `${sign}${currency.symbol}${formatted}`;
    }, [currency]);

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, isLoading }}>
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
