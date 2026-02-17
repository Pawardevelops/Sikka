import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class Sentiment extends Model {
    static table = 'sentiments';

    static associations: Associations = {
        transaction_sentiments: { type: 'has_many', foreignKey: 'sentiment_id' },
    };

    @field('name') name!: string;
    @field('icon') icon!: string;
    @field('color') color!: string;
    @text('description') description!: string;
}
