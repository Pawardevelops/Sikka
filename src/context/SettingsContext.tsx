/**
 * Sikka - Settings Context
 * Provides app-wide settings including currency configuration
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Available currencies
export interface CurrencyOption {
    symbol: string;
    code: string;
    name: string;
}

export const CURRENCIES: CurrencyOption[] = [
    { symbol: '$', code: 'USD', name: 'US Dollar' },
    { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
    { symbol: '€', code: 'EUR', name: 'Euro' },
    { symbol: '£', code: 'GBP', name: 'British Pound' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
];

interface SettingsContextType {
    currency: CurrencyOption;
    setCurrency: (currency: CurrencyOption) => void;
    formatCurrency: (amount: number) => string;
}

const defaultCurrency = CURRENCIES[0]; // USD as default

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const [currency, setCurrencyState] = useState<CurrencyOption>(defaultCurrency);

    const setCurrency = useCallback((newCurrency: CurrencyOption) => {
        setCurrencyState(newCurrency);
        // TODO: Persist to AsyncStorage
    }, []);

    const formatCurrency = useCallback((amount: number): string => {
        const formatted = Math.abs(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const sign = amount < 0 ? '-' : '';
        return `${sign}${currency.symbol}${formatted}`;
    }, [currency]);

    return (
        <SettingsContext.Provider value={{ currency, setCurrency, formatCurrency }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

export default SettingsContext;
