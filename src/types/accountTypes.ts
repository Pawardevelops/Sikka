/**
 * Sikka — Account Type System
 *
 * Discriminated interfaces + Strategy pattern for Net Worth calculation.
 * SOLID: Interface Segregation (type-specific fields) + Open/Closed (strategy map).
 */

import { AccountType, Account } from './index';

// ==================== CREDIT CARD DETAILS ====================
export interface CreditCardDetails {
    creditLimit: number;
    billingCycleDate: number;  // Day of month (1-31)
    dueDate: number;           // Day of month (1-31)
}

// Computed credit card metrics
export interface CreditUtilization {
    used: number;       // Current balance (debt)
    limit: number;      // Total credit limit
    available: number;  // limit - used
    percent: number;    // (used / limit) × 100
    status: 'safe' | 'warning' | 'danger'; // <30% | 30-60% | >60%
}

// ==================== INVESTMENT HOLDING ====================
export interface InvestmentHoldingData {
    id: string;
    ticker: string;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
}

// Computed holding metrics
export interface HoldingPnL {
    holding: InvestmentHoldingData;
    currentValue: number;   // qty × currentPrice
    investedValue: number;  // qty × avgBuyPrice
    pnl: number;            // currentValue - investedValue
    pnlPercent: number;     // (pnl / investedValue) × 100
}

// Aggregated portfolio metrics for an account
export interface PortfolioPnL {
    holdings: HoldingPnL[];
    totalValue: number;
    totalInvested: number;
    totalPnL: number;
    pnlPercent: number;
}

// ==================== NET WORTH STRATEGY (Open/Closed Principle) ====================

/**
 * Each account type defines how it contributes to Net Worth.
 * Adding a new type = add one function here. Zero existing code changes.
 */
export type NetWorthStrategy = (account: Account) => number;

export const NET_WORTH_STRATEGIES: Record<AccountType, NetWorthStrategy> = {
    bank: (a) => a.balance,
    cash: (a) => a.balance,
    wallet: (a) => a.balance,
    savings: (a) => a.balance,
    credit: (a) => -Math.abs(a.balance),         // Debt subtracts from net worth
    investment: (a) => a.investmentValue ?? a.balance, // Σ(qty × price), fallback to balance
    bitcoin: (a) => a.investmentValue ?? a.balance,
};

/**
 * Compute total Net Worth from a list of active accounts.
 * Formula: Σ(liquid) + Σ(investment value) − Σ(CC debt)
 */
export function computeNetWorth(activeAccounts: Account[]): number {
    return activeAccounts.reduce((total, acc) => {
        const strategy = NET_WORTH_STRATEGIES[acc.type];
        return total + (strategy ? strategy(acc) : acc.balance);
    }, 0);
}

// ==================== UTILITY FUNCTIONS ====================

export function computeCreditUtilization(
    balance: number,
    creditLimit: number,
): CreditUtilization {
    const used = Math.abs(balance);
    const available = Math.max(0, creditLimit - used);
    const percent = creditLimit > 0 ? (used / creditLimit) * 100 : 0;

    let status: CreditUtilization['status'] = 'safe';
    if (percent > 60) status = 'danger';
    else if (percent > 30) status = 'warning';

    return { used, limit: creditLimit, available, percent, status };
}

export function computeHoldingPnL(holding: InvestmentHoldingData): HoldingPnL {
    const currentValue = holding.quantity * holding.currentPrice;
    const investedValue = holding.quantity * holding.avgBuyPrice;
    const pnl = currentValue - investedValue;
    const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

    return { holding, currentValue, investedValue, pnl, pnlPercent };
}

export function computePortfolioPnL(holdings: InvestmentHoldingData[]): PortfolioPnL {
    const holdingPnLs = holdings.map(computeHoldingPnL);
    const totalValue = holdingPnLs.reduce((s, h) => s + h.currentValue, 0);
    const totalInvested = holdingPnLs.reduce((s, h) => s + h.investedValue, 0);
    const totalPnL = totalValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return { holdings: holdingPnLs, totalValue, totalInvested, totalPnL, pnlPercent };
}

// ==================== ACCOUNT TYPE METADATA ====================

export interface AccountTypeMeta {
    value: AccountType;
    label: string;
    icon: string;
    category: 'liquid' | 'liability' | 'investment';
}

export const ACCOUNT_TYPE_META: AccountTypeMeta[] = [
    { value: 'bank', label: 'Bank Account', icon: 'account-balance', category: 'liquid' },
    { value: 'cash', label: 'Cash', icon: 'payments', category: 'liquid' },
    { value: 'wallet', label: 'Wallet', icon: 'account-balance-wallet', category: 'liquid' },
    { value: 'savings', label: 'Savings', icon: 'savings', category: 'liquid' },
    { value: 'credit', label: 'Credit Card', icon: 'credit-card', category: 'liability' },
    { value: 'investment', label: 'Investment', icon: 'trending-up', category: 'investment' },
    { value: 'bitcoin', label: 'Crypto', icon: 'currency-bitcoin', category: 'investment' },
];
