/**
 * Sikka - Security Context
 * Manages biometric authentication settings and state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURITY_KEY = '@sikka_security_settings';
const ONBOARDING_KEY = '@sikka_onboarding';

interface SecuritySettings {
    biometricEnabled: boolean;
}

interface SecurityContextType {
    // Settings
    biometricEnabled: boolean;
    toggleBiometric: () => Promise<boolean>;
    setBiometricEnabled: (enabled: boolean) => Promise<void>;

    // Device capabilities
    hasBiometricHardware: boolean;
    biometricType: string;

    // Auth state
    isAuthenticated: boolean;
    authenticate: () => Promise<boolean>;

    // Loading state
    isLoading: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    const [biometricEnabled, setBiometricEnabledState] = useState(false);
    const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
    const [biometricType, setBiometricType] = useState('None');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check device capabilities on mount
    useEffect(() => {
        const initSecurity = async () => {
            try {
                // Check for hardware
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                setHasBiometricHardware(hasHardware);

                if (hasHardware) {
                    // Check what types are available
                    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                        setBiometricType('Fingerprint');
                    } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                        setBiometricType('Face ID');
                    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                        setBiometricType('Iris');
                    }

                    // Check if enrolled
                    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                    if (!isEnrolled) {
                        setBiometricType('Not Set Up');
                    }
                }

                // Load saved settings
                const savedSettings = await AsyncStorage.getItem(SECURITY_KEY);
                if (savedSettings) {
                    const settings: SecuritySettings = JSON.parse(savedSettings);
                    setBiometricEnabledState(settings.biometricEnabled);

                    // If biometric is not enabled, auto-authenticate
                    if (!settings.biometricEnabled) {
                        setIsAuthenticated(true);
                    }
                } else {
                    // No saved settings - check onboarding data for initial biometric preference
                    const onboardingData = await AsyncStorage.getItem(ONBOARDING_KEY);
                    if (onboardingData) {
                        const parsed = JSON.parse(onboardingData);
                        if (parsed.biometricEnabled) {
                            // User enabled biometric during onboarding - save to security settings
                            const newSettings: SecuritySettings = { biometricEnabled: true };
                            await AsyncStorage.setItem(SECURITY_KEY, JSON.stringify(newSettings));
                            setBiometricEnabledState(true);
                            // Don't auto-authenticate since biometric is enabled
                        } else {
                            setIsAuthenticated(true);
                        }
                    } else {
                        // First time - no lock enabled
                        setIsAuthenticated(true);
                    }
                }
            } catch (error) {
                console.error('Security init error:', error);
                setIsAuthenticated(true); // Allow access on error
            } finally {
                setIsLoading(false);
            }
        };

        initSecurity();
    }, []);

    // Authenticate user
    const authenticate = useCallback(async (): Promise<boolean> => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Sikka',
                fallbackLabel: 'Use passcode',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Authentication error:', error);
            return false;
        }
    }, []);

    // Set biometric enabled directly (used by onboarding)
    const setBiometricEnabled = useCallback(async (enabled: boolean) => {
        try {
            const newSettings: SecuritySettings = { biometricEnabled: enabled };
            await AsyncStorage.setItem(SECURITY_KEY, JSON.stringify(newSettings));
            setBiometricEnabledState(enabled);
        } catch (error) {
            console.error('Set biometric error:', error);
        }
    }, []);

    // Toggle biometric lock
    const toggleBiometric = useCallback(async (): Promise<boolean> => {
        try {
            if (!biometricEnabled) {
                // Turning ON - verify biometric first
                const hasEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!hasEnrolled) {
                    // No biometrics enrolled on device
                    return false;
                }

                // Verify user can authenticate
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Enable fingerprint lock',
                    fallbackLabel: 'Cancel',
                });

                if (result.success) {
                    const newSettings: SecuritySettings = { biometricEnabled: true };
                    await AsyncStorage.setItem(SECURITY_KEY, JSON.stringify(newSettings));
                    setBiometricEnabledState(true);
                    return true;
                }
                return false;
            } else {
                // Turning OFF
                const newSettings: SecuritySettings = { biometricEnabled: false };
                await AsyncStorage.setItem(SECURITY_KEY, JSON.stringify(newSettings));
                setBiometricEnabledState(false);
                return true;
            }
        } catch (error) {
            console.error('Toggle biometric error:', error);
            return false;
        }
    }, [biometricEnabled]);

    return (
        <SecurityContext.Provider value={{
            biometricEnabled,
            toggleBiometric,
            setBiometricEnabled,
            hasBiometricHardware,
            biometricType,
            isAuthenticated,
            authenticate,
            isLoading,
        }}>
            {children}
        </SecurityContext.Provider>
    );
}

export function useSecurity() {
    const context = useContext(SecurityContext);
    if (!context) {
        throw new Error('useSecurity must be used within SecurityProvider');
    }
    return context;
}
