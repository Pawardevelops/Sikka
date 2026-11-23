/**
 * Sikka - Activity
 * Design: design-system/screens/Activity-v2.html
 * Search · category chips · day groups with day totals · transaction rows.
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '../components/Typography';
import { useCurrency } from '../context/CurrencyContext';
import { useTransactions } from '../context/TransactionsContext';
import { useNavigation } from '../context/NavigationContext';
import { COLORS, SPACING, SHADOWS, getPaletteKey } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';
import { IconButton, Chip, Sikku } from '../components/ui';
import { TransactionRow, CATEGORY_LABELS } from '../components/TransactionRow';
import { TransactionCategory } from '../types';

interface AllTransactionsScreenProps {
    onBack: () => void;
}

const FILTERS: (TransactionCategory | 'all')[] = ['all', 'dining', 'groceries', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'income', 'transfer'];

function dayLabel(ts: number) {
    const d = new Date(ts);
    const today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function AllTransactionsScreen({ onBack }: AllTransactionsScreenProps) {
    const { formatAmount } = useCurrency();
    const { activeTransactions } = useTransactions();
    const { selectTransaction, openAddTransactionModal } = useNavigation();
    const safeTop = useSafeTop();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<TransactionCategory | 'all'>('all');

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = activeTransactions
            .filter((t) => t.status !== 'pending')
            .filter((t) => filter === 'all' || t.category === filter)
            .filter((t) => !q || t.merchant.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q))
            .sort((a, b) => b.timestamp - a.timestamp);
        const out: { label: string; total: number; items: typeof list }[] = [];
        list.forEach((t) => {
            const label = dayLabel(t.timestamp);
            let g = out[out.length - 1];
            if (!g || g.label !== label) { g = { label, total: 0, items: [] }; out.push(g); }
            g.items.push(t);
            if (t.category !== 'transfer') g.total += t.amount;
        });
        return out;
    }, [activeTransactions, query, filter]);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: safeTop + SPACING.sm }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[]}
            >
                <View style={styles.header}>
                    <IconButton icon="chevron-left" label="Back" onPress={onBack} iconSize={26} />
                    <Text style={styles.title} accessibilityRole="header">Activity</Text>
                    <IconButton icon="add" label="Add by hand" variant="lime" onPress={() => openAddTransactionModal()} />
                </View>

                <View style={styles.search}>
                    <Icon name="search" size={20} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search payees and notes"
                        value={query}
                        onChangeText={setQuery}
                        accessibilityLabel="Search"
                        returnKeyType="search"
                    />
                    {!!query && (
                        <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={10}>
                            <Icon name="close" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
                    {FILTERS.map((f) => (
                        <Chip
                            key={f}
                            label={f === 'all' ? 'All' : CATEGORY_LABELS[f]}
                            palette={f === 'all' || filter === f ? undefined : getPaletteKey(f)}
                            tone={filter === f ? 'night' : undefined}
                            selected={false}
                            onPress={() => setFilter(f)}
                        />
                    ))}
                </ScrollView>

                {groups.length === 0 ? (
                    <View style={styles.empty}>
                        <Sikku size={72} mood="thinking" />
                        <Text style={styles.emptyTitle}>{query || filter !== 'all' ? 'Nothing matches' : 'No payments yet'}</Text>
                        <Text style={styles.emptyBody}>
                            {query || filter !== 'all' ? 'Try another word or category.' : 'Payments you add or Sikka catches will show up here.'}
                        </Text>
                    </View>
                ) : (
                    groups.map((g) => (
                        <View key={g.label} style={styles.group}>
                            <View style={styles.groupHead}>
                                <Text style={styles.groupTitle}>{g.label}</Text>
                                <View style={styles.groupTotal}>
                                    <Text style={styles.groupTotalText}>{g.total > 0 ? '+' : ''}{formatAmount(g.total)}</Text>
                                </View>
                            </View>
                            {g.items.map((tx) => (
                                <TransactionRow key={tx.id} transaction={tx} onPress={() => selectTransaction(tx)} />
                            ))}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 60, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    title: { flex: 1, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: COLORS.text },

    search: {
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 18,
        ...SHADOWS.sm,
    },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text, height: 52 },

    chipsWrap: { marginHorizontal: -SPACING.lg },
    chips: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },

    group: { gap: 10 },
    groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingTop: 4 },
    groupTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    groupTotal: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
    groupTotalText: { fontSize: 13, fontWeight: '800', color: COLORS.text },

    empty: { alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.xxxl },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: SPACING.sm },
    emptyBody: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
});
