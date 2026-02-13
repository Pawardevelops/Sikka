/**
 * Sikka - Mock Data
 * Sample data for development and testing
 */

import { Account, Transaction, CategoryStat } from '../types';

export const MOCK_ACCOUNTS: Account[] = [
    { id: '1', name: 'Bank Account', type: 'bank', balance: 24000, icon: 'account-balance', color: '#3B82F6', lastUpdated: 'Today' },
    { id: '2', name: 'Cash', type: 'cash', balance: 1200, icon: 'payments', color: '#22C55E', lastUpdated: 'Today' },
    { id: '3', name: 'Bitcoin', type: 'bitcoin', balance: 0, icon: 'currency-bitcoin', color: '#F59E0B', lastUpdated: '3 days ago' },
    { id: '4', name: 'Credit Card', type: 'credit', balance: -850, icon: 'credit-card', color: '#EF4444', lastUpdated: 'Today' },
    { id: '5', name: 'Savings', type: 'savings', balance: 18500, icon: 'savings', color: '#8B5CF6', lastUpdated: 'Yesterday' },
];

// Mock transactions are no longer used - real transactions come from TransactionsContext
// Keeping for reference/testing purposes
export const MOCK_TRANSACTIONS: Transaction[] = [];

export const MOCK_CATEGORY_STATS: CategoryStat[] = [
    { name: 'Food & Dining', amount: 520, percent: 28, icon: 'restaurant' },
    { name: 'Transport', amount: 380, percent: 20, icon: 'directions-car' },
    { name: 'Shopping', amount: 450, percent: 24, icon: 'shopping-bag' },
    { name: 'Entertainment', amount: 180, percent: 10, icon: 'movie' },
    { name: 'Other', amount: 340, percent: 18, icon: 'category' },
];
