import { Model, Relation } from '@nozbe/watermelondb';
import { immutableRelation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import Transaction from './Transaction';
import Tag from './Tag';

export default class TransactionTag extends Model {
    static table = 'transaction_tags';

    static associations: Associations = {
        transactions: { type: 'belongs_to', key: 'transaction_id' },
        tags: { type: 'belongs_to', key: 'tag_id' },
    };

    @immutableRelation('transactions', 'transaction_id') transaction!: Relation<Transaction>;
    @immutableRelation('tags', 'tag_id') tag!: Relation<Tag>;
}
