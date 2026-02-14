import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTransactions } from '../../context/TransactionsContext';
import { TransactionHeatmap } from './TransactionHeatmap';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { useCurrency } from '../../context/CurrencyContext';
import { Icon } from '../Icon';

export function ImpulseSection() {
    const { activeTransactions } = useTransactions();
    const { formatAmount } = useCurrency();

    // State for viewing transactions of a specific day
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Filter Impulse Transactions
    const impulseTransactions = useMemo(() => {
        return activeTransactions.filter(tx => tx.isImpulse);
    }, [activeTransactions]);

    // Aggregate by date for Heatmap
    const heatmapData = useMemo(() => {
        const data: Record<string, number> = {};
        impulseTransactions.forEach(tx => {
            const dateStr = new Date(tx.timestamp).toISOString().split('T')[0];
            data[dateStr] = (data[dateStr] || 0) + Math.abs(tx.amount);
        });
        return data;
    }, [impulseTransactions]);

    // Get transactions for the selected date
    const selectedTransactions = useMemo(() => {
        if (!selectedDate) return [];
        return impulseTransactions.filter(tx => {
            const dateStr = new Date(tx.timestamp).toISOString().split('T')[0];
            return dateStr === selectedDate;
        });
    }, [selectedDate, impulseTransactions]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Impulse Spending</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{impulseTransactions.length} items</Text>
                </View>
            </View>

            <Text style={styles.subtitle}>
                Track your impulse buys. Darker green means more spending.
            </Text>

            <View style={styles.heatmapWrapper}>
                <TransactionHeatmap
                    data={heatmapData}
                    onDayPress={(date) => setSelectedDate(date)}
                />
            </View>

            {/* Selected Date Modal/Section (Simple inline expansion for now) */}
            {selectedDate && (
                <View style={styles.detailsContainer}>
                    <View style={styles.detailsHeader}>
                        <Text style={styles.detailsTitle}>
                            {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedDate(null)}>
                            <Icon name="close" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {selectedTransactions.map(tx => (
                        <View key={tx.id} style={styles.txRow}>
                            <View style={[styles.catIcon, { backgroundColor: COLORS.surfaceLight }]}>
                                <Icon name="shopping-bag" size={16} color={COLORS.text} />
                            </View>
                            <View style={styles.txContent}>
                                <Text style={styles.txMerchant}>{tx.merchant}</Text>
                                <Text style={styles.txCategory}>{tx.category}</Text>
                            </View>
                            <Text style={styles.txAmount}>{formatAmount(tx.amount)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.xl,
        paddingTop: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
        gap: SPACING.sm,
    },
    title: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginBottom: SPACING.md,
    },
    badge: {
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    heatmapWrapper: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
    },

    // Details
    detailsContainer: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.primaryMuted,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    detailsTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.primary,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    catIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    txContent: {
        flex: 1,
    },
    txMerchant: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
        color: COLORS.text,
    },
    txCategory: {
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'capitalize',
    },
    txAmount: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.error, // It's spending
    },
});
