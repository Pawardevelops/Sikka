import { Model } from '@nozbe/watermelondb';
import { field, text, date, json, readonly } from '@nozbe/watermelondb/decorators';

const sanitizePreferences = (raw: any) => {
    return typeof raw === 'object' ? raw : {};
};

export default class User extends Model {
    static table = 'users';

    @text('name') name!: string;
    @text('email') email!: string;
    @field('onboarding_completed') onboardingCompleted!: boolean;
    @json('preferences', sanitizePreferences) preferences!: any;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
