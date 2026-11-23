/**
 * SMS capture pipeline.
 *
 *   SMS arrives (native SmsReceiver → headless task `smsHandler`)
 *     1. keep the raw message
 *     2. known bank format?  → patterns read it → saved for review
 *     3. otherwise it waits; when the app is next opened `processQueuedSms`
 *        hands bank-looking messages to the user's downloaded model, if any.
 *
 * Models never run in the headless task: loading hundreds of MB while the app
 * is closed is slow and Android may kill it midway.
 */
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import UnparsedMessage from '../../database/models/UnparsedMessage';
import { IncomingSms } from './types';
import { parseWithPatterns, looksFinancial } from './patterns';
import { saveRawSms, saveCapturedTransaction } from './store';
import { getActiveModel } from './modelManager';
import { parseWithModel } from './aiParser';

export type { IncomingSms } from './types';

const CURSOR_KEY = 'sikka.smsModel.cursor';
const LOOKBACK_MS = 30 * 86_400_000;

/** Headless JS task fed by the native SmsReceiver. Runs even when the app is closed. */
export async function smsHandler({ sender, body, timestamp }: IncomingSms) {
    const text = body?.trim();
    if (!text) return;
    const from = sender || 'Unknown';
    const receivedAt = timestamp || Date.now();

    try {
        await saveRawSms(text, from, receivedAt);
        const parsed = parseWithPatterns(text);
        if (parsed) await saveCapturedTransaction(parsed, from, receivedAt);
    } catch (e) {
        console.error('[Sikka] SMS capture failed:', e);
    }
}

let processing: Promise<number> | null = null;

/**
 * Reads queued bank SMS with the downloaded model (if one is active).
 * Safe to call often; concurrent calls share one run. Returns how many
 * payments were captured.
 */
export function processQueuedSms(ownerName?: string, since?: number, until?: number): Promise<number> {
    // A plain run can share an in-flight one; a ranged run (inbox scan) waits for it, then runs its own window.
    if (processing && since === undefined) return processing;
    const prev = processing ?? Promise.resolve(0);
    const next = prev.catch(() => 0).then(() => run(ownerName, since, until));
    processing = next;
    return next.finally(() => {
        if (processing === next) {
            processing = null;
        }
    });
}

async function run(ownerName?: string, fromMs?: number, untilMs?: number): Promise<number> {
    const model = await getActiveModel();
    if (!model) return 0;

    const cursor = Number(await AsyncStorage.getItem(CURSOR_KEY)) || 0;
    // An explicit window (inbox scan) re-reads older messages; normal runs resume at the cursor.
    const since = fromMs !== undefined ? fromMs - 1 : Math.max(cursor, Date.now() - LOOKBACK_MS);
    const queued = await database
        .get<UnparsedMessage>('unparsed_messages')
        .query(
            Q.where('timestamp', Q.gt(since)),
            ...(untilMs !== undefined ? [Q.where('timestamp', Q.lte(untilMs))] : []),
            Q.sortBy('timestamp', Q.asc),
        )
        .fetch();

    let captured = 0;
    for (const msg of queued) {
        const text = msg.body;
        // Pattern-readable messages were already saved by the headless task.
        if (looksFinancial(text) && !parseWithPatterns(text)) {
            try {
                const out = await parseWithModel(model, { body: text, sender: msg.sender, ownerName });
                if (out && out !== 'skip' && (await saveCapturedTransaction(out, msg.sender, msg.timestamp))) captured++;
            } catch (e) {
                console.warn('[Sikka] Model could not read SMS:', e);
                break; // Leave the rest queued; retry on next open.
            }
        }
        if (msg.timestamp > cursor) await AsyncStorage.setItem(CURSOR_KEY, String(msg.timestamp));
    }
    return captured;
}

export interface InboxScanResult {
    /** SMS found in the inbox for the window. */
    scanned: number;
    /** New payments added to Review (already-captured ones are skipped). */
    captured: number;
    /** Bank-looking SMS nobody could read (no model, or the model passed). */
    unread: number;
}

/**
 * Re-reads SMS received between `sinceMs` and `untilMs` and captures any payments
 * that were missed. Needs READ_SMS. Safe to run repeatedly: duplicates are skipped.
 */
export async function scanInbox(sinceMs: number, untilMs: number, ownerName?: string): Promise<InboxScanResult> {
    if (Platform.OS !== 'android' || !NativeModules.SikkaSmsInbox) return { scanned: 0, captured: 0, unread: 0 };
    const all: IncomingSms[] = await NativeModules.SikkaSmsInbox.readSince(sinceMs, 2000);
    const inbox = all.filter((m) => (m.timestamp ?? 0) <= untilMs);

    let captured = 0;
    let leftForModel = 0;
    for (const sms of inbox) {
        const text = sms.body?.trim();
        if (!text) continue;
        const from = sms.sender || 'Unknown';
        const at = sms.timestamp || Date.now();
        await saveRawSms(text, from, at);
        const parsed = parseWithPatterns(text);
        if (parsed) {
            if (await saveCapturedTransaction(parsed, from, at)) captured++;
        } else if (looksFinancial(text)) {
            leftForModel++;
        }
    }

    const byModel = leftForModel > 0 ? await processQueuedSms(ownerName, sinceMs, untilMs).catch(() => 0) : 0;
    const hasModel = !!(await getActiveModel());
    console.log(`[Sikka] Inbox scan: ${inbox.length} SMS, ${captured} by patterns, ${byModel} by model, ${leftForModel} needed a model`);
    return {
        scanned: inbox.length,
        captured: captured + byModel,
        unread: hasModel ? Math.max(0, leftForModel - byModel) : leftForModel,
    };
}

/** Unread queue size, for the Settings screen. */
export async function countQueuedSms(): Promise<number> {
    const cursor = Number(await AsyncStorage.getItem(CURSOR_KEY)) || 0;
    const since = Math.max(cursor, Date.now() - LOOKBACK_MS);
    const msgs = await database.get<UnparsedMessage>('unparsed_messages').query(Q.where('timestamp', Q.gt(since))).fetch();
    return msgs.filter((m) => looksFinancial(m.body) && !parseWithPatterns(m.body)).length;
}
