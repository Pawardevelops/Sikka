/**
 * Sikka - Currency Context
 * Manages app-wide currency settings
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency } from '../types';
import { useOnboarding } from './OnboardingContext';

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
    const [hideBalances, setHideBalances] = useState(false);

    // Initial load
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Currency
                let savedCurrencyCode = await AsyncStorage.getItem(CURRENCY_KEY);
                if (!savedCurrencyCode) {
                    const obData = await AsyncStorage.getItem(ONBOARDING_KEY);
                    if (obData) {
                        const parsed = JSON.parse(obData);
                        savedCurrencyCode = parsed.currency;
                    }
                }
                if (savedCurrencyCode) {
                    const found = CURRENCIES.find(c => c.code === savedCurrencyCode);
                    if (found) setCurrencyState(found);
                }

                // Hide Balances (Sync with Onboarding Data)
                // We read directly from storage here to ensure we have the value even if OnboardingContext updates slightly later
                const obDataStr = await AsyncStorage.getItem(ONBOARDING_KEY);
                if (obDataStr) {
                    const parsed = JSON.parse(obDataStr);
                    if (parsed.hideBalances !== undefined) {
                        setHideBalances(parsed.hideBalances);
                    }
                }
            } catch (error) {
                console.error('Error loading currency settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // Listen for external updates to onboarding data (hacky but effective for simple apps without global store)
    // Ideally we would consume OnboardingContext here, but that might create a circular dependency
    // if OnboardingContext uses CurrencyContext.
    // Let's assume OnboardingContext -> CurrencyContext is safe?
    // Checking imports: OnboardingContext imports types. CurrencyContext imports types.
    // App.tsx: CurrencyProvider is INSIDE OnboardingProvider. So we CAN use useOnboarding!

    const handleSetCurrency = useCallback(async (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        try {
            await AsyncStorage.setItem(CURRENCY_KEY, newCurrency.code);
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
            // Expose a setter for hideBalances so SettingsScreen can update it directly if needed,
            // or we use a listener. For now, let's expose it.
            // Actually, best to just expose setHideBalances so OnboardingContext can sync it?
            // Or better: Let's read from OnboardingContext directly inside the components?
            // No, the requirement is "use *** notation".
            // Let's rely on useOnboarding() hook inside the Provider.
        }}>
            <ContextLogicChild setHideBalances={setHideBalances}>
                {children}
            </ContextLogicChild>
        </CurrencyContext.Provider>
    );
}

// Separate component to safely use useOnboarding defined in parent provider
// This avoids "Context is undefined" errors if we tried to use it in the main body above
// (though strictly speaking, since CurrencyProvider is inside OnboardingProvider in App.tsx, it should be fine).
// BUT... `CurrencyProvider` is exported and used in App.tsx. The hook is safe ONLY if the provider is rendered inside OnboardingProvider.
// App.tsx structure:
// <OnboardingProvider>
//   <CurrencyProvider> ...
// So it is safe!

function ContextLogicChild({ children, setHideBalances }: { children: ReactNode, setHideBalances: (v: boolean) => void }) {
    const { data } = useOnboarding();

    useEffect(() => {
        setHideBalances(data.hideBalances ?? false);
    }, [data.hideBalances]);

    return <>{children}</>;
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
