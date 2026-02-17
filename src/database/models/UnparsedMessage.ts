import { Model } from '@nozbe/watermelondb';
import { text, date } from '@nozbe/watermelondb/decorators';

export default class UnparsedMessage extends Model {
    static table = 'unparsed_messages';

    @text('body') body!: string;
    @text('sender') sender!: string;
    @date('timestamp') timestamp!: number;
}
