import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
    version: 1,
    tables: [
        // ==================== CORE FINANCIALS ====================
        tableSchema({
            name: 'accounts',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' },
                { name: 'balance', type: 'number' },
                { name: 'icon', type: 'string' },
                { name: 'color', type: 'string' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'categories',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'color', type: 'string' },
                { name: 'type', type: 'string' }, // 'expense' | 'income'
            ],
        }),
        tableSchema({
            name: 'transactions',
            columns: [
                { name: 'amount', type: 'number' },
                { name: 'merchant', type: 'string' }, // Title/Payee
                { name: 'note', type: 'string', isOptional: true },
                { name: 'timestamp', type: 'number' },
                { name: 'type', type: 'string' }, // 'credit' | 'debit'
                { name: 'is_auto', type: 'boolean' },
                { name: 'account_id', type: 'string', isIndexed: true },
                { name: 'category_id', type: 'string', isIndexed: true },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // ==================== METADATA & TAGGING ====================
        tableSchema({
            name: 'tags',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'color', type: 'string', isOptional: true },
            ],
        }),
        tableSchema({
            name: 'sentiments',
            columns: [
                { name: 'name', type: 'string' }, // 'Joy', 'Regret'
                { name: 'icon', type: 'string', isOptional: true },
                { name: 'color', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
            ],
        }),
        // Many-to-Many Join Tables
        tableSchema({
            name: 'transaction_tags',
            columns: [
                { name: 'transaction_id', type: 'string', isIndexed: true },
                { name: 'tag_id', type: 'string', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'transaction_sentiments',
            columns: [
                { name: 'transaction_id', type: 'string', isIndexed: true },
                { name: 'sentiment_id', type: 'string', isIndexed: true },
            ],
        }),

        // ==================== SUBSCRIPTIONS ====================
        tableSchema({
            name: 'subscriptions',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'icon_color', type: 'string' },
                { name: 'total_amount', type: 'number' },
                { name: 'my_share', type: 'number' },
                { name: 'due_date', type: 'number' },
                { name: 'billing_cycle', type: 'string' }, // 'monthly' | 'yearly'
                { name: 'status', type: 'string' }, // 'active' | 'paused' | 'archived'
                { name: 'role', type: 'string' }, // 'admin' | 'member'
                { name: 'is_split', type: 'boolean' },
                { name: 'is_paid', type: 'boolean' },
                { name: 'payment_mode', type: 'string' },
                { name: 'pay_to', type: 'string', isOptional: true },
                { name: 'account_id', type: 'string', isIndexed: true, isOptional: true }, // Payment source
                { name: 'category_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'subscription_members',
            columns: [
                { name: 'subscription_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'status', type: 'string' }, // 'pending' | 'paid'
            ],
        }),
        tableSchema({
            name: 'subscription_events',
            columns: [
                { name: 'subscription_id', type: 'string', isIndexed: true },
                { name: 'type', type: 'string' },
                { name: 'timestamp', type: 'number' },
                { name: 'details', type: 'string', isOptional: true },
            ],
        }),

        // ==================== UTILITIES & SETTINGS ====================
        tableSchema({
            name: 'unparsed_messages',
            columns: [
                { name: 'body', type: 'string' },
                { name: 'sender', type: 'string' },
                { name: 'timestamp', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'settings',
            columns: [
                { name: 'key', type: 'string', isIndexed: true }, // e.g. 'currency', 'theme'
                { name: 'value', type: 'string' }, // JSON string
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'users',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'email', type: 'string', isOptional: true },
                { name: 'onboarding_completed', type: 'boolean' },
                { name: 'preferences', type: 'string', isOptional: true }, // JSON
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});
