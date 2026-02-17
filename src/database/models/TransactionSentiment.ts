import { Model, Relation } from '@nozbe/watermelondb';
import { immutableRelation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import Transaction from './Transaction';
import Sentiment from './Sentiment';

export default class TransactionSentiment extends Model {
    static table = 'transaction_sentiments';

    static associations: Associations = {
        transactions: { type: 'belongs_to', key: 'transaction_id' },
        sentiments: { type: 'belongs_to', key: 'sentiment_id' },
    };

    @immutableRelation('transactions', 'transaction_id') transaction!: Relation<Transaction>;
    @immutableRelation('sentiments', 'sentiment_id') sentiment!: Relation<Sentiment>;
}
