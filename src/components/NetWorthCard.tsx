/**
 * Sikka - Net Worth Card Component
 * Main balance display with change indicators
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { Icon } from './Icon';

interface NetWorthCardProps {
    netWorth: number;
    monthlyDelta: number;
    percentChange: number;
    activeAssets: number;
}

export function NetWorthCard({
    netWorth,
    monthlyDelta,
    percentChange,
    activeAssets,
}: NetWorthCardProps) {
    const { formatCurrency } = useSettings();
    const isPositiveChange = percentChange >= 0;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>NET WORTH</Text>

            <View style={styles.balanceRow}>
                <Text style={styles.balance}>{formatCurrency(netWorth)}</Text>
                <View style={[styles.changeBadge, isPositiveChange ? styles.positiveChange : styles.negativeChange]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon
                            name={isPositiveChange ? 'trending-up' : 'trending-down'}
                            size={16}
                            color={isPositiveChange ? COLORS.primary : COLORS.error}
                        />
                        <Text style={[styles.changeText, isPositiveChange ? styles.positiveText : styles.negativeText]}>
                            {Math.abs(percentChange)}%
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>MONTHLY DELTA</Text>
                    <Text style={styles.statValue}>
                        {monthlyDelta >= 0 ? '+' : ''}{formatCurrency(monthlyDelta)}
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>ASSETS</Text>
                    <Text style={styles.statValue}>{activeAssets} Active</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xxl,
        ...SHADOWS.lg,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    label: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.primary,
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    balance: {
        fontSize: FONT_SIZE.display,
        fontWeight: '700',
        color: COLORS.text,
        marginRight: SPACING.md,
    },
    changeBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
    },
    positiveChange: {
        backgroundColor: COLORS.primaryMuted,
    },
    negativeChange: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    changeText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
    },
    positiveText: {
        color: COLORS.primary,
    },
    negativeText: {
        color: COLORS.error,
    },
    statsRow: {
        flexDirection: 'row',
    },
    statItem: {
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginRight: SPACING.md,
    },
    statLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    statValue: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
});

export default NetWorthCard;
