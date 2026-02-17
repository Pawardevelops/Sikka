import { Model, Relation } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import Subscription from './Subscription';

export default class SubscriptionMember extends Model {
    static table = 'subscription_members';

    static associations: Associations = {
        subscriptions: { type: 'belongs_to', key: 'subscription_id' },
    };

    @field('name') name!: string;
    @field('amount') amount!: number;
    @field('status') status!: 'pending' | 'paid';

    @relation('subscriptions', 'subscription_id') subscription!: Relation<Subscription>;
}
