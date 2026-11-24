/**
 * Sikka - Transaction row
 * Design: design-system/components/TransactionRow
 * White card · 48px pastel category tile · merchant · meta · display-font amount.
 * Money out stays ink (−₹240); money in is lime-deep (+₹162).
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from './Typography';
import { Icon } from './Icon';
import { COLORS, SHADOWS, SPACING, getCategoryColors, CATEGORY_PALETTE } from '../constants/theme';
import { CATEGORY_ICONS } from '../context/TransactionsContext';
import { useCurrency } from '../context/CurrencyContext';
import { Transaction } from '../types';
import { MoodFace } from './ui/MoodFace';

export const CATEGORY_LABELS: Record<string, string> = {
    groceries: 'Groceries',
    dining: 'Dining',
    transport: 'Transport',
    shopping: 'Shopping',
    entertainment: 'Fun',
    utilities: 'Bills',
    health: 'Health',
    income: 'Income',
    transfer: 'Transfer',
    other: 'Other',
};

export function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

interface Props {
    transaction: Transaction;
    /** Second line; defaults to the note in quotes, else "Category · time". */
    meta?: string;
    onPress?: () => void;
    flat?: boolean; // no card/shadow (inside a grouped list)
}

export function TransactionRow({ transaction: tx, meta, onPress, flat }: Props) {
    const { formatAmount } = useCurrency();
    const pair = getCategoryColors(tx.category);
    const isIn = tx.amount > 0;
    const isGot = isIn && tx.category !== 'transfer'; // money in wears the lime card
    const mood = tx.sentimentIds?.[0];
    const line2 = meta ?? (tx.notes ? `"${tx.notes}"` : `${CATEGORY_LABELS[tx.category] ?? tx.category} · ${formatTime(tx.timestamp)}`);
    const amount = `${isIn ? '+' : ''}${formatAmount(tx.amount)}`;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={0.8}
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityLabel={`${tx.merchant}, ${amount}, ${line2}`}
            style={[styles.row, !flat && styles.card, isGot && !flat && styles.cardIn]}
        >
            <View style={[styles.tile, { backgroundColor: isGot && !flat ? COLORS.surface : pair.bg }]}>
                <Icon name={(CATEGORY_ICONS[tx.category] || 'receipt-long') as any} size={22} color={pair.fg} />
            </View>
            <View style={styles.main}>
                <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{tx.merchant}</Text>
                    {tx.isAuto && (
                        <View style={styles.auto}><Text style={styles.autoText}>SMS</Text></View>
                    )}
                </View>
                <Text style={[styles.meta, isGot && !flat && { color: CATEGORY_PALETTE.groceries.fg }]} numberOfLines={1}>{line2}</Text>
            </View>
            <View style={styles.right}>
                <Text style={[styles.amount, isIn && !(isGot && !flat) && styles.amountIn]}>{amount}</Text>
                {mood && <MoodFace mood={mood} size={20} />}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: 14 },
    card: { backgroundColor: COLORS.surface, borderRadius: 24, ...SHADOWS.md },
    cardIn: { backgroundColor: COLORS.brand, shadowOpacity: 0, elevation: 0 },
    right: { alignItems: 'flex-end', gap: 2 },
    tile: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    main: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontSize: 16, fontWeight: '800', color: COLORS.text, flexShrink: 1 },
    auto: { backgroundColor: CATEGORY_PALETTE.groceries.bg, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
    autoText: { fontSize: 12, fontWeight: '800', color: CATEGORY_PALETTE.groceries.fg, letterSpacing: 0.4 },
    meta: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 1 },
    amount: { fontSize: 19, fontWeight: '800', color: COLORS.text },
    amountIn: { color: COLORS.primary },
});
