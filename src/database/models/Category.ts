import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class Category extends Model {
    static table = 'categories';

    static associations: Associations = {
        transactions: { type: 'has_many', foreignKey: 'category_id' },
    };

    @field('name') name!: string;
    @field('icon') icon!: string;
    @field('color') color!: string;
    @field('type') type!: 'expense' | 'income';

    @children('transactions') transactions!: any;
}
