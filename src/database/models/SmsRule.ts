import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

/** A sender the user named once in review. See services/sms/rules.ts. */
export default class SmsRule extends Model {
    static table = 'sms_rules';

    @text('sender') sender!: string;
    @text('payee_match') payeeMatch!: string;
    @text('name') name!: string;
    @text('category') category!: string;
    @field('account_id') accountId!: string | null;
    @field('mode') mode!: 'auto' | 'ask';
    @field('match_count') matchCount!: number;
    @field('last_matched_at') lastMatchedAt!: number | null;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
