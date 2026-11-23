import { TransactionCategory } from '../../types';

/** One SMS as delivered by the native SmsReceiver. */
export interface IncomingSms {
    sender?: string;
    body?: string;
    timestamp?: number;
}

/** What any parser (patterns or a model) extracts from a bank SMS. */
export interface ParsedSms {
    direction: 'debit' | 'credit';
    /** Always positive; the sign is applied when saving. */
    amount: number;
    merchant: string;
    category: TransactionCategory;
    /** Who read it: a bank pattern name or a model id. */
    source: string;
}
