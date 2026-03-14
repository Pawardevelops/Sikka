import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { mySchema } from './schema';

export const adapter = new LokiJSAdapter({
    schema: mySchema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onSetUpError: error => {
        console.error('Database setup error:', error);
    },
});
