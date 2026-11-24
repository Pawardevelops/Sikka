/**
 * Teach once: when the user names a sender in review, Sikka saves a rule.
 * The next SMS from the same bank to the same payee is named, categorised and
 * (in "auto" mode) filed without review.
 */
import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import SmsRule from '../../database/models/SmsRule';
import Transaction from '../../database/models/Transaction';
import Category from '../../database/models/Category';
import { normalizeSender, payeeKey } from './extract';
import type { Sureness } from '../../context/PrefsContext';

export interface RuleData {
    id: string;
    sender: string;
    payeeMatch: string;
    name: string;
    category: string;
    accountId?: string;
    mode: 'auto' | 'ask';
    matchCount: number;
    lastMatchedAt?: number;
    createdAt: number;
}

export const toRuleData = (r: SmsRule): RuleData => ({
    id: r.id,
    sender: r.sender,
    payeeMatch: r.payeeMatch,
    name: r.name,
    category: r.category,
    accountId: r.accountId ?? undefined,
    mode: r.mode,
    matchCount: r.matchCount,
    lastMatchedAt: r.lastMatchedAt ? +r.lastMatchedAt : undefined,
    createdAt: +r.createdAt,
});

/** The rule for this SMS, if one was taught. Longest payee match wins. */
export async function findRule(sender: string, body: string, payee?: string): Promise<SmsRule | undefined> {
    const code = normalizeSender(sender);
    const rules = await database.get<SmsRule>('sms_rules').query(Q.where('sender', code)).fetch();
    const hay = `${body} ${payee ?? ''}`.toLowerCase();
    return rules
        .filter((r) => r.payeeMatch && hay.includes(r.payeeMatch))
        .sort((a, b) => b.payeeMatch.length - a.payeeMatch.length)[0];
}

/** Should a rule match file the payment without review, given how sure the user wants Sikka to be? */
export function ruleAutoFiles(rule: SmsRule | RuleData, sureness: Sureness): boolean {
    if (rule.mode !== 'auto') return false;
    // "Ask more": a rule must have been right a few times before it files alone.
    if (sureness === 'more') return rule.matchCount >= 3;
    return true;
}

export async function getRule(id: string): Promise<SmsRule | undefined> {
    try {
        return await database.get<SmsRule>('sms_rules').find(id);
    } catch {
        return undefined;
    }
}

/** Creates (or replaces) the rule for this sender + payee. */
export async function saveRule(input: {
    sender: string;
    payee: string;
    name: string;
    category: string;
    accountId?: string;
    mode: 'auto' | 'ask';
}): Promise<SmsRule> {
    const sender = normalizeSender(input.sender);
    const match = payeeKey(input.payee) || input.name.toLowerCase();
    return database.write(async () => {
        const col = database.get<SmsRule>('sms_rules');
        const [existing] = await col.query(Q.where('sender', sender), Q.where('payee_match', match)).fetch();
        if (existing) {
            await existing.update((r) => {
                r.name = input.name;
                r.category = input.category;
                r.accountId = input.accountId ?? null;
                r.mode = input.mode;
            });
            return existing;
        }
        return col.create((r) => {
            r.sender = sender;
            r.payeeMatch = match;
            r.name = input.name;
            r.category = input.category;
            r.accountId = input.accountId ?? null;
            r.mode = input.mode;
            r.matchCount = 1;
            r.lastMatchedAt = Date.now();
        });
    });
}

export async function updateRule(id: string, updates: Partial<Pick<RuleData, 'name' | 'category' | 'mode' | 'accountId'>>) {
    await database.write(async () => {
        const rule = await database.get<SmsRule>('sms_rules').find(id);
        await rule.update((r) => {
            if (updates.name !== undefined) r.name = updates.name;
            if (updates.category !== undefined) r.category = updates.category;
            if (updates.mode !== undefined) r.mode = updates.mode;
            if (updates.accountId !== undefined) r.accountId = updates.accountId ?? null;
        });
    });
}

/** Deletes the rule. Its payments keep their names; new SMS go back to review. */
export async function deleteRule(id: string) {
    await database.write(async () => {
        const rule = await database.get<SmsRule>('sms_rules').find(id);
        const txs = await database.get<Transaction>('transactions').query(Q.where('rule_id', id)).fetch();
        for (const t of txs) await t.update((x) => { x.ruleId = null; });
        await rule.destroyPermanently();
    });
}

/** Payments (other than `exceptTxId`) a rule would also match: same bank, same payee. */
export async function pastMatches(rule: RuleData, exceptTxId?: string): Promise<Transaction[]> {
    const txs = await database
        .get<Transaction>('transactions')
        .query(Q.where('sms_sender', rule.sender), Q.where('is_deleted', Q.notEq(true)))
        .fetch();
    return txs.filter((t) => t.id !== exceptTxId && `${t.smsBody ?? ''} ${t.payee ?? ''}`.toLowerCase().includes(rule.payeeMatch));
}

/** Names and re-tags past payments the rule matches. Returns how many changed. */
export async function applyRuleToPast(rule: RuleData, exceptTxId?: string): Promise<number> {
    const matches = await pastMatches(rule, exceptTxId);
    if (!matches.length) return 0;
    const [cat] = await database.get<Category>('categories').query(Q.where('name', Q.like(`%${rule.category}%`))).fetch();
    await database.write(async () => {
        for (const t of matches) {
            await t.update((x) => {
                x.merchant = rule.name;
                x.ruleId = rule.id;
                if (cat) x.category.set(cat);
            });
        }
        const r = await database.get<SmsRule>('sms_rules').find(rule.id);
        await r.update((x) => { x.matchCount = x.matchCount + matches.length; });
    });
    return matches.length;
}

/** Counts one more match (called by the SMS pipeline inside its own write). */
export async function countMatch(rule: SmsRule) {
    await rule.update((r) => {
        r.matchCount = r.matchCount + 1;
        r.lastMatchedAt = Date.now();
    });
}
