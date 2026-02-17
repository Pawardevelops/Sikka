import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class Tag extends Model {
    static table = 'tags';

    static associations: Associations = {
        transaction_tags: { type: 'has_many', foreignKey: 'tag_id' },
    };

    @field('name') name!: string;
    @field('color') color!: string;
}
