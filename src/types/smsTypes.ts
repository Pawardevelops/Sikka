/**
 * Sikka - SMS Types
 * Type definitions for SMS parsing and rule management
 */

// ==================== SMS RULES ====================

export interface SMSRule {
    id: string;
    name: string;
    description: string;
    senderPatterns: string[];  // e.g., ['HDFCBK', 'HDFC', 'HDFCBANK']
    amountPattern: string;     // Regex pattern with named group (?<amount>...)
    merchantPattern?: string;  // Optional regex for merchant extraction
    isBuiltIn: boolean;        // Pre-built vs custom rule
    isEnabled: boolean;
    priority: number;          // Higher priority rules match first
    category?: string;         // Default category for matched transactions
}

// ==================== SMS MESSAGE ====================

export interface SMSMessage {
    id: string;
    sender: string;
    body: string;
    timestamp: number;
    isRead: boolean;
}

export interface ParsedSMS extends SMSMessage {
    ruleId: string;
    ruleName: string;
    parsedAmount: number;
    parsedMerchant?: string;
    parsedCardLast4?: string;
    parsedDate?: string;
    isReviewed: boolean;
    isIgnored: boolean;
}

// ==================== VISUAL PARSER ====================

export interface HighlightSelection {
    start: number;
    end: number;
    text: string;
    type: 'amount' | 'merchant' | 'date';
}

export interface VisualParserState {
    originalMessage: string;
    selections: HighlightSelection[];
    generatedAmountRegex?: string;
    generatedMerchantRegex?: string;
    testResult?: {
        amount?: string;
        merchant?: string;
        isValid: boolean;
    };
}

// ==================== STATS ====================

export interface SMSStats {
    totalParsed: number;
    pendingReview: number;
    unmatched: number;
    ignoredCount: number;
}
