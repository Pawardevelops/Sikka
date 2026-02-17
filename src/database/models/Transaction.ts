import { Model, Relation } from '@nozbe/watermelondb';
import { field, text, date, relation, children, readonly } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import Account from './Account';
import Category from './Category';

export default class Transaction extends Model {
    static table = 'transactions';

    static associations: Associations = {
        accounts: { type: 'belongs_to', key: 'account_id' },
        categories: { type: 'belongs_to', key: 'category_id' },
        transaction_tags: { type: 'has_many', foreignKey: 'transaction_id' },
        transaction_sentiments: { type: 'has_many', foreignKey: 'transaction_id' },
    };

    @field('amount') amount!: number;
    @text('merchant') merchant!: string;
    @text('note') note!: string;
    @date('timestamp') timestamp!: number;
    @field('type') type!: 'credit' | 'debit';
    @field('is_auto') isAuto!: boolean;
    @field('is_deleted') isDeleted!: boolean;

    @relation('accounts', 'account_id') account!: Relation<Account>;
    @relation('categories', 'category_id') category!: Relation<Category>;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;

    @children('transaction_tags') transactionTags!: any;
    @children('transaction_sentiments') transactionSentiments!: any;
}
