import { Model } from '@nozbe/watermelondb';
import { field, children, date, readonly } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class Account extends Model {
    static table = 'accounts';

    static associations: Associations = {
        transactions: { type: 'has_many', foreignKey: 'account_id' },
        subscriptions: { type: 'has_many', foreignKey: 'account_id' },
    };

    @field('name') name!: string;
    @field('type') type!: string;
    @field('balance') balance!: number;
    @field('icon') icon!: string;
    @field('color') color!: string;
    @field('is_included') isIncluded!: boolean; // Included in net worth?
    @field('is_deleted') isDeleted!: boolean;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;

    @children('transactions') transactions!: any;
}
