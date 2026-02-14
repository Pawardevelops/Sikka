/**
 * Sikka - Subscriptions Context
 * Manages subscription state with AsyncStorage persistence.
 *
 * Supports:
 *   - Admin / Member roles with split payments
 *   - Lifecycle: Active → Paused → Archived (with reactivation)
 *   - Event log for analytics
 *   - Auto-migration of legacy data (pre-split format)
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Subscription,
    SubscriptionStatus,
    SubscriptionEvent,
    SplitMember,
} from '../types';

export interface OnSubscriptionPaidDetails {
    subscriptionId: string;
    name: string;
    amount: number;
    category: string;
    paymentSourceId?: string;
}

const STORAGE_KEY = '@sikka_subscriptions';

// ─── Context Type ─────────────────────────────────────────────────────
interface SubscriptionsContextType {
    // Data
    subscriptions: Subscription[];
    activeSubscriptions: Subscription[];
    pausedSubscriptions: Subscription[];
    archivedSubscriptions: Subscription[];
    monthlyTotal: number;         // sum of myShare for active subs
    isLoading: boolean;

    // CRUD
    addSubscription: (data: NewSubscriptionData) => Promise<void>;
    updateSubscription: (id: string, updates: Partial<UpdatableFields>) => Promise<void>;
    deleteSubscriptionPermanently: (id: string) => Promise<void>;

    // Lifecycle
    pauseSubscription: (id: string) => Promise<void>;
    archiveSubscription: (id: string) => Promise<void>;
    reactivateSubscription: (id: string, updates?: Partial<UpdatableFields>) => Promise<void>;

    // Payment cycle
    markAsPaid: (id: string) => Promise<void>;
    markAsUnpaid: (id: string) => Promise<void>;
    updateSplitMemberStatus: (subId: string, memberName: string, status: 'pending' | 'paid') => Promise<void>;

    // Analytics
    getEventLog: (id: string) => SubscriptionEvent[];
}

// Fields accepted when creating a new subscription
type NewSubscriptionData = Omit<Subscription,
    'id' | 'status' | 'isPaid' | 'eventLog' | 'isDeleted' | 'amount'
>;

// Fields that can be updated on an existing subscription
type UpdatableFields = Pick<Subscription,
    'name' | 'icon' | 'iconColor' | 'totalAmount' | 'myShare' |
    'dueDate' | 'billingCycle' | 'category' | 'role' | 'isSplit' |
    'splitMembers' | 'paymentSourceId' | 'paymentMode' | 'payTo'
>;

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined);

// ─── Migration ────────────────────────────────────────────────────────
/**
 * Migrates legacy subscriptions (pre-split format) to the new schema.
 * Safe to run on already-migrated data (idempotent).
 */
