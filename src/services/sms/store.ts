import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import Transaction from '../../database/models/Transaction';
import UnparsedMessage from '../../database/models/UnparsedMessage';
import Account from '../../database/models/Account';
import Category from '../../database/models/Category';
import { ParsedSms } from './types';

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

/**
 * Saves a captured payment as an auto (= waiting for review) transaction.
 * Amounts are signed like manual entries: spends negative, income positive.
 * Returns false when it was a duplicate or there is no account to attach it to.
 */
export async function saveCapturedTransaction(parsed: ParsedSms, sender: string, receivedAt: number): Promise<boolean> {
    const signed = parsed.direction === 'debit' ? -parsed.amount : parsed.amount;

    return database.write(async () => {
        const txCol = database.get<Transaction>('transactions');

        const duplicates = await txCol
            .query(Q.where('amount', signed), Q.where('timestamp', Q.between(receivedAt - MINUTE, receivedAt + MINUTE)))
            .fetch();
        if (duplicates.length > 0) {
            // A rescan can name a payee an older capture missed; fill it in while it's still in review.
            const stale = duplicates.find((t) => t.isAuto && !t.isDeleted && t.merchant === 'UNKNOWN');
            if (stale && parsed.merchant !== 'UNKNOWN') {
                const [cat] = await database.get<Category>('categories').query(Q.where('name', parsed.category)).fetch();
                await stale.update((t) => {
                    t.merchant = parsed.merchant;
                    if (cat) t.category.set(cat);
                });
            }
            return false;
        }

        // TODO: pick the account by the last 4 digits in the SMS.
        const [account] = await database.get<Account>('accounts').query(Q.where('is_deleted', Q.notEq(true))).fetch();
        if (!account) return false;

        const catCol = database.get<Category>('categories');
        const cats = await catCol.query(Q.where('name', Q.oneOf([parsed.category, 'other']))).fetch();
        const category = cats.find((c) => c.name === parsed.category) ?? cats[0];

        await txCol.create((tx) => {
            tx.amount = signed;
            tx.merchant = parsed.merchant;
            tx.note = `Auto-tracked from SMS (${sender}) · read by ${parsed.source}`;
            tx.timestamp = receivedAt;
            tx.type = parsed.direction;
            tx.isAuto = true;
            tx.isDeleted = false;
            tx.account.set(account);
            if (category) tx.category.set(category);
        });
        await account.update((a) => {
            a.balance += signed;
        });
        return true;
    });
}
