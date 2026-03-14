import { Database } from '@nozbe/watermelondb';
import { adapter } from './adapter';

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
import CreditCardDetail from './models/CreditCardDetail';
import InvestmentHolding from './models/InvestmentHolding';

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
        CreditCardDetail,
        InvestmentHolding,
    ],
});


export async function wipeDatabase() {
    await database.write(async () => {
        await database.unsafeResetDatabase();
    });
}

export default database;
