/**
 * Sikka - Subscriptions Context with WatermelonDB
 * Manages subscription state with WatermelonDB persistence.
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
import {
    Subscription as SubscriptionType,
    SubscriptionEvent as SubscriptionEventType,
    TransactionCategory,
} from '../types';
import database from '../database';
import Subscription from '../database/models/Subscription';
import SubscriptionMember from '../database/models/SubscriptionMember';
import SubscriptionEvent from '../database/models/SubscriptionEvent';
import Account from '../database/models/Account';
import Category from '../database/models/Category';
import Transaction from '../database/models/Transaction';
import { Q } from '@nozbe/watermelondb';

export interface OnSubscriptionPaidDetails {
    subscriptionId: string;
    name: string;
    amount: number;
    category: string;
    paymentSourceId?: string;
}

// ─── Context Type ─────────────────────────────────────────────────────
interface SubscriptionsContextType {
    // Data
    subscriptions: SubscriptionType[];
    activeSubscriptions: SubscriptionType[];
    pausedSubscriptions: SubscriptionType[];
    archivedSubscriptions: SubscriptionType[];
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
    getEventLog: (id: string) => SubscriptionEventType[];
}

// Fields accepted when creating a new subscription
type NewSubscriptionData = Omit<SubscriptionType,
    'id' | 'status' | 'isPaid' | 'eventLog' | 'isDeleted' | 'amount'
>;

// Fields that can be updated on an existing subscription
type UpdatableFields = Pick<SubscriptionType,
    'name' | 'icon' | 'iconColor' | 'totalAmount' | 'myShare' |
    'dueDate' | 'billingCycle' | 'category' | 'role' | 'isSplit' |
    'splitMembers' | 'paymentSourceId' | 'paymentMode' | 'payTo'
>;

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────
interface ProviderProps {
    children: ReactNode;
}

export function SubscriptionsProvider({ children }: ProviderProps) {
    const [subscriptions, setSubscriptions] = useState<SubscriptionType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load & Subscription
    useEffect(() => {
        const subscriptionsCollection = database.get<Subscription>('subscriptions');

        const subscription = subscriptionsCollection
            .query()
            .observeWithColumns(['status', 'is_paid', 'updated_at'])
            .subscribe(async (records) => {
                const mapped = await Promise.all(records.map(async (sub) => {
                    // Fetch relations
                    const members = await sub.members.fetch();
                    const events = await sub.events.fetch();

                    // Fetch category name
                    let categoryName: TransactionCategory = 'other';
                    try {
                        const cat = await sub.category.fetch();
                        if (cat) categoryName = cat.name.toLowerCase() as TransactionCategory;
                    } catch (e) { }

                    // Map to Type
                    return {
                        id: sub.id,
                        name: sub.name,
                        icon: sub.icon,
                        iconColor: sub.iconColor,
                        totalAmount: sub.totalAmount,
                        myShare: sub.myShare,
                        amount: sub.myShare, // Alias
                        dueDate: sub.dueDate,
                        billingCycle: sub.billingCycle,
                        category: categoryName,
                        role: sub.role,
                        isSplit: sub.isSplit,
                        splitMembers: members.map((m: SubscriptionMember) => ({
                            name: m.name,
                            amount: m.amount,
                            status: m.status
                        })),
                        paymentSourceId: sub.account.id, // ID access is sync
                        paymentMode: sub.paymentMode,
                        payTo: sub.payTo,
                        status: sub.status,
                        isPaid: sub.isPaid,
                        eventLog: events.map((e: SubscriptionEvent) => ({
                            type: e.type,
                            timestamp: e.timestamp,
                            details: e.details
                        })).sort((a: any, b: any) => b.timestamp - a.timestamp), // Sort desc
                        isDeleted: sub.status === 'archived', // Dependent on status
                    } as SubscriptionType;
                }));

                setSubscriptions(mapped);
                setIsLoading(false);
            });

        return () => subscription.unsubscribe();
    }, []);

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

    // Monthly total using myShare
    const monthlyTotal = useMemo(
        () => activeSubscriptions.reduce((sum, s) => {
            const share = s.myShare ?? s.amount ?? 0;
            return sum + (s.billingCycle === 'yearly' ? share / 12 : share);
        }, 0),
        [activeSubscriptions],
    );

    // ── CRUD ──────────────────────────────────────────────────────────

    const addSubscription = useCallback(async (data: NewSubscriptionData) => {
        try {
            await database.write(async () => {
                const subCollection = database.get<Subscription>('subscriptions');
                const membersCollection = database.get<SubscriptionMember>('subscription_members');
                const eventsCollection = database.get<SubscriptionEvent>('subscription_events');
                const categoriesCollection = database.get<Category>('categories');
                const accountsCollection = database.get<Account>('accounts');

                // Resolve Relations
                let category: Category | undefined;
                const cats = await categoriesCollection.query(Q.where('name', Q.like(`%${data.category}%`))).fetch();
                if (cats.length > 0) category = cats[0];
                else {
                    const other = await categoriesCollection.query(Q.where('name', 'other')).fetch();
                    if (other.length > 0) category = other[0];
                }

                let account: Account | undefined;
                if (data.paymentSourceId) {
                    account = await accountsCollection.find(data.paymentSourceId);
                }

                // Create Subscription
                const newSub = await subCollection.create(sub => {
                    sub.name = data.name;
                    sub.icon = data.icon;
                    sub.iconColor = data.iconColor;
                    sub.totalAmount = data.totalAmount;
                    sub.myShare = data.myShare;
                    sub.dueDate = data.dueDate;
                    sub.billingCycle = data.billingCycle;
                    sub.role = data.role;
                    sub.isSplit = data.isSplit;
                    sub.status = 'active';
                    sub.isPaid = false;
                    sub.paymentMode = data.paymentMode;
                    sub.payTo = data.payTo || '';
                    if (account) sub.account.set(account);
                    if (category) sub.category.set(category);
                });

                // Create Members
                if (data.isSplit && data.splitMembers) {
                    for (const member of data.splitMembers) {
                        await membersCollection.create(m => {
                            m.subscription.set(newSub);
                            m.name = member.name;
                            m.amount = member.amount;
                            m.status = member.status;
                        });
                    }
                }

                // Create Initial Event
                await eventsCollection.create(e => {
                    e.subscription.set(newSub);
                    e.type = 'created';
                    e.timestamp = Date.now();
                    e.details = '';
                });
            });
        } catch (error) {
            console.error('Error adding subscription:', error);
        }
    }, []);

    const updateSubscription = useCallback(async (
        id: string,
        updates: Partial<UpdatableFields>,
    ) => {
        try {
            await database.write(async () => {
                const sub = await database.get<Subscription>('subscriptions').find(id);

                let account: Account | undefined;
                if (updates.paymentSourceId) {
                    account = await database.get<Account>('accounts').find(updates.paymentSourceId);
                }

                let category: Category | undefined;
                if (updates.category) {
                    const categoriesCollection = database.get<Category>('categories');
                    const cats = await categoriesCollection.query(Q.where('name', Q.like(`%${updates.category}%`))).fetch();
                    if (cats.length > 0) category = cats[0];
                }

                await sub.update(s => {
                    if (updates.name) s.name = updates.name;
                    if (updates.icon) s.icon = updates.icon;
                    if (updates.iconColor) s.iconColor = updates.iconColor;
                    if (updates.totalAmount !== undefined) s.totalAmount = updates.totalAmount;
                    if (updates.myShare !== undefined) s.myShare = updates.myShare;
                    if (updates.dueDate !== undefined) s.dueDate = updates.dueDate;
                    if (updates.billingCycle) s.billingCycle = updates.billingCycle;
                    if (updates.role) s.role = updates.role;
                    if (updates.isSplit !== undefined) s.isSplit = updates.isSplit;
                    if (updates.paymentMode) s.paymentMode = updates.paymentMode;
                    if (updates.payTo !== undefined) s.payTo = updates.payTo;
                    if (account) s.account.set(account);
                    if (category) s.category.set(category);
                });

                // Handle Split Members (Full Replace just for simplicity in this MVP)
                if (updates.isSplit && updates.splitMembers) {
                    // Delete existing members
                    const existingMembers = await sub.members.fetch();
                    for (const m of existingMembers) {
                        await m.destroyPermanently();
                    }
                    // Create new
                    const membersCollection = database.get<SubscriptionMember>('subscription_members');
                    for (const member of updates.splitMembers) {
                        await membersCollection.create(m => {
                            m.subscription.set(sub);
                            m.name = member.name;
                            m.amount = member.amount;
                            m.status = member.status;
                        });
                    }
                }

                // Log events (simplified)
                if (updates.totalAmount !== undefined || updates.myShare !== undefined) {
                    await database.get<SubscriptionEvent>('subscription_events').create(e => {
                        e.subscription.set(sub);
                        e.type = 'price_updated';
                        e.timestamp = Date.now();
                        e.details = 'Price updated';
                    });
                }
            });
        } catch (error) {
            console.error('Error updating subscription:', error);
        }
    }, []);

    const deleteSubscriptionPermanently = useCallback(async (id: string) => {
        try {
            await database.write(async () => {
                const sub = await database.get<Subscription>('subscriptions').find(id);
                // await sub.markAsDeleted(); // WatermelonDB syncable delete
                // For this app, we hard delete for "Permanently" or soft delete via Archive
                await sub.destroyPermanently();
            });
        } catch (error) {
            console.error('Error deleting subscription:', error);
        }
    }, []);

    // ── Lifecycle ─────────────────────────────────────────────────────

    const pauseSubscription = useCallback(async (id: string) => {
        try {
            await database.write(async () => {
                const sub = await database.get<Subscription>('subscriptions').find(id);
                await sub.update(s => {
                    s.status = 'paused';
                });
                await database.get<SubscriptionEvent>('subscription_events').create(e => {
                    e.subscription.set(sub);
                    e.type = 'paused';
                    e.timestamp = Date.now();
                    e.details = 'Subscription paused';
                });
            });
        } catch (error) {
            console.error('Error pausing subscription:', error);
        }
    }, []);

    const archiveSubscription = useCallback(async (id: string) => {
        try {
            await database.write(async () => {
                const sub = await database.get<Subscription>('subscriptions').find(id);
                await sub.update(s => {
                    s.status = 'archived';
                });
                await database.get<SubscriptionEvent>('subscription_events').create(e => {
                    e.subscription.set(sub);
                    e.type = 'archived';
                    e.timestamp = Date.now();
                    e.details = 'Subscription archived';
                });
            });
        } catch (error) {
            console.error('Error archiving subscription:', error);
        }
    }, []);

    const reactivateSubscription = useCallback(async (
        id: string,
        updates?: Partial<UpdatableFields>,
    ) => {
        try {
            await database.write(async () => {
                const sub = await database.get<Subscription>('subscriptions').find(id);
                await sub.update(s => {
                    s.status = 'active';
                    s.isPaid = false;
                    if (updates?.myShare !== undefined) s.myShare = updates.myShare;
                    // Apply other updates if needed
                });
                await database.get<SubscriptionEvent>('subscription_events').create(e => {
                    e.subscription.set(sub);
                    e.type = 'reactivated';
                    e.timestamp = Date.now();
                    e.details = 'Subscription reactivated';
                });
            });
        } catch (error) {
            console.error('Error reactivating subscription:', error);
        }
    }, []);

    // ── Payment Cycle ─────────────────────────────────────────────────

    const markAsPaid = useCallback(async (id: string) => {
        try {
            await database.write(async () => {
                const sub = await database.get<Subscription>('subscriptions').find(id);
                const transactionsCollection = database.get<Transaction>('transactions');

                await sub.update(s => {
                    s.isPaid = true;
                });

                // Create Transaction Record automatically
                const account = await sub.account.fetch();
                const category = await sub.category.fetch();

                if (account) {
                    await transactionsCollection.create(tx => {
                        tx.amount = sub.role === 'admin' ? sub.totalAmount : sub.myShare;
                        tx.note = `Subscription: ${sub.name}`;
                        tx.timestamp = Date.now();
                        tx.type = 'debit'; // Subscriptions are expenses (debit)
                        tx.isAuto = true;

                        tx.account.set(account);
                        if (category) tx.category.set(category);

                        // Update Account Balance
                        // Note: We are inside a write block, so we can update account too.
                        // However, logic might be better placed in a shared service if complex.
                        // For now, simple decrement.
                        // account.update is async, but we are in write block? 
                        // You can call update inside write.
                    });

                    // Update balance
                    await account.update(acc => {
                        acc.balance -= (sub.role === 'admin' ? sub.totalAmount : sub.myShare);
                    });
                }
            });
        } catch (error) {
            console.error('Error marking as paid:', error);
        }
    }, []);

    const markAsUnpaid = useCallback(async (id: string) => {
        try {
            await database.write(async () => {
                const sub = await database.get<Subscription>('subscriptions').find(id);
                await sub.update(s => {
                    s.isPaid = false;
                });
            });
        } catch (error) {
            console.error('Error marking as unpaid:', error);
        }
    }, []);

    const updateSplitMemberStatus = useCallback(async (
        subId: string,
        memberName: string,
        status: 'pending' | 'paid',
    ) => {
        try {
            await database.write(async () => {
                // Find the member record
                const membersCollection = database.get<SubscriptionMember>('subscription_members');
                const members = await membersCollection.query(
                    Q.where('subscription_id', subId),
                    Q.where('name', memberName)
                ).fetch();

                if (members.length > 0) {
                    await members[0].update(m => {
                        m.status = status;
                    });
                }
            });
        } catch (error) {
            console.error('Error updating member status:', error);
        }
    }, []);

    // ── Analytics ─────────────────────────────────────────────────────

    const getEventLog = useCallback((id: string): SubscriptionEventType[] => {
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
