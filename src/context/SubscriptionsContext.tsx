/**
 * Sikka - Subscriptions Context with AsyncStorage
 * Manages app-wide subscription state with local persistence
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subscription } from '../types';

const STORAGE_KEY = '@sikka_subscriptions';

// ==================== CONTEXT TYPE ====================
interface SubscriptionsContextType {
    subscriptions: Subscription[];
    activeSubscriptions: Subscription[];
    monthlyTotal: number;
    isLoading: boolean;
    addSubscription: (sub: Omit<Subscription, 'id' | 'isDeleted' | 'isPaid'>) => Promise<void>;
    deleteSubscription: (id: string) => Promise<void>;
    markAsPaid: (id: string) => Promise<void>;
    markAsUnpaid: (id: string) => Promise<void>;
}

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined);

// ==================== PROVIDER ====================
interface SubscriptionsProviderProps {
    children: ReactNode;
}

export function SubscriptionsProvider({ children }: SubscriptionsProviderProps) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Active (non-deleted) subscriptions
    const activeSubscriptions = subscriptions.filter(s => !s.isDeleted);

    // Monthly total (yearly subscriptions divided by 12)
    const monthlyTotal = activeSubscriptions.reduce((sum, s) => {
        return sum + (s.billingCycle === 'yearly' ? s.amount / 12 : s.amount);
    }, 0);

    // Load from AsyncStorage
    useEffect(() => {
        const load = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setSubscriptions(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Error loading subscriptions:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Save to AsyncStorage
    const save = async (newSubs: Subscription[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSubs));
        } catch (error) {
            console.error('Error saving subscriptions:', error);
        }
    };

    // Add subscription
    const addSubscription = useCallback(async (subData: Omit<Subscription, 'id' | 'isDeleted' | 'isPaid'>) => {
        const newSub: Subscription = {
            ...subData,
            id: Date.now().toString(),
            isDeleted: false,
            isPaid: false,
        };
        const updated = [...subscriptions, newSub];
        setSubscriptions(updated);
        await save(updated);
    }, [subscriptions]);

    // Delete subscription
    const deleteSubscription = useCallback(async (id: string) => {
        const updated = subscriptions.map(s =>
            s.id === id ? { ...s, isDeleted: true } : s
        );
        setSubscriptions(updated);
        await save(updated);
    }, [subscriptions]);

    // Mark as paid
    const markAsPaid = useCallback(async (id: string) => {
        const updated = subscriptions.map(s =>
            s.id === id ? { ...s, isPaid: true } : s
        );
        setSubscriptions(updated);
        await save(updated);
    }, [subscriptions]);

    // Mark as unpaid
    const markAsUnpaid = useCallback(async (id: string) => {
        const updated = subscriptions.map(s =>
            s.id === id ? { ...s, isPaid: false } : s
        );
        setSubscriptions(updated);
        await save(updated);
    }, [subscriptions]);

    return (
        <SubscriptionsContext.Provider value={{
            subscriptions,
            activeSubscriptions,
            monthlyTotal,
            isLoading,
            addSubscription,
            deleteSubscription,
            markAsPaid,
            markAsUnpaid,
        }}>
            {children}
        </SubscriptionsContext.Provider>
    );
}

// ==================== HOOK ====================
export function useSubscriptions() {
    const context = useContext(SubscriptionsContext);
    if (!context) {
        throw new Error('useSubscriptions must be used within SubscriptionsProvider');
    }
    return context;
}

// ==================== SUBSCRIPTION ICONS ====================
export const SUBSCRIPTION_ICONS = [
    'movie', 'music-note', 'cloud', 'fitness-center', 'code',
    'gamepad', 'school', 'storage', 'phone-android', 'shield',
    'brush', 'build', 'restaurant', 'local-grocery-store', 'receipt-long',
];

// ==================== SUBSCRIPTION COLORS ====================
export const SUBSCRIPTION_COLORS = [
    '#E50914', // Netflix red
    '#1DB954', // Spotify green
    '#007AFF', // iCloud blue
    '#FFD700', // Gold
    '#A855F6', // Purple
    '#F97316', // Orange
    '#EC4899', // Pink
    '#06B6D4', // Cyan
];
