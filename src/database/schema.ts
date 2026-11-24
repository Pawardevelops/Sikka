import { appSchema, tableSchema, ColumnSchema } from '@nozbe/watermelondb';
import type { TableSchemaSpec } from '@nozbe/watermelondb/Schema';

// ==================== v2 (Sikka v3 design) ====================
// Columns added in schema v2. Listed once so the schema and the migration agree.

/** Which SMS an account belongs to: "··7731" from "A/c XX7731", sender "HDFCBK". */
export const ACCOUNT_V2: ColumnSchema[] = [
    { name: 'last4', type: 'string', isOptional: true },
    { name: 'sms_sender', type: 'string', isOptional: true },
];

export const TRANSACTION_V2: ColumnSchema[] = [
    /** Bank sender code, e.g. HDFCBK. */
    { name: 'sms_sender', type: 'string', isOptional: true },
    /** Original SMS text, shown in review and used to teach rules. */
    { name: 'sms_body', type: 'string', isOptional: true },
    /** Raw counterparty from the SMS (UPI ID or shop), e.g. blinkit.payu@hdfcbank. */
    { name: 'payee', type: 'string', isOptional: true },
    /** Rule that named this payment, if any. */
    { name: 'rule_id', type: 'string', isOptional: true, isIndexed: true },
    /** Filed by a rule without review. */
    { name: 'auto_filed', type: 'boolean', isOptional: true },
    /** Payment plan (SIP, EMI, subscription) this debit belongs to. */
    { name: 'plan_id', type: 'string', isOptional: true, isIndexed: true },
    /** Who read it: a pattern name, a model id, 'rule' or 'you'. */
    { name: 'read_by', type: 'string', isOptional: true },
    { name: 'tags', type: 'string', isOptional: true },
];

/** Subscriptions grow into payment plans: SIPs, EMIs, insurance and other autopays. */
export const PLAN_V2: ColumnSchema[] = [
    { name: 'kind', type: 'string', isOptional: true },          // sip | subscription | emi | insurance | autopay
    { name: 'via', type: 'string', isOptional: true },           // nach | upi_autopay | card | manual
    { name: 'mandate_limit', type: 'number', isOptional: true },
    { name: 'amount_varies', type: 'boolean', isOptional: true },
    { name: 'start_date', type: 'number', isOptional: true },
    { name: 'end_date', type: 'number', isOptional: true },
    { name: 'payments_left', type: 'number', isOptional: true },
    { name: 'paused_until', type: 'number', isOptional: true },
    { name: 'stopped_at', type: 'number', isOptional: true },
    { name: 'remind', type: 'boolean', isOptional: true },
    { name: 'payee_match', type: 'string', isOptional: true },   // SMS text that identifies its debits
    { name: 'found_in_sms', type: 'boolean', isOptional: true },
];

/** "Teach once": how a sender's SMS should be named and filed from now on. */
export const SMS_RULES: TableSchemaSpec = {
    name: 'sms_rules',
    columns: [
        { name: 'sender', type: 'string', isIndexed: true },     // bank sender code, e.g. HDFCBK
        { name: 'payee_match', type: 'string' },                 // lower-case text the SMS must contain
        { name: 'name', type: 'string' },                        // what to call it, e.g. Blinkit
        { name: 'category', type: 'string' },
        { name: 'account_id', type: 'string', isOptional: true },
        { name: 'mode', type: 'string' },                        // auto | ask
        { name: 'match_count', type: 'number' },
        { name: 'last_matched_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
    ],
};


export const mySchema = appSchema({
    version: 2,
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
                ...ACCOUNT_V2,
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // ── Credit Card Details (1:1 satellite for type='credit') ──
        tableSchema({
            name: 'credit_card_details',
            columns: [
                { name: 'account_id', type: 'string', isIndexed: true },
                { name: 'credit_limit', type: 'number' },
                { name: 'billing_cycle_date', type: 'number' }, // Day 1-31
                { name: 'due_date', type: 'number' },           // Day 1-31
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // ── Investment Holdings (1:N satellite for type='investment'|'bitcoin') ──
        tableSchema({
            name: 'investment_holdings',
            columns: [
                { name: 'account_id', type: 'string', isIndexed: true },
                { name: 'ticker', type: 'string' },
                { name: 'quantity', type: 'number' },
                { name: 'avg_buy_price', type: 'number' },
                { name: 'current_price', type: 'number' },
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
                ...TRANSACTION_V2,
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
                ...PLAN_V2,
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
        tableSchema(SMS_RULES),
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
