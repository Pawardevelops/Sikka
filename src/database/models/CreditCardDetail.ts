import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

/**
 * CreditCardDetail — Satellite table for credit card accounts (1:1 with Account)
 *
 * Normalized design: credit-specific data lives here, not polluting the accounts table.
 * Linked via account_id FK.
 */
export default class CreditCardDetail extends Model {
    static table = 'credit_card_details';

    static associations: Associations = {
        accounts: { type: 'belongs_to', key: 'account_id' },
    };

    @field('account_id') accountId!: string;
    @field('credit_limit') creditLimit!: number;
    @field('billing_cycle_date') billingCycleDate!: number; // Day of month (1-31)
    @field('due_date') dueDate!: number;                     // Day of month (1-31)

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
