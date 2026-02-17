import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Setting extends Model {
    static table = 'settings';

    @field('key') key!: string;
    @text('value') value!: string;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
