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
    /** Last 4 digits the bank uses in SMS ("A/c XX7731"). */
    last4?: string;
    /** Bank SMS sender code, e.g. HDFCBK. */
    smsSender?: string;

    // ── Credit Card (populated when type='credit') ──
    creditCardDetails?: import('./accountTypes').CreditCardDetails;

    // ── Investment / Crypto (populated when type='investment'|'bitcoin') ──
    holdings?: import('./accountTypes').InvestmentHoldingData[];
    investmentValue?: number; // Computed: Σ(qty × currentPrice)
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
    isImpulse?: boolean; // Deprecated: use 'impulse' sentiment instead
    sentimentIds?: string[]; // Array of Sentiment IDs (e.g. ['regret', 'impulse'])
    isDeleted?: boolean;

    // ── Captured from SMS (schema v2) ──
    smsSender?: string;      // bank sender code, e.g. HDFCBK
    smsBody?: string;        // original message
    payee?: string;          // raw counterparty, e.g. blinkit.payu@hdfcbank
    ruleId?: string;         // rule that named it
    autoFiled?: boolean;     // filed by a rule, skipped review
    planId?: string;         // SIP / EMI / subscription it pays
    readBy?: string;         // pattern name, model id, 'rule' or 'you'
    tags?: string[];         // #rahul, #work
}

// ==================== SUBSCRIPTIONS ====================

// Subscription roles: who pays the merchant?
export type SubscriptionRole = 'admin' | 'member';
//   admin  = I pay the full bill, others owe me
//   member = someone else pays, I just pay my share

// Lifecycle states
export type SubscriptionStatus = 'active' | 'paused' | 'archived';

// How to deduct on due date
export type PaymentMode = 'default' | 'ask_every_time';

// A person sharing the subscription cost (admin-only)
export interface SplitMember {
    name: string;
    amount: number;
    status: 'pending' | 'paid';
}

// Immutable event in the subscription's lifecycle
export interface SubscriptionEvent {
    type: 'created' | 'paused' | 'reactivated' | 'price_updated' | 'archived';
    timestamp: number;
    details?: string; // e.g. "Price: ₹199 → ₹299"
}

export interface Subscription {
    id: string;
    name: string;
    icon: string;              // MaterialIcon name
    iconColor: string;         // icon background color

    // ── Amounts ──
    totalAmount: number;       // full bill to merchant (₹800)
    myShare: number;           // my actual cost     (₹200 if split)
    amount: number;            // = myShare (backward-compat alias)

    // ── Billing ──
    dueDate: number;           // day of month (1-31)
    billingCycle: 'monthly' | 'yearly';
    category: string;          // e.g. "streaming", "cloud", "fitness"

    // ── Role & Split ──
    role: SubscriptionRole;
    isSplit: boolean;
    splitMembers: SplitMember[];

    // ── Payment Source ──
    paymentSourceId?: string;  // linked Account.id
    paymentMode: PaymentMode;
    payTo?: string;            // member-only: friend's name

    // ── Lifecycle ──
    status: SubscriptionStatus;
    isPaid: boolean;           // paid THIS cycle?
    eventLog: SubscriptionEvent[];

    // ── Legacy ──
    isDeleted?: boolean;       // mapped to status='archived' during migration

    // ── Payment plan (schema v2): SIPs, EMIs, insurance, other autopays ──
    kind?: PlanKind;
    via?: PlanVia;
    mandateLimit?: number;      // bank autopay limit
    amountVaries?: boolean;
    startDate?: number;
    endDate?: number;
    paymentsLeft?: number;      // EMIs
    pausedUntil?: number;
    stoppedAt?: number;
    remind?: boolean;           // remind 1 day before + check balance
    payeeMatch?: string;        // SMS text that marks this plan's debits
    foundInSms?: boolean;
}

export type PlanKind = 'sip' | 'subscription' | 'emi' | 'insurance' | 'autopay';
/** How the money leaves: bank autopay (NACH), UPI AutoPay, card autopay, or paid by hand. */
export type PlanVia = 'nach' | 'upi_autopay' | 'card' | 'manual';

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
/** 1 Welcome · 2 Profile · 3 Use local AI? · 4 Model · 5 First look · 6 Accounts · 7 Security */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Language = 'en' | 'hi' | 'hinglish';

export type NumberSystem = 'lakhs' | 'millions';

export interface OnboardingData {
    language: Language;
    currency: CurrencyCode;
    numberSystem: NumberSystem;
    userName: string;
    primaryGoal: string;
    /** Monthly spend limit — powers the "on pace" card on Home. */
    monthlySpendLimit?: number;
    hideBalances: boolean;
    notificationPermissionGranted: boolean;
    biometricEnabled: boolean;
    autoBackupEnabled: boolean;
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
