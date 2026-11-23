/**
 * Fast, exact parsing for bank SMS formats we know. Anything these miss can be
 * handed to an on-device model (see models.ts).
 */
import { TransactionCategory } from '../../types';
import { ParsedSms } from './types';

interface BankPattern {
    name: string;
    regex: RegExp;
    direction: 'debit' | 'credit';
    /** Capture-group indexes. Without `merchant`, it is looked up with MERCHANT_HINT. */
    amount: number;
    merchant?: number;
}

const AMT = String.raw`([0-9][0-9,]*(?:\.[0-9]+)?)`;
const CUR = String.raw`(?:rs\.?|inr|₹)\s*`;
const rx = (source: string) => new RegExp(source, 'i');

const BANK_PATTERNS: BankPattern[] = [
    // HDFC: Rs 500.00 debited from a/c **1234 to ZOMATO on 20-10-23
    { name: 'HDFC', regex: /rs\.?\s*([0-9,.]+)\s*debited\s*from\s*a\/c\s*\**([0-9]+)\s*to\s*(.+?)\s*on/i, direction: 'debit', amount: 1, merchant: 3 },
    // HDFC: Rs 5000.00 credited to a/c **1234 on 20-10-23 by UPI
    { name: 'HDFC_CREDIT', regex: /rs\.?\s*([0-9,.]+)\s*credited\s*to\s*a\/c\s*\**([0-9]+)\s*on\s*(.+?)\s*by/i, direction: 'credit', amount: 1 },
    // SBI: Rs 100.00 debited from a/c ending 1234 on 20-Oct-23 to GOOGLE PAY
    { name: 'SBI', regex: /rs\.?\s*([0-9,.]+)\s*debited\s*from\s*.*?ending\s*([0-9]+)\s*on\s*.*?\s*to\s*(.+?)(?:\s*Ref|$)/i, direction: 'debit', amount: 1, merchant: 3 },
    // ICICI: Acct XX1234 debited with INR 500.00 on 14-Oct. Info: SWIGGY. Avlbl Bal...
    { name: 'ICICI', regex: /acct\s*XX([0-9]+)\s*debited\s*with\s*inr\s*([0-9,.]+)\s*on\s*.*?\.\s*info:\s*(.+?)\./i, direction: 'debit', amount: 2, merchant: 3 },
    // Generic UPI: Paid Rs 250.00 to PAYTM
    { name: 'UPI', regex: /paid\s*rs\.?\s*([0-9,.]+)\s*to\s*(.+?)(?:\s*from|\s*using|$)/i, direction: 'debit', amount: 1, merchant: 2 },
    // Card spends: Rs.226.00 spent on your SBI Credit Card ending 0827 at ZEPTO on 23/11/26
    { name: 'CARD_SPENT', regex: rx(String.raw`${CUR}${AMT}\s*(?:was\s*)?spent\b.*?\bat\s+(.+?)(?:\s+on\s|\.\s|$)`), direction: 'debit', amount: 1, merchant: 2 },
    // IDFC UPI: Your A/c XX6680 debited by Rs. 183.00 on 22/11/26; Swiggy Ltd credited. RRN ...
    { name: 'DEBITED_PAYEE', regex: rx(String.raw`debited\s*(?:with|by|for)?\s*${CUR}${AMT}[^;]*;\s*(.+?)\s+credited\b`), direction: 'debit', amount: 1, merchant: 2 },
    // ... credited by Rs. 500.00 on ...; RAHUL debited.
    { name: 'CREDITED_PAYER', regex: rx(String.raw`credited\s*(?:with|by|for)?\s*${CUR}${AMT}[^;]*;\s*(.+?)\s+debited\b`), direction: 'credit', amount: 1, merchant: 2 },
    // Generic: ... credited with INR 27,135.00 on ... / ... debited by Rs 500 ...
    { name: 'CREDITED', regex: rx(String.raw`credited\s*(?:with|by|for)?\s*${CUR}${AMT}`), direction: 'credit', amount: 1 },
    { name: 'DEBITED', regex: rx(String.raw`debited\s*(?:with|by|for)?\s*${CUR}${AMT}`), direction: 'debit', amount: 1 },
    // Generic: INR 500.00 credited/debited to/from ...
    { name: 'AMOUNT_CREDITED', regex: rx(String.raw`${CUR}${AMT}\s*(?:has been\s*|is\s*)?credited`), direction: 'credit', amount: 1 },
    { name: 'AMOUNT_DEBITED', regex: rx(String.raw`${CUR}${AMT}\s*(?:has been\s*|is\s*)?(?:debited|withdrawn|deducted)`), direction: 'debit', amount: 1 },
];

