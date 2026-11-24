/**
 * Payment alerts (v3 "Payment alert" and "Auto-filed alert" screens).
 *
 *  - Rule matched in auto mode → "Auto-filed" alert with Looks right / Change.
 *  - Otherwise, depending on Settings → Auto-capture → "When to remind me":
 *      right away → "Captured" alert with category buttons,
 *      at night   → one reminder at the nightly time,
 *      only in app → nothing.
 *  - "Quiet under ₹100": small payments never alert; they wait for review.
 *
 * Buttons open the app; App.tsx applies them (see handleNotificationAction).
 */
import { Platform } from 'react-native';
import type { Captured } from './sms/store';
import { getPrefs, Prefs } from '../context/PrefsContext';

type NotificationsModule = typeof import('expo-notifications');

let mod: NotificationsModule | null | undefined;
function N(): NotificationsModule | null {
    if (mod !== undefined) return mod;
    if (Platform.OS !== 'android') return (mod = null);
    try {
        mod = require('expo-notifications') as NotificationsModule;
    } catch {
        mod = null;
    }
    return mod;
}

export const CHANNEL = 'payments';
const NIGHTLY_ID = 'sikka-nightly-review';

/** Quick categories on the alert (design: Dining · Grocery · Travel · Shop). */
export const ALERT_CATEGORIES = [
    { id: 'dining', title: 'Dining' },
    { id: 'groceries', title: 'Grocery' },
    { id: 'transport', title: 'Travel' },
    { id: 'shopping', title: 'Shop' },
] as const;

let setUp = false;
export async function setUpNotifications() {
    const n = N();
    if (!n || setUp) return;
    setUp = true;
    n.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });
    await n.setNotificationChannelAsync(CHANNEL, {
        name: 'Payments',
        description: 'Payments Sikka read from your bank SMS',
        importance: n.AndroidImportance.DEFAULT,
    });
    // Android shows at most three buttons.
    await n.setNotificationCategoryAsync('captured', [
        ...ALERT_CATEGORIES.slice(0, 2).map((c) => ({ identifier: `cat:${c.id}`, buttonTitle: c.title })),
        { identifier: 'notmine', buttonTitle: 'Not mine' },
    ]);
    await n.setNotificationCategoryAsync('autofiled', [
        { identifier: 'ok', buttonTitle: 'Looks right', options: { opensAppToForeground: false } },
        { identifier: 'change', buttonTitle: 'Change' },
    ]);
}

export async function askNotificationPermission(): Promise<boolean> {
    const n = N();
    if (!n) return false;
    const current = await n.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await n.requestPermissionsAsync();
    return asked.granted;
}

const rupees = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Called by the SMS pipeline after a payment is saved. */
export async function notifyCaptured(c: Captured, prefs?: Prefs) {
    const n = N();
    if (!n) return;
    const p = prefs ?? (await getPrefs());
    try {
        await setUpNotifications();
        if (c.autoFiled) {
            await n.scheduleNotificationAsync({
                content: {
                    title: `Auto-filed · ${rupees(c.amount)} · ${c.merchant}`,
                    body: `${label(c.category)} · ${c.accountName}. Your rule. No review needed.`,
                    categoryIdentifier: 'autofiled',
                    data: { txId: c.id, kind: 'autofiled' },
                },
                trigger: { channelId: CHANNEL } as any,
            });
            return;
        }
        if (p.quietSmall && Math.abs(c.amount) < p.quietUnder) return;
        if (p.remindMode !== 'now') return;
        await n.scheduleNotificationAsync({
            content: {
                title: `Captured · ${c.merchant} · ${rupees(c.amount)}`,
                body: `${c.accountName}. What was it? Skipped? It waits in tonight's review.`,
                categoryIdentifier: 'captured',
                data: { txId: c.id, kind: 'captured' },
            },
            trigger: { channelId: CHANNEL } as any,
        });
    } catch (e) {
        console.warn('[Sikka] alert failed', e);
    }
}

/** One daily "review" reminder at the nightly time, or none. */
export async function scheduleNightlyReview(prefs?: Prefs) {
    const n = N();
    if (!n) return;
    const p = prefs ?? (await getPrefs());
    try {
        await n.cancelScheduledNotificationAsync(NIGHTLY_ID).catch(() => undefined);
        if (p.remindMode === 'app') return;
        const [hour, minute] = p.nightlyAt.split(':').map(Number);
        await n.scheduleNotificationAsync({
            identifier: NIGHTLY_ID,
            content: {
                title: 'Nightly review',
                body: 'A minute to approve today’s payments.',
                data: { kind: 'nightly' },
            },
            trigger: { type: n.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL } as any,
        });
    } catch (e) {
        console.warn('[Sikka] nightly reminder failed', e);
    }
}

function label(category: string) {
    const c = category.toLowerCase();
    const map: Record<string, string> = {
        dining: 'Dining', groceries: 'Groceries', transport: 'Travel', shopping: 'Shopping',
        entertainment: 'Fun', utilities: 'Bills', health: 'Health', income: 'Income', transfer: 'Transfer', other: 'Other',
    };
    return map[c] ?? category;
}

export interface NotificationAction {
    txId?: string;
    kind?: string;
    action: string;
}

/** Subscribes to taps on alerts. Returns an unsubscribe function. */
export function onNotificationAction(cb: (a: NotificationAction) => void): () => void {
    const n = N();
    if (!n) return () => undefined;
    const handle = (r: any) => {
        const data = r?.notification?.request?.content?.data ?? {};
        cb({ txId: data.txId, kind: data.kind, action: r.actionIdentifier });
    };
    n.getLastNotificationResponseAsync().then((r) => r && handle(r)).catch(() => undefined);
    const sub = n.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
}
