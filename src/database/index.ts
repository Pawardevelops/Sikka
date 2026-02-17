import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { mySchema } from './schema';
import Account from './models/Account';
import Category from './models/Category';
import Transaction from './models/Transaction';
import Tag from './models/Tag';
import Sentiment from './models/Sentiment';
import TransactionTag from './models/TransactionTag';
import TransactionSentiment from './models/TransactionSentiment';
import Subscription from './models/Subscription';
import SubscriptionMember from './models/SubscriptionMember';
import SubscriptionEvent from './models/SubscriptionEvent';
import UnparsedMessage from './models/UnparsedMessage';
import Setting from './models/Setting';
import User from './models/User';

// Create the adapter to the underlying database:
const adapter = new SQLiteAdapter({
    schema: mySchema,
    // (You might want to comment out migrations if you haven't created them yet)
    // migrations,
    // dbName: 'myapp', // optional, default is 'watermelon'
    // jsi: true, /* Platform.OS === 'ios' */
    onSetUpError: error => {
        // Database failed to load -- often because of file permissions or corrupt database
        // In a real app, you might want to wipe the database and try again
        console.error('Database setup error:', error);
    },
});

// Then, make a Database instance
const database = new Database({
    adapter,
    modelClasses: [
        Account,
        Category,
        Transaction,
        Tag,
        Sentiment,
        TransactionTag,
        TransactionSentiment,
        Subscription,
        SubscriptionMember,
        SubscriptionEvent,
        UnparsedMessage,
        Setting,
        User,
    ],
});


export async function wipeDatabase() {
    await database.write(async () => {
        await database.unsafeResetDatabase();
    });
}

export default database;
