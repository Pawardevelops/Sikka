import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { mySchema } from './schema';
import { migrations } from './migrations';

export const adapter = new LokiJSAdapter({
    schema: mySchema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onSetUpError: error => {
        console.error('Database setup error:', error);
    },
});
