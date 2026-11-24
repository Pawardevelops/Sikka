/**
 * Sikka - small app preferences (v3 design).
 *
 * Kept in AsyncStorage so the headless SMS task can read them too
 * (quiet mode, reminder timing, how sure before auto-filing).
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AiMode = 'local' | 'none';
export type RemindMode = 'now' | 'night' | 'app';
export type Sureness = 'more' | 'balanced' | 'less';
export type VoiceScript = 'roman' | 'devanagari';

export interface Prefs {
    /** null until chosen in onboarding. */
    aiMode: AiMode | null;
    voiceNotes: boolean;
    voiceScript: VoiceScript;
    /** Spoken words that pick a category, e.g. dining: ['chai', 'zomato']. */
    voiceWords: Record<string, string[]>;
    quietSmall: boolean;
    quietUnder: number;
    remindMode: RemindMode;
    /** "HH:MM", 24h. */
    nightlyAt: string;
    sureness: Sureness;
    /** Seconds; 0 = lock every time the app is left. */
    lockAfter: number;
    /** Sikku suggests a spend limit after 30 days. */
    learnLimit: boolean;
    firstOpenedAt: number;
    backupNudgeDismissedAt: number | null;
    lastSyncAt: number | null;
    streak: { count: number; lastDay: string | null };
    firstLookSeen: boolean;
}

export const DEFAULT_PREFS: Prefs = {
    aiMode: null,
    voiceNotes: false,
    voiceScript: 'roman',
    voiceWords: {
        dining: ['chai', 'zomato', 'swiggy', 'khana'],
        transport: ['auto', 'uber', 'ola', 'petrol'],
        groceries: ['sabzi', 'doodh', 'blinkit', 'zepto'],
    },
    quietSmall: true,
    quietUnder: 100,
    remindMode: 'night',
    nightlyAt: '21:30',
    sureness: 'balanced',
    lockAfter: 0,
    learnLimit: false,
    firstOpenedAt: Date.now(),
    backupNudgeDismissedAt: null,
    lastSyncAt: null,
    streak: { count: 0, lastDay: null },
    firstLookSeen: false,
};

const KEY = 'sikka.prefs.v1';

/** For code outside React (headless SMS task, notifications). */
export async function getPrefs(): Promise<Prefs> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
        return DEFAULT_PREFS;
    }
}

export async function setPrefs(updates: Partial<Prefs>): Promise<Prefs> {
    const next = { ...(await getPrefs()), ...updates };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
}

/** Minimum confidence the rule/model needs to file a payment without review. */
export const SURENESS_THRESHOLD: Record<Sureness, number> = { more: 0.95, balanced: 0.85, less: 0.7 };

const todayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

interface PrefsContextType {
    prefs: Prefs;
    ready: boolean;
    update: (updates: Partial<Prefs>) => void;
    /** Call when the review deck is cleared. Counts consecutive days. */
    bumpStreak: () => void;
}

const PrefsContext = createContext<PrefsContextType | undefined>(undefined);

export function PrefsProvider({ children }: { children: ReactNode }) {
    const [prefs, setState] = useState<Prefs>(DEFAULT_PREFS);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        getPrefs().then(async (p) => {
            // First run: remember when, so the day-7 backup nudge can count.
            const stored = await AsyncStorage.getItem(KEY).catch(() => null);
            if (!stored) await setPrefs({ firstOpenedAt: Date.now() }).catch(() => undefined);
            setState(p);
            setReady(true);
        });
    }, []);

    const update = useCallback((updates: Partial<Prefs>) => {
        setState((prev) => {
            const next = { ...prev, ...updates };
            AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.warn('[Sikka] prefs not saved', e));
            return next;
        });
    }, []);

    const bumpStreak = useCallback(() => {
        setState((prev) => {
            const today = todayKey();
            if (prev.streak.lastDay === today) return prev;
            const y = new Date();
            y.setDate(y.getDate() - 1);
            const count = prev.streak.lastDay === todayKey(y) ? prev.streak.count + 1 : 1;
            const next = { ...prev, streak: { count, lastDay: today } };
            AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
            return next;
        });
    }, []);

    return <PrefsContext.Provider value={{ prefs, ready, update, bumpStreak }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
    const ctx = useContext(PrefsContext);
    if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
    return ctx;
}
