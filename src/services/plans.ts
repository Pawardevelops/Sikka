/**
 * Payment plans (v3 canvas section 06): SIPs, subscriptions, EMIs, insurance
 * and other autopays. Sikka keeps the record; the bank runs the mandate.
 *
 * Pure helpers: next due dates (bank holidays move a bank-autopay debit to
 * Monday), what's coming up, which account will be short, and what needs
 * attention (failed debit, price up, debited after stop, last EMIs).
 */
import { Account, Subscription, Transaction, PlanKind, PlanVia } from '../types';
import { findLast4, looksLikeMandate } from './sms/extract';

const DAY = 86_400_000;

export const KIND_LABEL: Record<PlanKind, string> = {
    sip: 'SIP',
    subscription: 'Subscription',
    emi: 'EMI',
    insurance: 'Insurance',
    autopay: 'Other autopay',
};

export const VIA_LABEL: Record<PlanVia, string> = {
    nach: 'Bank autopay (NACH)',
    upi_autopay: 'UPI AutoPay',
    card: 'Card autopay',
    manual: 'Paid by hand',
};

export const isLive = (p: Subscription) => p.status === 'active' && !p.stoppedAt;

const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

/** Bank autopays (NACH) don't run on Sundays; they move to Monday. */
function shiftForBank(date: Date, via?: PlanVia): { date: Date; moved: boolean } {
    if (via !== 'nach' || date.getDay() !== 0) return { date, moved: false };
    return { date: new Date(date.getTime() + DAY), moved: true };
}

/** Next debit on or after `from` (skips a pause). */
export function nextDue(p: Subscription, from = Date.now()): { date: Date; moved: boolean; scheduled: Date } | null {
    if (!isLive(p)) return null;
    const after = Math.max(startOfDay(from), p.pausedUntil ? startOfDay(p.pausedUntil) : 0);
    const base = new Date(after);
    const day = Math.min(Math.max(1, p.dueDate || 1), 28);
    let scheduled: Date;
    if (p.billingCycle === 'yearly') {
        const month = p.startDate ? new Date(p.startDate).getMonth() : base.getMonth();
        scheduled = new Date(base.getFullYear(), month, day);
        if (scheduled.getTime() < after) scheduled = new Date(base.getFullYear() + 1, month, day);
    } else {
        scheduled = new Date(base.getFullYear(), base.getMonth(), day);
        if (scheduled.getTime() < after) scheduled = new Date(base.getFullYear(), base.getMonth() + 1, day);
    }
    if (p.endDate && scheduled.getTime() > p.endDate) return null;
    const { date, moved } = shiftForBank(scheduled, p.via);
    return { date, moved, scheduled };
}

/** Monthly cost: yearly plans count a twelfth. Card autopay is listed separately (it varies). */
export const monthlyCost = (p: Subscription) => (p.billingCycle === 'yearly' ? p.amount / 12 : p.amount);

export interface Upcoming {
    plan?: Subscription;
    card?: Account;
    date: Date;
    moved: boolean;
    amount: number;
    accountId?: string;
}

/** Everything due in the next `days`, plus credit-card bills, sorted by date. */
export function upcoming(plans: Subscription[], accounts: Account[], days = 14, from = Date.now()): Upcoming[] {
    const until = startOfDay(from) + days * DAY;
    const out: Upcoming[] = [];
    for (const p of plans) {
        const n = nextDue(p, from);
        if (n && n.date.getTime() < until) out.push({ plan: p, date: n.date, moved: n.moved, amount: p.amount, accountId: p.paymentSourceId });
    }
    for (const a of accounts) {
        const due = a.creditCardDetails?.dueDate;
        if (a.type !== 'credit' || !due || a.balance === 0) continue;
        const base = new Date(from);
        let d = new Date(base.getFullYear(), base.getMonth(), due);
        if (d.getTime() < startOfDay(from)) d = new Date(base.getFullYear(), base.getMonth() + 1, due);
        if (d.getTime() < until) out.push({ card: a, date: d, moved: false, amount: Math.abs(a.balance) });
    }
    return out.sort((x, y) => x.date.getTime() - y.date.getTime());
}

