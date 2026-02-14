import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTransactions } from '../../context/TransactionsContext';
import { useCategoryStats, Period } from '../../hooks/useCategoryStats';
import { PeriodSelector } from './PeriodSelector';
import { DonutChart } from './DonutChart';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { Icon } from '../Icon';
import { useCurrency } from '../../context/CurrencyContext';

export function CategorySpends() {
    const { activeTransactions } = useTransactions();
    const { formatAmount } = useCurrency();
    const [period, setPeriod] = useState<Period>('Month');

    const { categoryStats, totalExpense } = useCategoryStats(activeTransactions, period);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Spending by Category</Text>
                <PeriodSelector period={period} onChange={setPeriod} />
            </View>

            <View style={styles.chartContainer}>
                <DonutChart data={categoryStats} size={220} strokeWidth={24} />
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>{formatAmount(totalExpense, true)}</Text>
                </View>
            </View>

            <View style={styles.listContainer}>
                {categoryStats.map((item, index) => (
                    <View key={item.name} style={styles.itemRow}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.surfaceLight }]}>
                            <Icon name={item.icon as any} size={20} color={COLORS.text} />
                        </View>
                        <View style={styles.itemContent}>
                            <View style={styles.itemTop}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemAmount}>{formatAmount(item.amount, true)}</Text>
                            </View>
                            <View style={styles.progressBg}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${item.percent}%`,
                                            backgroundColor: [
                                                COLORS.primary, COLORS.secondary, COLORS.accent,
                                                COLORS.warning, COLORS.error, COLORS.info,
                                                COLORS.success, '#FF6B6B', '#4ECDC4', '#45B7D1'
                                            ][index % 10]
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                ))}
                {categoryStats.length === 0 && (
                    <Text style={styles.emptyText}>No spending for this period</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        position: 'relative',
    },
    totalContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    totalAmount: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: COLORS.text,
    },
    listContainer: {
        flex: 1,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    itemContent: {
        flex: 1,
    },
    itemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    itemName: {
        fontSize: FONT_SIZE.md,
        fontWeight: '500',
        color: COLORS.text,
    },
    itemAmount: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    progressBg: {
        height: 6,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textMuted,
        marginTop: SPACING.lg,
    },
});
