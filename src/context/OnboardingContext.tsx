/**
 * Sikka - Onboarding Context
 * Manages first-time user onboarding flow and preference's
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { OnboardingData, OnboardingStep, Language, NumberSystem } from '../types';
import database from '../database';
import User from '../database/models/User';

// ==================== DEFAULT VALUES ====================
const DEFAULT_ONBOARDING_DATA: OnboardingData = {
    language: 'en',
    currency: 'INR',
    numberSystem: 'lakhs',
    userName: '',
    primaryGoal: '',
    monthlySpendLimit: 30000,
    hideBalances: false,
    notificationPermissionGranted: false,
    biometricEnabled: false,
    autoBackupEnabled: false,
    backupLocation: undefined,
};

/** Welcome → Profile → Use local AI? → Model → First look → Accounts → Security */
export const ONBOARDING_STEPS = 7;

/** The progress dots show 5 steps; Welcome has none and the AI choice + model share one. */
export const ONBOARDING_DOTS = 5;
export function dotFor(step: OnboardingStep): number {
    return ({ 1: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5 } as const)[step];
}

/** What First look found in the SMS inbox; Accounts setup confirms it. */
export interface SmsPreview {
    payments: number;
    spent: number;
    toCheck: number;
    places: { name: string; count: number; total: number; category: string }[];
    accounts: import('../services/sms/extract').DetectedAccount[];
}

// ==================== CONTEXT TYPE ====================
interface OnboardingContextType {
    // State
    isOnboardingComplete: boolean;
    isLoading: boolean;
    currentStep: OnboardingStep;
    data: OnboardingData;

    // Navigation
    goNext: () => void;
    goBack: () => void;
    goToStep: (step: OnboardingStep) => void;

    // Data updates
    updateData: (updates: Partial<OnboardingData>) => void;
    preview: SmsPreview | null;
    setPreview: (p: SmsPreview | null) => void;

    // Completion
    completeOnboarding: () => Promise<void>;
    resetOnboarding: () => Promise<void>;
    resetPreferences: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// ==================== PROVIDER ====================
interface OnboardingProviderProps {
    children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
    const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
    const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
    const [preview, setPreview] = useState<SmsPreview | null>(null);

    // Load onboarding status on mount
    useEffect(() => {
        const loadOnboardingStatus = async () => {
            try {
                const usersCollection = database.get<User>('users');
                const users = await usersCollection.query().fetch();

                if (users.length > 0) {
                    const user = users[0];
                    if (user.onboardingCompleted) {
                        setIsOnboardingComplete(true);
                        // Restore preferences
                        setData({
                            ...DEFAULT_ONBOARDING_DATA,
                            ...user.preferences,
                            userName: user.name,
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading onboarding status:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadOnboardingStatus();
    }, []);

    // Navigate to next step
    const goNext = useCallback(() => {
        setCurrentStep((prev) => {
            if (prev < ONBOARDING_STEPS) return (prev + 1) as OnboardingStep;
            return prev;
        });
    }, []);

    // Navigate to previous step
    const goBack = useCallback(() => {
        setCurrentStep((prev) => {
            if (prev > 1) return (prev - 1) as OnboardingStep;
            return prev;
        });
    }, []);

    // Jump to specific step
    const goToStep = useCallback((step: OnboardingStep) => {
        setCurrentStep(step);
    }, []);

    // Update onboarding data
    const updateData = useCallback((updates: Partial<OnboardingData>) => {
        setData((prev) => {
            const newData = { ...prev, ...updates };

            // If onboarding is complete, persist to DB immediately
            if (isOnboardingComplete) {
                // Fire and forget persistence
                database.write(async () => {
                    const usersCollection = database.get<User>('users');
                    const users = await usersCollection.query().fetch();
                    if (users.length > 0) {
                        await users[0].update(user => {
                            user.preferences = newData;
                            if (updates.userName !== undefined) {
                                user.name = updates.userName;
                            }
                        });
                    }
                }).catch(error => {
                    console.error('Failed to persist settings:', error);
                });
            }

            return newData;
        });
    }, [isOnboardingComplete]);

    // Complete onboarding and save all data
    const completeOnboarding = useCallback(async () => {
        try {
            await database.write(async () => {
                const usersCollection = database.get<User>('users');
                const users = await usersCollection.query().fetch();

                if (users.length > 0) {
                    await users[0].update(user => {
                        user.name = data.userName;
                        user.onboardingCompleted = true;
                        user.preferences = data;
                    });
                } else {
                    await usersCollection.create(user => {
                        user.name = data.userName;
                        user.onboardingCompleted = true;
                        user.preferences = data;
                        user.email = ''; // Optional
                    });
                }
            });
            setIsOnboardingComplete(true);
        } catch (error) {
            console.error('Error completing onboarding:', error);
            throw error;
        }
    }, [data]);

    // Reset onboarding (for testing)
    const resetOnboarding = useCallback(async () => {
        try {
            await database.write(async () => {
                const usersCollection = database.get<User>('users');
                const users = await usersCollection.query().fetch();
                if (users.length > 0) {
                    // In a real app, maybe don't delete, just reset flag?
                    // For now, let's just reset the flag and preferences
                    await users[0].update(user => {
                        user.onboardingCompleted = false;
                        user.preferences = {};
                    });
                }
            });
            setIsOnboardingComplete(false);
            setCurrentStep(1);
            setData(DEFAULT_ONBOARDING_DATA);
        } catch (error) {
            console.error('Error resetting onboarding:', error);
        }
    }, []);

    const resetPreferences = useCallback(async () => {
        const defaults: Partial<OnboardingData> = {
            currency: 'INR',
            biometricEnabled: false,
            hideBalances: false,
        };

        setData(prev => ({ ...prev, ...defaults }));

        if (isOnboardingComplete) {
            await database.write(async () => {
                const usersCollection = database.get<User>('users');
                const users = await usersCollection.query().fetch();
                if (users.length > 0) {
                    await users[0].update(user => {
                        user.preferences = { ...user.preferences, ...defaults };
                    });
                }
            });
        }
    }, [isOnboardingComplete]);

    return (
        <OnboardingContext.Provider value={{
            isOnboardingComplete,
            isLoading,
            currentStep,
            data,
            goNext,
            goBack,
            goToStep,
            updateData,
            preview,
            setPreview,
            completeOnboarding,
            resetOnboarding,
            resetPreferences,
        }}>
            {children}
        </OnboardingContext.Provider>
    );
}

// ==================== HOOK ====================
export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within OnboardingProvider');
    }
    return context;
}

// ==================== CONSTANTS ====================
export const LANGUAGES: { value: Language; label: string; icon: string }[] = [
    { value: 'en', label: 'English', icon: 'Aa' },
    { value: 'hi', label: 'हिंदी (Hindi)', icon: 'अ' },
    { value: 'hinglish', label: 'Hinglish', icon: 'Aअ' },
];

export const NUMBER_SYSTEMS: { value: NumberSystem; label: string }[] = [
    { value: 'lakhs', label: 'Lakhs' },
    { value: 'millions', label: 'Millions' },
];

export const USER_GOALS: { value: string; label: string; icon: string; palette: 'dining' | 'groceries' | 'shopping' | 'transport' }[] = [
    { value: 'Spend less', label: 'Spend less', icon: 'south', palette: 'dining' },
    { value: 'Save more', label: 'Save more', icon: 'savings', palette: 'groceries' },
    { value: 'Clear debt', label: 'Clear debt', icon: 'credit-card', palette: 'shopping' },
    { value: 'Just track', label: 'Just track', icon: 'visibility', palette: 'transport' },
];
