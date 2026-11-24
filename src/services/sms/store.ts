import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import Transaction from '../../database/models/Transaction';
import UnparsedMessage from '../../database/models/UnparsedMessage';
import Account from '../../database/models/Account';
import Category from '../../database/models/Category';
import Subscription from '../../database/models/Subscription';
import { ParsedSms } from './types';
import { findLast4, findPayee, normalizeSender, prettyName } from './extract';
import { findRule, ruleAutoFiles, countMatch } from './rules';
import { getPrefs } from '../../context/PrefsContext';

const MINUTE = 60_000;

/** Keeps every SMS so unread formats can be reviewed or re-read by a model later. */
export async function saveRawSms(body: string, sender: string, receivedAt: number) {
    await database.write(async () => {
        const col = database.get<UnparsedMessage>('unparsed_messages');
        const existing = await col.query(Q.where('body', body), Q.where('timestamp', Q.gt(receivedAt - MINUTE))).fetchCount();
        if (existing > 0) return;
        await col.create((m) => {
            m.body = body;
            m.sender = sender;
            m.timestamp = receivedAt;
        });
    });
}

export interface Captured {
    id: string;
    amount: number;
    merchant: string;
    category: string;
    accountName: string;
    /** Filed by a rule without review. */
    autoFiled: boolean;
    ruleId?: string;
    planName?: string;
}

/** 'duplicate' = already in Sikka; null = nothing saved (no account yet). */
export type CaptureOutcome = Captured | 'duplicate' | null;

/** Picks the account the SMS is about: by last 4 digits, then by bank sender, then the first one. */
async function pickAccount(body: string, sender: string): Promise<Account | undefined> {
    const accounts = await database.get<Account>('accounts').query(Q.where('is_deleted', Q.notEq(true))).fetch();
    if (!accounts.length) return undefined;
    const last4 = findLast4(body);
    const code = normalizeSender(sender);
    return (
        (last4 && accounts.find((a) => a.last4 === last4)) ||
        accounts.find((a) => a.smsSender && a.smsSender === code) ||
        accounts.find((a) => a.type !== 'cash') ||
        accounts[0]
    );
}

async function findCategory(name: string): Promise<Category | undefined> {
    const cats = await database.get<Category>('categories').query(Q.where('name', Q.oneOf([cap(name), name, 'Other', 'other']))).fetch();
    return cats.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? cats[0];
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Saves a captured payment. Without a rule it waits for review (isAuto = true).
 * A taught rule names it; in "auto" mode it is filed straight away.
 * Debits that match a payment plan (SIP, EMI, subscription) are linked to it.
 * Amounts are signed like manual entries: spends negative, income positive.
 */
export async function saveCapturedTransaction(
    parsed: ParsedSms,
    sender: string,
    receivedAt: number,
    body = '',
): Promise<CaptureOutcome> {
    const signed = parsed.direction === 'debit' ? -parsed.amount : parsed.amount;
    const payee = findPayee(body, parsed.merchant);
    const prefs = await getPrefs();

    return database.write(async () => {
        const txCol = database.get<Transaction>('transactions');

        const duplicates = await txCol
            .query(Q.where('amount', signed), Q.where('timestamp', Q.between(receivedAt - MINUTE, receivedAt + MINUTE)))
            .fetch();
        if (duplicates.length > 0) {
            // A rescan can name a payee an older capture missed; fill it in while it's still in review.
            const stale = duplicates.find((t) => t.isAuto && !t.isDeleted && t.merchant === 'UNKNOWN');
            if (stale && parsed.merchant !== 'UNKNOWN') {
                const cat = await findCategory(parsed.category);
                await stale.update((t) => {
                    t.merchant = parsed.merchant;
                    if (cat) t.category.set(cat);
                });
            }
            return 'duplicate';
        }

        const rule = body ? await findRule(sender, body, payee) : undefined;
        let account = await pickAccount(body, sender);
        if (rule?.accountId) {
            try {
                account = await database.get<Account>('accounts').find(rule.accountId);
            } catch { /* the rule's account was removed; keep the SMS match */ }
        }
        if (!account) return null;

        // "Ask less": a payee approved before is named like last time (it still waits in Review).
        let known: Transaction | undefined;
        if (!rule && payee && prefs.sureness === 'less') {
            [known] = await txCol
                .query(Q.where('payee', payee), Q.where('is_auto', false), Q.where('is_deleted', Q.notEq(true)), Q.sortBy('timestamp', Q.desc), Q.take(1))
                .fetch();
        }
        // A raw UPI ID ("bluetokai@ybl") reads better as a name ("Bluetokai").
        const merchant = rule?.name ?? known?.merchant ?? (parsed.merchant.includes('@') ? prettyName(parsed.merchant) : parsed.merchant);
        let categoryName = rule?.category ?? parsed.category;
        if (!rule && known) {
            try {
                categoryName = (await known.category.fetch())?.name.toLowerCase() ?? categoryName;
            } catch { /* keep the parsed category */ }
        }
        const category = await findCategory(categoryName);
        const autoFiled = !!rule && ruleAutoFiles(rule, prefs.sureness);

        // A debit to a plan's payee is that plan's payment, not a new expense.
        let plan: Subscription | undefined;
        if (parsed.direction === 'debit') {
            const plans = await database.get<Subscription>('subscriptions').query(Q.where('status', 'active')).fetch();
            const hay = `${body} ${payee ?? ''}`.toLowerCase();
            plan = plans.find((p) => p.payeeMatch && hay.includes(p.payeeMatch.toLowerCase()));
        }

        const tx = await txCol.create((t) => {
            t.amount = signed;
            t.merchant = merchant;
            t.note = '';
            t.timestamp = receivedAt;
            t.type = parsed.direction;
            t.isAuto = !autoFiled;
            t.isDeleted = false;
            t.autoFiled = autoFiled;
            t.ruleId = rule?.id ?? null;
            t.smsSender = normalizeSender(sender);
            t.smsBody = body || null;
            t.payee = payee ?? null;
            t.readBy = rule ? 'rule' : parsed.source;
            t.planId = plan?.id ?? null;
            t.account.set(account!);
            if (category) t.category.set(category);
        });
        // Payments older than the account in Sikka are already in the balance the user
        // entered (First look imports 30 days of history), so only newer ones move it.
        if (receivedAt >= +account.createdAt) {
            await account.update((a) => {
                a.balance += a.type === 'credit' ? -signed : signed;
            });
        }
        if (rule) await countMatch(rule);
        if (plan) await plan.update((p) => { p.isPaid = true; });

        return {
            id: tx.id,
            amount: signed,
            merchant,
            category: categoryName,
            accountName: account.last4 ? `${account.name} ··${account.last4}` : account.name,
            autoFiled,
            ruleId: rule?.id,
            planName: plan?.name,
        };
    });
}
