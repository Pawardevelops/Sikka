import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';

export const adapter = new SQLiteAdapter({
    schema: mySchema,
    onSetUpError: error => {
        console.error('Database setup error:', error);
    },
});
