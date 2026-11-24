import { Model } from '@nozbe/watermelondb';
import { text, field } from '@nozbe/watermelondb/decorators';

export default class UnparsedMessage extends Model {
    static table = 'unparsed_messages';

    @text('body') body!: string;
    @text('sender') sender!: string;
    // Raw number (ms): @date would hand back a Date, which Q.between and arithmetic reject.
    @field('timestamp') timestamp!: number;
}
