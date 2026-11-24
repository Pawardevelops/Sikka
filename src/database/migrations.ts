import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';
import { ACCOUNT_V2, TRANSACTION_V2, PLAN_V2, SMS_RULES } from './schema';

/** Keep every step: phones upgrade from whatever version they have. */
export const migrations = schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                addColumns({ table: 'accounts', columns: ACCOUNT_V2 }),
                addColumns({ table: 'transactions', columns: TRANSACTION_V2 }),
                addColumns({ table: 'subscriptions', columns: PLAN_V2 }),
                createTable(SMS_RULES),
            ],
        },
    ],
});
