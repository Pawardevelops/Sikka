/**
 * "Teach a message": the user taps the amount and the payee in an SMS Sikka
 * couldn't read. Sikka turns that message into a format (a pattern) and reads
 * every SMS like it from then on — on the phone, no model needed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLearnedPatterns } from './patterns';
import { normalizeSender } from './extract';

const KEY = 'sikka.learnedFormats.v1';
const IGNORED_KEY = 'sikka.ignoredSms.v1';

export interface LearnedFormat {
    name: string;
    sender: string;
    source: string;
    direction: 'debit' | 'credit';
    /** Capture group of the amount (1 or 2); the payee is the other one. */
    amountGroup: 1 | 2;
    createdAt: number;
}

export async function loadLearnedFormats(): Promise<LearnedFormat[]> {
    try {
        const list: LearnedFormat[] = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
        setLearnedPatterns(list);
        return list;
    } catch {
        return [];
    }
}

export async function saveLearnedFormat(f: Omit<LearnedFormat, 'createdAt' | 'name'>): Promise<LearnedFormat> {
    const list = await loadLearnedFormats();
    const format: LearnedFormat = { ...f, name: `TAUGHT_${normalizeSender(f.sender)}_${list.length + 1}`, createdAt: Date.now() };
    const next = [...list.filter((x) => x.source !== f.source), format];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    setLearnedPatterns(next);
    return format;
}

/** Messages the user said are "Not a payment". */
export async function ignoredSmsIds(): Promise<Set<string>> {
    try {
        return new Set(JSON.parse((await AsyncStorage.getItem(IGNORED_KEY)) || '[]'));
    } catch {
        return new Set();
    }
}

export async function ignoreSms(id: string) {
    const ids = await ignoredSmsIds();
    ids.add(id);
    await AsyncStorage.setItem(IGNORED_KEY, JSON.stringify([...ids].slice(-500)));
}

export type TokenRole = 'amount' | 'payee' | 'date';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Splits an SMS into tappable words. */
export const tokenize = (body: string) => body.split(/\s+/).filter(Boolean);

/**
 * Builds the format from the tapped words. Words with digits match any value,
 * the amount and payee become captures, and everything after the last tapped
 * word is free (reference numbers, balances).
 */
export function buildFormat(tokens: string[], roles: Record<number, TokenRole>): { source: string; amountGroup: 1 | 2 } | null {
    const amountIdx = Object.keys(roles).map(Number).filter((i) => roles[i] === 'amount');
    const payeeIdx = Object.keys(roles).map(Number).filter((i) => roles[i] === 'payee').sort((a, b) => a - b);
    if (amountIdx.length !== 1 || !payeeIdx.length) return null;
    const last = Math.max(...Object.keys(roles).map(Number));
    const parts: string[] = [];
    let i = 0;
    while (i <= last) {
        const role = roles[i];
        if (role === 'amount') {
            // Keep a currency prefix glued to the number ("Rs.1,499.00", "INR899").
            const m = tokens[i].match(/^(\D*?)([0-9][0-9,]*(?:\.[0-9]+)?)(\D*)$/);
            const pre = m ? m[1] : '';
            parts.push(`${esc(pre)}([0-9][0-9,]*(?:\\.[0-9]+)?)${m && m[3] ? esc(m[3]) : ''}`);
            i++;
        } else if (role === 'payee') {
            parts.push('(.+?)');
            while (roles[i] === 'payee') i++;
        } else if (role === 'date' || /\d/.test(tokens[i])) {
            parts.push('\\S+');
            i++;
        } else {
            parts.push(esc(tokens[i]));
            i++;
        }
    }
    // The payee capture needs something after it to stop at.
    const tail = last < tokens.length - 1 ? `\\s+${esc(tokens[last + 1].replace(/\d.*/, ''))}` : '\\s*$';
    const source = parts.join('\\s+') + (roles[last] === 'payee' ? tail : '');
    return { source, amountGroup: amountIdx[0] < payeeIdx[0] ? 1 : 2 };
}

