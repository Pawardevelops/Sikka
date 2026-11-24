/**
 * Small, exact readers for the parts of a bank SMS that patterns and models
 * don't return: which bank sent it, which account (last 4 digits), the raw
 * payee (UPI ID / shop) and the balance after the payment.
 */

/** DLT sender codes look like "VM-HDFCBK", "AD-ICICIB-S", "JM-KOTAKB". */
export function normalizeSender(sender: string | undefined | null): string {
    const s = (sender || '').toUpperCase().trim();
    const parts = s.split('-').filter(Boolean);
    if (parts.length >= 2 && parts[0].length <= 2) return parts[1];
    return parts[0] || s || 'UNKNOWN';
}

const BANKS: [RegExp, string][] = [
    [/HDFC/, 'HDFC'],
    [/ICICI/, 'ICICI'],
    [/SBI/, 'SBI'],
    [/AXIS/, 'Axis'],
    [/KOTAK/, 'Kotak'],
    [/IDFC/, 'IDFC FIRST'],
    [/YES/, 'Yes Bank'],
    [/PNB/, 'PNB'],
    [/BOI|BKID/, 'Bank of India'],
    [/CANB|CANARA/, 'Canara'],
    [/INDUS/, 'IndusInd'],
    [/AUBANK|AUSFB/, 'AU Bank'],
    [/FEDB|FEDERAL/, 'Federal'],
    [/UNION|UBOI/, 'Union Bank'],
    [/BOB|BARODA/, 'Bank of Baroda'],
    [/PAYTM/, 'Paytm Bank'],
    [/AIRTEL/, 'Airtel Bank'],
];

/** "HDFCBK" → "HDFC". Unknown senders keep their code. */
export function bankName(sender: string | undefined | null): string {
    const code = normalizeSender(sender);
    for (const [rx, name] of BANKS) if (rx.test(code)) return name;
    return code;
}

/** Banks Sikka reads without teaching (shown in Auto-capture settings). */
export const KNOWN_BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'IDFC FIRST'];

const LAST4 = /(?:a\/?c|acct|account|card|ac)\s*(?:no\.?|number|ending(?:\s*with)?|ending in)?\s*[:#]?\s*(?:[x*]+\s*)?(\d{4})\b/i;
const ENDING = /\bending\s*(?:with|in)?\s*[x*]*(\d{4})\b/i;

/** Last 4 digits of the account or card the SMS is about, if it says. */
export function findLast4(text: string): string | undefined {
    const m = text.match(LAST4) || text.match(ENDING);
    return m?.[1];
}

/** Card SMS vs bank account SMS. */
export function isCardSms(text: string): boolean {
    return /\bcredit\s*card\b|\bcard\s*(?:no\.?\s*)?(?:ending|xx|\*\*)|\bspent\b.*\bcard\b/i.test(text);
}

const BALANCE = /(?:avl|avbl|available|avail|clear|closing)\.?\s*(?:bal(?:ance)?|lmt|limit)\.?\s*(?:is|:)?\s*(?:rs\.?|inr|₹)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i;

/** Balance (or card limit left) after the payment, when the bank includes it. */
export function findBalance(text: string): number | undefined {
    const m = text.match(BALANCE);
    if (!m) return undefined;
    const n = parseFloat(m[1].replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
}

const UPI_ID = /\b([a-z0-9][a-z0-9._-]{1,60}@[a-z][a-z0-9]{1,20})\b/i;

/** Raw counterparty: the UPI ID if there is one, else the merchant text. */
export function findPayee(text: string, merchant?: string): string | undefined {
    const upi = text.match(UPI_ID);
    if (upi) return upi[1].toLowerCase();
    const m = (merchant || '').trim();
    return m && m !== 'UNKNOWN' ? m.toLowerCase() : undefined;
}

/**
 * What a rule matches on. For a UPI ID, the readable start ("blinkit.payu@hdfcbank"
 * → "blinkit"); otherwise the payee text itself.
 */
export function payeeKey(payee: string | undefined): string {
    const p = (payee || '').toLowerCase().trim();
    if (!p) return '';
    if (p.includes('@')) {
        const handle = p.split('@')[0];
        const word = handle.split(/[._-]/).find((w) => /[a-z]{3,}/.test(w));
        return word || handle;
    }
    return p.replace(/\s+/g, ' ');
}

/** A readable guess at a name from a payee ("blinkit.payu@hdfcbank" → "Blinkit"). */
export function prettyName(payeeOrMerchant: string | undefined): string {
    const key = payeeKey(payeeOrMerchant) || (payeeOrMerchant || '');
    const clean = key.replace(/[^a-z0-9 &]/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return 'Unknown';
    return clean
        .split(' ')
        .map((w) => (w.length <= 3 && /^[a-z]+$/i.test(w) && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join(' ');
}

export interface DetectedAccount {
    bank: string;
    sender: string;
    last4: string;
    kind: 'bank' | 'credit';
    /** Latest balance seen (bank) — undefined when the SMS never says. */
    balance?: number;
    /** Latest "available limit" seen (card). */
    availableLimit?: number;
    messages: number;
    lastSeen: number;
}

/** Groups bank SMS into the accounts they talk about: "HDFC ··7731", "ICICI card ··0441". */
export function detectAccounts(messages: { body: string; sender: string; timestamp: number }[]): DetectedAccount[] {
    const map = new Map<string, DetectedAccount>();
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    for (const m of sorted) {
        const last4 = findLast4(m.body);
        if (!last4) continue;
        if (!/(rs\.?|inr|₹)\s*[0-9]/i.test(m.body)) continue;
        const kind = isCardSms(m.body) ? 'credit' : 'bank';
        const key = `${normalizeSender(m.sender)}|${last4}`;
        const prev = map.get(key);
        const bal = findBalance(m.body);
        const acc: DetectedAccount = prev ?? {
            bank: bankName(m.sender),
            sender: normalizeSender(m.sender),
            last4,
            kind,
            messages: 0,
            lastSeen: m.timestamp,
        };
        acc.messages += 1;
        acc.lastSeen = m.timestamp;
        if (kind === 'credit') acc.kind = 'credit';
        if (bal !== undefined) {
            if (acc.kind === 'credit') acc.availableLimit = bal;
            else acc.balance = bal;
        }
        map.set(key, acc);
    }
    return [...map.values()].sort((a, b) => b.messages - a.messages);
}

/** "Mandate created / UPI AutoPay set up" notices — the start of a recurring payment. */
export function looksLikeMandate(text: string): boolean {
    return /\b(?:mandate|autopay|auto-?pay|e-?mandate|standing instruction|\bSI\b)\b/i.test(text)
        && /\b(?:created|registered|set ?up|successful|activated|approved)\b/i.test(text);
}

/** "will be debited on 25-11" pre-debit notices for an existing mandate. */
export function looksLikePreDebit(text: string): boolean {
    return /\bwill be (?:debited|charged|deducted|auto-?debited)\b/i.test(text);
}
