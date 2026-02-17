/**
 * Sikka - Security Context
 * Manages biometric authentication settings and state using WatermelonDB
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import database from '../database';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';

const SECURITY_KEY = 'security_settings';

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

    // Helper to get/set settings
    const getSettings = async (): Promise<SecuritySettings | null> => {
        try {
            const settingsCollection = database.get<Setting>('settings');
            const records = await settingsCollection.query(Q.where('key', SECURITY_KEY)).fetch();
            if (records.length > 0) {
                return JSON.parse(records[0].value);
            }
        } catch (e) { console.error(e); }
        return null;
    };

    const saveSettings = async (settings: SecuritySettings) => {
        try {
            await database.write(async () => {
                const settingsCollection = database.get<Setting>('settings');
                const records = await settingsCollection.query(Q.where('key', SECURITY_KEY)).fetch();
                if (records.length > 0) {
                    await records[0].update(s => {
                        s.value = JSON.stringify(settings);
                    });
                } else {
                    await settingsCollection.create(s => {
                        s.key = SECURITY_KEY;
                        s.value = JSON.stringify(settings);
                    });
                }
            });
        } catch (e) {
            console.error('Error saving security settings', e);
        }
    };

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
                const savedSettings = await getSettings();

                if (savedSettings) {
                    setBiometricEnabledState(savedSettings.biometricEnabled);

                    // If biometric is not enabled, auto-authenticate
                    if (!savedSettings.biometricEnabled) {
                        setIsAuthenticated(true);
                    }
                } else {
                    // Default: Disable biometric, auto-authenticate
                    setIsAuthenticated(true);
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
            await saveSettings(newSettings);
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
                    await setBiometricEnabled(true);
                    return true;
                }
                return false;
            } else {
                // Turning OFF
                await setBiometricEnabled(false);
                return true;
            }
        } catch (error) {
            console.error('Toggle biometric error:', error);
            return false;
        }
    }, [biometricEnabled, setBiometricEnabled]);

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