/** Accounts that won't cover what is due from them before `until`. */
export function shortfalls(items: Upcoming[], accounts: Account[]): Record<string, { short: number; due: number; balance: number; by: Date }> {
    const res: Record<string, { short: number; due: number; balance: number; by: Date }> = {};
    const byAcc: Record<string, Upcoming[]> = {};
    items.filter((u) => u.accountId).forEach((u) => (byAcc[u.accountId!] ??= []).push(u));
    for (const [id, list] of Object.entries(byAcc)) {
        const acc = accounts.find((a) => a.id === id);
        if (!acc || acc.type === 'credit') continue;
        let running = 0;
        for (const u of list) {
            running += u.amount;
            if (running > acc.balance) {
                res[id] = { short: running - acc.balance, due: running, balance: acc.balance, by: u.date };
                break;
            }
        }
    }
    return res;
}

export type IssueKind = 'failed' | 'price' | 'afterStop' | 'ending';
export interface Issue {
    kind: IssueKind;
    plan: Subscription;
    text: string;
    amount?: number;
    at?: number;
}

const FAILED = /\b(bounced|failed|unsuccessful|declined|insufficient|not\s+processed|returned)\b/i;

/** What needs a look: a bounced debit, a higher price, a debit after you stopped it, the last EMIs. */
export function findIssues(
    plans: Subscription[],
    txs: Transaction[],
    messages: { body: string; timestamp: number }[],
    accounts: Account[],
): Issue[] {
    const out: Issue[] = [];
    const since = Date.now() - 45 * DAY;
    for (const p of plans) {
        if (p.status === 'archived') continue;
        const key = (p.payeeMatch || p.name).toLowerCase();
        const linked = txs.filter((t) => !t.isDeleted && (t.planId === p.id || (`${t.smsBody ?? ''} ${t.payee ?? ''}`.toLowerCase().includes(key) && t.amount < 0)));
        const last = [...linked].sort((a, b) => b.timestamp - a.timestamp)[0];

        const failed = messages.find((m) => m.timestamp > since && FAILED.test(m.body) && m.body.toLowerCase().includes(key));
        if (failed && (!last || last.timestamp < failed.timestamp)) {
            const l4 = findLast4(failed.body);
            const acc = accounts.find((a) => a.last4 && a.last4 === l4);
            out.push({
                kind: 'failed',
                plan: p,
                at: failed.timestamp,
                text: `Bounced on ${new Date(failed.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${/insufficient|low balance/i.test(failed.body) ? ': low balance' : ''}${acc ? ` in ${acc.name} ··${acc.last4}` : ''}. ${p.kind === 'sip' ? 'Your fund may retry next month.' : 'It may be tried again.'}`,
            });
        }
        if (p.stoppedAt && last && last.timestamp > p.stoppedAt) {
            out.push({
                kind: 'afterStop',
                plan: p,
                amount: Math.abs(last.amount),
                at: last.timestamp,
                text: `You stopped this on ${new Date(p.stoppedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, but ₹${Math.abs(last.amount).toLocaleString('en-IN')} was debited on ${new Date(last.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. The mandate may still be active.`,
            });
        } else if (!p.amountVaries && last && Math.abs(last.amount) > p.amount + 0.5 && last.timestamp > since) {
            out.push({
                kind: 'price',
                plan: p,
                amount: Math.abs(last.amount),
                text: 'Sikka saw a bigger debit than your plan. Update the plan so next month’s total is right.',
            });
        }
        if (p.kind === 'emi' && p.paymentsLeft !== undefined && p.paymentsLeft > 0 && p.paymentsLeft <= 2 && isLive(p)) {
            const n = nextDue(p);
            out.push({
                kind: 'ending',
                plan: p,
                text: `${p.paymentsLeft === 1 ? 'Last EMI' : '2 EMIs left; the last one is'} on ${n ? n.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'its due date'}. After that Sikka marks it done and frees ₹${p.amount.toLocaleString('en-IN')}/month.`,
            });
        }
    }
    return out;
}

