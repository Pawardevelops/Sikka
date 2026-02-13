/**
 * Sikka - Transaction Item Component
 * Single row displaying transaction details
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, CATEGORY_ICONS } from '../constants/theme';
import { useCurrency } from '../context/CurrencyContext';
import { Icon } from './Icon';

interface TransactionItemProps {
    transaction: Transaction;
}

function formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
}

function formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

export function TransactionItem({ transaction }: TransactionItemProps) {
    const { formatAmount } = useCurrency();
    const iconName = CATEGORY_ICONS[transaction.category] || 'receipt-long';
    const isExpense = transaction.amount < 0;

    return (
        <View style={styles.container}>
            {/* Icon */}
            <View style={styles.iconContainer}>
                <Icon name={iconName as any} size={20} color={COLORS.primary} />
            </View>

            {/* Details */}
            <View style={styles.details}>
                <View style={styles.titleRow}>
                    <Text style={styles.merchant}>{transaction.merchant}</Text>
                    {transaction.isAuto && (
                        <View style={styles.autoBadge}>
                            <Text style={styles.autoBadgeText}>AUTO</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.category}>
                    {formatCategory(transaction.category)} • {formatTimeAgo(transaction.timestamp)}
                </Text>
            </View>

            {/* Amount */}
            <View style={styles.amountContainer}>
                <Text style={[styles.amount, isExpense ? styles.expenseAmount : styles.incomeAmount]}>
                    {formatAmount(transaction.amount)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    icon: {
        fontSize: 20,
    },
    details: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    merchant: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
        marginRight: SPACING.sm,
    },
    autoBadge: {
        backgroundColor: COLORS.autoBadge,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    autoBadgeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.background,
    },
    category: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },
    expenseAmount: {
        color: COLORS.error,
    },
    incomeAmount: {
        color: COLORS.success,
    },
});

export default TransactionItem;