function migrateSubscription(raw: any): Subscription {
    return {
        // Identity
        id: raw.id,
        name: raw.name || 'Untitled',
        icon: raw.icon || 'receipt-long',
        iconColor: raw.iconColor || '#3B82F6',

        // Amounts — legacy subs only have `amount`
        totalAmount: raw.totalAmount ?? raw.amount ?? 0,
        myShare: raw.myShare ?? raw.amount ?? 0,
        amount: raw.myShare ?? raw.amount ?? 0,

        // Billing
        dueDate: raw.dueDate ?? 1,
        billingCycle: raw.billingCycle || 'monthly',
        category: raw.category || 'general',

        // Role & Split — default to admin, no split
        role: raw.role || 'admin',
        isSplit: raw.isSplit ?? false,
        splitMembers: raw.splitMembers ?? [],

        // Payment
        paymentSourceId: raw.paymentSourceId,
        paymentMode: raw.paymentMode || 'ask_every_time',
        payTo: raw.payTo,

        // Lifecycle — map legacy isDeleted to status
        status: raw.status || (raw.isDeleted ? 'archived' : 'active'),
        isPaid: raw.isPaid ?? false,
        eventLog: raw.eventLog ?? [
            { type: 'created' as const, timestamp: Date.now() },
        ],

        // Legacy
        isDeleted: raw.isDeleted,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────
function addEvent(sub: Subscription, type: SubscriptionEvent['type'], details?: string): Subscription {
    return {
        ...sub,
        eventLog: [
            ...sub.eventLog,
            { type, timestamp: Date.now(), details },
        ],
    };
}

// ─── Provider ─────────────────────────────────────────────────────────
interface ProviderProps {
    children: ReactNode;
    onSubscriptionPaid?: (details: OnSubscriptionPaidDetails) => void;
}

export function SubscriptionsProvider({ children, onSubscriptionPaid }: ProviderProps) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Derived lists ──
    const activeSubscriptions = useMemo(
        () => subscriptions.filter(s => s.status === 'active'),
        [subscriptions],
    );
    const pausedSubscriptions = useMemo(
        () => subscriptions.filter(s => s.status === 'paused'),
        [subscriptions],
    );
    const archivedSubscriptions = useMemo(
        () => subscriptions.filter(s => s.status === 'archived'),
        [subscriptions],
    );

    // Monthly total uses myShare (your actual cost, not the full bill)
    const monthlyTotal = useMemo(
        () => activeSubscriptions.reduce((sum, s) => {
            const share = s.myShare ?? s.amount ?? 0;
            return sum + (s.billingCycle === 'yearly' ? share / 12 : share);
        }, 0),
        [activeSubscriptions],
    );

    // ── Persistence ──
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as any[];
                    setSubscriptions(parsed.map(migrateSubscription));
                }
            } catch (err) {
                console.error('[Subscriptions] Load error:', err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const persist = useCallback(async (next: Subscription[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (err) {
            console.error('[Subscriptions] Save error:', err);
        }
    }, []);

    /** Apply a transform to the list, persist, and set state. */
    const update = useCallback(async (fn: (prev: Subscription[]) => Subscription[]) => {
        setSubscriptions(prev => {
            const next = fn(prev);
            persist(next); // fire-and-forget
            return next;
        });
    }, [persist]);

    // ── CRUD ──────────────────────────────────────────────────────────

    const addSubscription = useCallback(async (data: NewSubscriptionData) => {
        const newSub: Subscription = {
            ...data,
            id: Date.now().toString(),
            amount: data.myShare,           // backward-compat alias
            status: 'active',
            isPaid: false,
            eventLog: [{ type: 'created', timestamp: Date.now() }],
        };
        await update(prev => [...prev, newSub]);
    }, [update]);

    const updateSubscription = useCallback(async (
        id: string,
        updates: Partial<UpdatableFields>,
    ) => {
        await update(prev => prev.map(s => {
            if (s.id !== id) return s;

            let updated = { ...s, ...updates };

            // Keep amount alias in sync
            if (updates.myShare !== undefined) {
                updated.amount = updates.myShare;
            }

            // Log price changes
            if (updates.totalAmount !== undefined && updates.totalAmount !== s.totalAmount) {
                updated = addEvent(updated, 'price_updated',
                    `Total: ${s.totalAmount} → ${updates.totalAmount}`);
            }
            if (updates.myShare !== undefined && updates.myShare !== s.myShare) {
                updated = addEvent(updated, 'price_updated',
                    `My share: ${s.myShare} → ${updates.myShare}`);
            }

            return updated;
        }));
    }, [update]);

    const deleteSubscriptionPermanently = useCallback(async (id: string) => {
        await update(prev => prev.filter(s => s.id !== id));
    }, [update]);

    // ── Lifecycle ─────────────────────────────────────────────────────

    const pauseSubscription = useCallback(async (id: string) => {
        await update(prev => prev.map(s => {
            if (s.id !== id) return s;
            return addEvent({ ...s, status: 'paused' }, 'paused');
        }));
    }, [update]);

    const archiveSubscription = useCallback(async (id: string) => {
        await update(prev => prev.map(s => {
            if (s.id !== id) return s;
            return addEvent({ ...s, status: 'archived', isDeleted: true }, 'archived');
        }));
    }, [update]);

    const reactivateSubscription = useCallback(async (
        id: string,
        updates?: Partial<UpdatableFields>,
    ) => {
        await update(prev => prev.map(s => {
            if (s.id !== id) return s;
            let reactivated: Subscription = {
                ...s,
                ...updates,
                status: 'active',
                isPaid: false,
                isDeleted: false,
            };
            if (updates?.myShare !== undefined) {
                reactivated.amount = updates.myShare;
            }
            return addEvent(reactivated, 'reactivated');
        }));
    }, [update]);

    // ── Payment Cycle ─────────────────────────────────────────────────

    const markAsPaid = useCallback(async (id: string) => {
        let targetSub: Subscription | undefined;
        await update(prev => prev.map(s => {
            if (s.id === id) {
                targetSub = s;
                return { ...s, isPaid: true };
            }
            return s;
        }));

        if (targetSub && onSubscriptionPaid) {
            onSubscriptionPaid({
                subscriptionId: targetSub.id,
                name: targetSub.name,
                amount: targetSub.role === 'admin' ? targetSub.totalAmount : (targetSub.myShare ?? 0),
                category: targetSub.category,
                paymentSourceId: targetSub.paymentSourceId,
            });
        }
    }, [update, onSubscriptionPaid]);

    const markAsUnpaid = useCallback(async (id: string) => {
        await update(prev => prev.map(s =>
            s.id === id ? { ...s, isPaid: false } : s
        ));
    }, [update]);

    const updateSplitMemberStatus = useCallback(async (
        subId: string,
        memberName: string,
        status: 'pending' | 'paid',
    ) => {
        await update(prev => prev.map(s => {
            if (s.id !== subId) return s;
            return {
                ...s,
                splitMembers: s.splitMembers.map(m =>
                    m.name === memberName ? { ...m, status } : m
                ),
            };
        }));
    }, [update]);

    // ── Analytics ─────────────────────────────────────────────────────

    const getEventLog = useCallback((id: string): SubscriptionEvent[] => {
        return subscriptions.find(s => s.id === id)?.eventLog ?? [];
    }, [subscriptions]);

    // ── Provider value ────────────────────────────────────────────────
    const value = useMemo<SubscriptionsContextType>(() => ({
        subscriptions,
        activeSubscriptions,
        pausedSubscriptions,
        archivedSubscriptions,
        monthlyTotal,
        isLoading,
        addSubscription,
        updateSubscription,
        deleteSubscriptionPermanently,
        pauseSubscription,
        archiveSubscription,
        reactivateSubscription,
        markAsPaid,
        markAsUnpaid,
        updateSplitMemberStatus,
        getEventLog,
    }), [
        subscriptions, activeSubscriptions, pausedSubscriptions,
        archivedSubscriptions, monthlyTotal, isLoading,
        addSubscription, updateSubscription, deleteSubscriptionPermanently,
        pauseSubscription, archiveSubscription, reactivateSubscription,
        markAsPaid, markAsUnpaid, updateSplitMemberStatus, getEventLog,
    ]);

    return (
        <SubscriptionsContext.Provider value={value}>
            {children}
        </SubscriptionsContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────
export function useSubscriptions() {
    const ctx = useContext(SubscriptionsContext);
    if (!ctx) throw new Error('useSubscriptions must be used within SubscriptionsProvider');
    return ctx;
}

// ─── Preset Icons & Colors ────────────────────────────────────────────
export const SUBSCRIPTION_ICONS = [
    'movie', 'music-note', 'cloud', 'fitness-center', 'code',
    'gamepad', 'school', 'storage', 'phone-android', 'shield',
    'brush', 'build', 'restaurant', 'local-grocery-store', 'receipt-long',
];

export const SUBSCRIPTION_COLORS = [
    '#E50914', '#1DB954', '#007AFF', '#FFD700',
    '#A855F6', '#F97316', '#EC4899', '#06B6D4',
];
