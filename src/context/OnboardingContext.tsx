/**
 * Sikka - Onboarding Context
 * Manages first-time user onboarding flow and preferences
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingData, OnboardingStep, Language, NumberSystem } from '../types';

const ONBOARDING_KEY = '@sikka_onboarding';
const ONBOARDING_COMPLETE_KEY = '@sikka_onboarding_complete';

// ==================== DEFAULT VALUES ====================
const DEFAULT_ONBOARDING_DATA: OnboardingData = {
    language: 'en',
    currency: 'INR',
    numberSystem: 'lakhs',
    userName: '',
    primaryGoal: '',
    hideBalances: false,
    notificationPermissionGranted: false,
    biometricEnabled: false,
    backupLocation: undefined,
};

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

    // Completion
    completeOnboarding: () => Promise<void>;
    resetOnboarding: () => Promise<void>;
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

    // Load onboarding status on mount
    useEffect(() => {
        const loadOnboardingStatus = async () => {
            try {
                const completeFlag = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
                if (completeFlag === 'true') {
                    setIsOnboardingComplete(true);
                    // Load saved data
                    const savedData = await AsyncStorage.getItem(ONBOARDING_KEY);
                    if (savedData) {
                        setData(JSON.parse(savedData));
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
            if (prev < 5) return (prev + 1) as OnboardingStep;
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
        setData((prev) => ({ ...prev, ...updates }));
    }, []);

    // Complete onboarding and save all data
    const completeOnboarding = useCallback(async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
            await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
            setIsOnboardingComplete(true);
        } catch (error) {
            console.error('Error completing onboarding:', error);
            throw error;
        }
    }, [data]);

    // Reset onboarding (for testing)
    const resetOnboarding = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(ONBOARDING_KEY);
            await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
            setIsOnboardingComplete(false);
            setCurrentStep(1);
            setData(DEFAULT_ONBOARDING_DATA);
        } catch (error) {
            console.error('Error resetting onboarding:', error);
        }
    }, []);

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
            completeOnboarding,
            resetOnboarding,
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

export const USER_GOALS: string[] = [
    'Save more money',
    'Track daily expenses',
    'Budget planning',
    'Reduce debt',
    'Investment tracking',
    'Business expenses',
];
