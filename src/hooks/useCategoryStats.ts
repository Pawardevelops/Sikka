import { useMemo } from 'react';
import { Transaction, CategoryStat } from '../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../context/TransactionsContext';

export type Period = 'Week' | 'Month' | 'Year';

export function useCategoryStats(transactions: Transaction[], period: Period) {
    return useMemo(() => {
        const now = new Date();
        const startOfPeriod = new Date();

        if (period === 'Week') {
            const day = now.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            startOfPeriod.setDate(diff); // Monday of current week
            startOfPeriod.setHours(0, 0, 0, 0);
        } else if (period === 'Month') {
            startOfPeriod.setDate(1);
            startOfPeriod.setHours(0, 0, 0, 0);
        } else if (period === 'Year') {
            startOfPeriod.setMonth(0, 1);
            startOfPeriod.setHours(0, 0, 0, 0);
        }

        const filtered = transactions.filter(tx => tx.timestamp >= startOfPeriod.getTime());

        let totalExpense = 0;
        const catMap = new Map<string, number>();

        filtered.forEach(tx => {
            if (tx.amount < 0) { // Only expenses
                const absAmount = Math.abs(tx.amount);
                totalExpense += absAmount;
                const existing = catMap.get(tx.category) || 0;
                catMap.set(tx.category, existing + absAmount);
            }
        });

        const stats: CategoryStat[] = [];
        catMap.forEach((amount, category) => {
            stats.push({
                name: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
                amount,
                percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
                icon: CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || 'category',
            });
        });

        // Sort by amount desc
        stats.sort((a, b) => b.amount - a.amount);

        return { categoryStats: stats, totalExpense };
    }, [transactions, period]);
}
