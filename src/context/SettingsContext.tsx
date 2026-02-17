/**
 * Sikka - Settings Context
 * Provides app-wide settings including currency configuration
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import database from '../database';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';

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
    setCurrency: (currency: CurrencyOption) => Promise<void>;
    formatCurrency: (amount: number) => string;
    isLoading: boolean;
}

const defaultCurrency = CURRENCIES[0]; // USD as default
const CURRENCY_KEY = 'currency';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const [currency, setCurrencyState] = useState<CurrencyOption>(defaultCurrency);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settingsCollection = database.get<Setting>('settings');
                const currencyRecord = await settingsCollection.query(
                    Q.where('key', CURRENCY_KEY)
                ).fetch();

                if (currencyRecord.length > 0) {
                    const storedCurrency = JSON.parse(currencyRecord[0].value);
                    setCurrencyState(storedCurrency);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const setCurrency = useCallback(async (newCurrency: CurrencyOption) => {
        setCurrencyState(newCurrency);
        try {
            await database.write(async () => {
                const settingsCollection = database.get<Setting>('settings');
                const currencyRecords = await settingsCollection.query(
                    Q.where('key', CURRENCY_KEY)
                ).fetch();

                if (currencyRecords.length > 0) {
                    await currencyRecords[0].update(record => {
                        record.value = JSON.stringify(newCurrency);
                    });
                } else {
                    await settingsCollection.create(record => {
                        record.key = CURRENCY_KEY;
                        record.value = JSON.stringify(newCurrency);
                    });
                }
            });
        } catch (error) {
            console.error('Error saving currency:', error);
        }
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
        <SettingsContext.Provider value={{ currency, setCurrency, formatCurrency, isLoading }}>
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
