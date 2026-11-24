import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import { migrations } from './migrations';

export const adapter = new SQLiteAdapter({
    schema: mySchema,
    migrations,
    onSetUpError: error => {
        console.error('Database setup error:', error);
    },
});
