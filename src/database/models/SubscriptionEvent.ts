import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, text, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import Subscription from './Subscription';

export default class SubscriptionEvent extends Model {
    static table = 'subscription_events';

    static associations: Associations = {
        subscriptions: { type: 'belongs_to', key: 'subscription_id' },
    };

    @field('type') type!: string;
    @date('timestamp') timestamp!: number;
    @text('details') details!: string;

    @relation('subscriptions', 'subscription_id') subscription!: Relation<Subscription>;
}
