/**
 * Sikka - App Lifecycle Context
 * Allows triggering a soft restart of the app (remounting providers)
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface AppLifecycleContextType {
    resetApp: () => void;
}

const AppLifecycleContext = createContext<AppLifecycleContextType>({
    resetApp: () => { },
});

export const useAppLifecycle = () => useContext(AppLifecycleContext);

interface AppLifecycleProviderProps {
    children: ReactNode;
    onReset: () => void;
}

export const AppLifecycleProvider = ({ children, onReset }: AppLifecycleProviderProps) => {
    return (
        <AppLifecycleContext.Provider value={{ resetApp: onReset }}>
            {children}
        </AppLifecycleContext.Provider>
    );
};
