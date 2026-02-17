import { Model, Relation } from '@nozbe/watermelondb';
import { field, text, date, relation, children, readonly } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import Account from './Account';
import Category from './Category';

export default class Subscription extends Model {
    static table = 'subscriptions';

    static associations: Associations = {
        accounts: { type: 'belongs_to', key: 'account_id' },
        categories: { type: 'belongs_to', key: 'category_id' },
        subscription_members: { type: 'has_many', foreignKey: 'subscription_id' },
        subscription_events: { type: 'has_many', foreignKey: 'subscription_id' },
    };

    @field('name') name!: string;
    @field('icon') icon!: string;
    @field('icon_color') iconColor!: string;

    @field('total_amount') totalAmount!: number;
    @field('my_share') myShare!: number;

    @field('due_date') dueDate!: number;
    @field('billing_cycle') billingCycle!: 'monthly' | 'yearly';

    @field('status') status!: 'active' | 'paused' | 'archived';
    @field('role') role!: 'admin' | 'member';
    @field('is_split') isSplit!: boolean;
    @field('is_paid') isPaid!: boolean;

    @field('payment_mode') paymentMode!: string;
    @text('pay_to') payTo!: string; // Optional

    @relation('accounts', 'account_id') account!: Relation<Account>; // Payment source
    @relation('categories', 'category_id') category!: Relation<Category>;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;

    @children('subscription_members') members!: any;
    @children('subscription_events') events!: any;
}