export interface FoundMandate {
    messageId: string;
    body: string;
    name: string;
    amount: number;
    cycle: 'monthly' | 'yearly';
    via: PlanVia;
    last4?: string;
    at: number;
}

/** "Your UPI AutoPay mandate for NETFLIX of Rs.649.00 monthly is created" → a plan to add. */
export function readMandate(m: { id: string; body: string; timestamp: number }): FoundMandate | null {
    if (!looksLikeMandate(m.body)) return null;
    const name = m.body.match(/\b(?:mandate|autopay|e-?mandate|SI)\b.*?\bfor\s+([A-Za-z][A-Za-z0-9 &.'-]{1,40}?)\s+(?:of|for|rs|inr|₹)/i)?.[1]
        ?? m.body.match(/\bto\s+([A-Za-z][A-Za-z0-9 &.'-]{1,40}?)\s+(?:of|for|rs|inr|₹)/i)?.[1];
    const amount = parseFloat((m.body.match(/(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i)?.[1] ?? '').replace(/,/g, ''));
    if (!name || !Number.isFinite(amount) || amount <= 0) return null;
    return {
        messageId: m.id,
        body: m.body,
        name: name.trim().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w+/g, (w) => w.toLowerCase()),
        amount,
        cycle: /year|annual/i.test(m.body) ? 'yearly' : 'monthly',
        via: /upi/i.test(m.body) ? 'upi_autopay' : /card/i.test(m.body) ? 'card' : 'nach',
        last4: findLast4(m.body),
        at: m.timestamp,
    };
}

/** Mandate SMS for plans the user doesn't have yet. */
export function findNewMandates(messages: { id: string; body: string; timestamp: number }[], plans: Subscription[], dismissed: Set<string>): FoundMandate[] {
    const names = new Set(plans.map((p) => p.name.toLowerCase()));
    const out: FoundMandate[] = [];
    for (const m of messages) {
        if (dismissed.has(m.id)) continue;
        const f = readMandate(m);
        if (f && !names.has(f.name.toLowerCase()) && !out.some((x) => x.name === f.name)) out.push(f);
    }
    return out;
}

/** Past debits that look like this plan's (same payee, same amount ± ₹1). */
export function pastDebitsFor(name: string, amount: number, txs: Transaction[]): Transaction[] {
    const key = name.toLowerCase().split(' ')[0];
    return txs.filter(
        (t) => !t.isDeleted && !t.planId && t.amount < 0 && Math.abs(Math.abs(t.amount) - amount) <= 1 &&
            `${t.merchant} ${t.smsBody ?? ''} ${t.payee ?? ''}`.toLowerCase().includes(key),
    );
}

/** Common bank / fund apps for "Open … app ↗" (Sikka can't stop a mandate itself). */
export const BANK_APPS: Record<string, { name: string; url: string; store: string }> = {
    HDFC: { name: 'HDFC', url: 'hdfcbank://', store: 'https://play.google.com/store/apps/details?id=com.snapwork.hdfc' },
    ICICI: { name: 'iMobile', url: 'imobile://', store: 'https://play.google.com/store/apps/details?id=com.csam.icici.bank.imobile' },
    SBI: { name: 'YONO', url: 'yonosbi://', store: 'https://play.google.com/store/apps/details?id=com.sbi.lotusintouch' },
    Axis: { name: 'Axis Mobile', url: 'axismobile://', store: 'https://play.google.com/store/apps/details?id=com.axis.mobile' },
    Kotak: { name: 'Kotak', url: 'kotakbank://', store: 'https://play.google.com/store/apps/details?id=com.msf.kbank.mobile' },
};
