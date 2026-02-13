/**
 * Sikka - Type Definitions
 * Shared TypeScript types and interfaces
 */

// ==================== NAVIGATION ====================
export type TabType = 'dash' | 'assets' | 'stats' | 'settings';

export type RootStackParamList = {
    MainTabs: undefined;
    AccountDetail: { accountId: string };
};

export type TabParamList = {
    Dashboard: undefined;
    Assets: undefined;
    Stats: undefined;
    Settings: undefined;
};

// ==================== CURRENCY ====================
export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'AUD';

export interface Currency {
    code: CurrencyCode;
    symbol: string;
    name: string;
}

// ==================== ACCOUNTS ====================
export type AccountType = 'bank' | 'cash' | 'bitcoin' | 'credit' | 'investment' | 'savings' | 'wallet';

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    icon: string;
    color: string;
    lastUpdated?: string;
    isDeleted?: boolean;
}

// ==================== TRANSACTIONS ====================
export type TransactionType = 'credit' | 'debit';

export type TransactionCategory =
    | 'groceries'
    | 'dining'
    | 'transport'
    | 'shopping'
    | 'entertainment'
    | 'utilities'
    | 'health'
    | 'income'
    | 'transfer'
    | 'other';

export interface Transaction {
    id: string;
    accountId: string;
    merchant: string;
    category: TransactionCategory;
    type: TransactionType;
    status?: 'pending' | 'approved' | 'ignored'; // Workflow status
    amount: number; // negative for expense, positive for income
    notes?: string;
    timestamp: number; // Unix timestamp for easy sorting
    isAuto: boolean; // Auto-detected from SMS
    isImpulse?: boolean; // Marked as impulse/want spending for analytics
    isDeleted?: boolean;
}

// ==================== SUBSCRIPTIONS ====================
export interface Subscription {
    id: string;
    name: string;
    icon: string;         // MaterialIcon name
    iconColor: string;    // icon background color
    amount: number;
    dueDate: number;      // day of month (1-31)
    billingCycle: 'monthly' | 'yearly';
    category: string;     // e.g. "streaming", "cloud", "fitness"
    isPaid?: boolean;
    isDeleted?: boolean;
}

// ==================== STATS ====================
export interface CategoryStat {
    name: string;
    amount: number;
    percent: number;
    icon: string;
}

// ==================== USER ====================
export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

// ==================== SPENDING ====================
export interface SpendingPaceData {
    dailyBudget: number;
    currentPace: number;
    status: 'on_track' | 'over_budget' | 'under_budget';
    daysRemaining: number;
}

// ==================== DASHBOARD ====================
export interface DashboardData {
    netWorth: number;
    monthlyDelta: number;
    percentChange: number;
    activeAssets: number;
    accounts: Account[];
    recentTransactions: Transaction[];
    spendingPace: SpendingPaceData;
}

// ==================== ONBOARDING ====================
export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export type Language = 'en' | 'hi' | 'hinglish';

export type NumberSystem = 'lakhs' | 'millions';

export interface OnboardingData {
    language: Language;
    currency: CurrencyCode;
    numberSystem: NumberSystem;
    userName: string;
    primaryGoal: string;
    hideBalances: boolean;
    notificationPermissionGranted: boolean;
    biometricEnabled: boolean;
    backupLocation?: string;
}

// Account type for onboarding selection
export interface OnboardingAccountType {
    type: AccountType;
    name: string;
    description: string;
    icon: string;
    color: string;
    selected: boolean;
    balance: number;
}