/**
 * Notices about money that hasn't moved yet: mandates/autopay "will be debited",
 * bill due reminders, payment requests. These are not transactions.
 */
const NOT_YET = /\bwill be (?:debited|charged|deducted|auto-?debited)\b|\bis due\b|\bdue (?:on|by|date)\b|\breminder\b|\bhas requested\b|\brequested money\b|\bcollect request\b/i;

/** Finds a counterparty in free text: "at ZEPTO", "to Rahul", "by NEFT-ACME", "Info: SWIGGY". */
const MERCHANT_HINT = /(?:\bat|\bto|\btowards|\bfrom|\bby|\bInfo:?|\bVPA)\s+([A-Za-z][A-Za-z0-9&@.*_\- ]{1,40}?)(?=\s+on\b|\s+ref\b|\s+avl\b|\s+upi\b|[.,;:(]|\s*$)/gi;
const NOT_MERCHANT = /^(your|the|a\/?c|acct|account|card|ending|xx|rs|inr|you)\b/i;

/** First plausible counterparty named in the text, or '' when there is none. */
function findMerchant(text: string): string {
    for (const m of text.matchAll(MERCHANT_HINT)) {
        const name = m[1].trim().replace(/^VPA\s+/i, '');
        if (name && !NOT_MERCHANT.test(name) && !/\d{3,}/.test(name)) return name;
    }
    return '';
}

export const cleanAmount = (s: string) => parseFloat(s.replace(/,/g, ''));

export const cleanMerchant = (s: string) =>
    s.trim().toUpperCase().replace('UPI', '').replace('REF', '').trim() || 'UNKNOWN';

export function categorize(merchant: string): TransactionCategory {
    const m = merchant.toLowerCase();
    if (/zomato|swiggy|food|pizza|burger|cafe|restaurant/.test(m)) return 'dining';
    if (/uber|ola\b|rapido|petrol|fuel|metro|irctc/.test(m)) return 'transport';
    if (/mart|grocery|blinkit|zepto|bigbasket|instamart/.test(m)) return 'groceries';
    if (/netflix|prime|hotstar|spotify|movie|bookmyshow/.test(m)) return 'entertainment';
    if (/pharmacy|med|hospital|apollo|clinic/.test(m)) return 'health';
    if (/amazon|flipkart|myntra|ajio|meesho/.test(m)) return 'shopping';
    if (/electricity|broadband|airtel|jio|vodafone|recharge|gas/.test(m)) return 'utilities';
    if (/salary/.test(m)) return 'income';
    return 'other';
}

/** Money in is income unless the merchant names a known category (e.g. a refund). */
export function creditCategory(direction: 'debit' | 'credit', merchant: string): TransactionCategory {
    const c = categorize(merchant);
    return direction === 'credit' && c === 'other' ? 'income' : c;
}

export function parseWithPatterns(text: string): ParsedSms | null {
    if (NOT_YET.test(text)) return null;
    for (const p of BANK_PATTERNS) {
        const match = text.match(p.regex);
        if (!match) continue;
        const amount = cleanAmount(match[p.amount] ?? '');
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const merchant = cleanMerchant(p.merchant === undefined ? findMerchant(text) : (match[p.merchant] ?? ''));
        return {
            direction: p.direction,
            amount,
            merchant,
            category: creditCategory(p.direction, merchant),
            source: p.name,
        };
    }
    return null;
}

/** Cheap pre-filter: is this worth sending to a model at all? */
export function looksFinancial(text: string): boolean {
    const t = text.toLowerCase();
    if (/\botp\b|one time password|verification code/.test(t) || NOT_YET.test(text)) return false;
    const money = /(rs\.?|inr|₹)\s*[0-9]/.test(t);
    const verb = /debit|credit|spent|paid|sent|received|withdrawn|transferred|purchase|txn|transaction/.test(t);
    return money && verb;
}

/** A model must not invent amounts: the value has to appear in the SMS text. */
export function amountAppearsIn(text: string, amount: number): boolean {
    const digits = text.replace(/,/g, '');
    const found = digits.match(/[0-9]+(?:\.[0-9]+)?/g) ?? [];
    return found.some((n) => Math.abs(parseFloat(n) - amount) < 0.005);
}
