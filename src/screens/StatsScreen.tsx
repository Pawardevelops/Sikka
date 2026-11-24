/**
 * Sikka - Stats
 * Design: design-system/screens/Stats-v2.html
 * Period switch · category bubbles · "How spends felt" · one insight · sentiment heatmap.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { Text } from '../components/Typography';
import { SentimentHeatmapSection } from '../components/stats/SentimentHeatmapSection';
import { useSafeTop } from '../components/SafeScreen';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors } from '../constants/theme';
import { useTransactions, CATEGORY_ICONS } from '../context/TransactionsContext';
import { useCurrency } from '../context/CurrencyContext';
import { Segmented, MoodFace, MOODS, Sikku } from '../components/ui';
import { Icon } from '../components/Icon';
import { CATEGORY_LABELS } from '../components/TransactionRow';

type Period = 'week' | 'month' | 'year';
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function periodStart(p: Period) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (p === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    if (p === 'month') d.setDate(1);
    if (p === 'year') d.setMonth(0, 1);
    return d.getTime();
}

export function StatsScreen() {
    const { openScreen } = useNavigation();
    const safeTop = useSafeTop();
    const { activeTransactions, refreshTransactions } = useTransactions();
    const { formatAmount } = useCurrency();
    const [period, setPeriod] = useState<Period>('month');

    useEffect(() => {
        refreshTransactions();
    }, []);

    const spends = useMemo(() => {
        const start = periodStart(period);
        return activeTransactions.filter((t) => t.amount < 0 && t.category !== 'transfer' && t.status !== 'pending' && t.timestamp >= start);
    }, [activeTransactions, period]);

    const total = spends.reduce((s, t) => s + Math.abs(t.amount), 0);

    const byCategory = useMemo(() => {
        const m: Record<string, number> = {};
        spends.forEach((t) => { m[t.category] = (m[t.category] || 0) + Math.abs(t.amount); });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
    }, [spends]);

    const byMood = useMemo(() => {
        const m: Record<string, number> = {};
        let tagged = 0;
        spends.forEach((t) => {
            const mood = t.sentimentIds?.[0];
            if (!mood) return;
            m[mood] = (m[mood] || 0) + Math.abs(t.amount);
            tagged += Math.abs(t.amount);
        });
        return { rows: MOODS.map((x) => ({ ...x, amount: m[x.id] || 0 })).filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount), tagged };
    }, [spends]);

    const insight = useMemo(() => {
        const impulse = spends.filter((t) => t.sentimentIds?.includes('impulse'));
        if (impulse.length >= 2) {
            const days: number[] = Array(7).fill(0);
            const cats: Record<string, number> = {};
            impulse.forEach((t) => {
                days[new Date(t.timestamp).getDay()] += Math.abs(t.amount);
                cats[t.category] = (cats[t.category] || 0) + Math.abs(t.amount);
            });
            const day = WEEKDAYS[days.indexOf(Math.max(...days))];
            const cat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
            return { lead: 'Impulse spends peak on ', strong: `${day}s`, tail: `, mostly ${CATEGORY_LABELS[cat]}.` };
        }
        if (byCategory.length) {
            const [cat, amt] = byCategory[0];
            return { lead: 'Most of it went to ', strong: CATEGORY_LABELS[cat], tail: ` — ${Math.round((amt / total) * 100)}% of your spending.` };
        }
        return null;
    }, [spends, byCategory, total]);

    const label = period === 'week' ? 'This week' : period === 'month' ? `${new Date().toLocaleDateString('en-IN', { month: 'long' })} so far` : `${new Date().getFullYear()} so far`;
    const max = byCategory[0]?.[1] ?? 1;

    return (
        <ScrollView style={styles.container} contentContainerStyle={[styles.scroll, { paddingTop: safeTop + SPACING.sm }]} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.title} accessibilityRole="header">Stats</Text>
                    <TouchableOpacity onPress={() => openScreen({ name: 'recap' })} accessibilityRole="button" style={styles.recapBtn}>
                        <Icon name="insights" size={18} color={COLORS.text} />
                        <Text style={styles.recapText}>Last month's recap</Text>
                    </TouchableOpacity>
                </View>
                <Segmented
                    label="Period"
                    value={period}
                    onChange={setPeriod}
                    style={styles.period}
                    options={[
                        { value: 'week', label: 'Week' },
                        { value: 'month', label: 'Month' },
                        { value: 'year', label: 'Year' },
                    ]}
                />
            </View>

            {/* Category bubbles */}
            <View style={styles.card}>
                <View style={styles.cardHead}>
                    <Text style={styles.cardLabel}>{label}</Text>
                    <Text style={styles.total}>{formatAmount(total, true)}</Text>
                </View>
                {byCategory.length === 0 ? (
                    <View style={styles.empty}>
                        <Sikku size={64} mood="sleepy" />
                        <Text style={styles.emptyText}>Nothing spent yet</Text>
                    </View>
                ) : (
                    <View
                        style={styles.bubbles}
                        accessibilityLabel={`Spending by category: ${byCategory.map(([c, a]) => `${CATEGORY_LABELS[c]} ${formatAmount(a, true)}`).join(', ')}`}
                    >
                        {byCategory.slice(0, 6).map(([cat, amt]) => {
                            const pair = getCategoryColors(cat);
                            const size = 64 + Math.sqrt(amt / max) * 84;
                            return (
                                <View key={cat} style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, backgroundColor: pair.bg }]}>
                                    <Icon name={(CATEGORY_ICONS as any)[cat] ?? 'category'} size={size > 110 ? 22 : 16} color={pair.fg} />
                                    <Text style={[styles.bubbleLabel, { color: pair.fg }]} numberOfLines={1}>{CATEGORY_LABELS[cat]}</Text>
                                    <Text style={[styles.bubbleValue, size < 96 && { fontSize: 13 }]} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(amt, true)}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* How spends felt */}
            <View style={styles.feltCard}>
                <Text style={styles.feltTitle}>How spends felt</Text>
                {byMood.rows.length === 0 ? (
                    <Text style={styles.feltEmpty}>Tag how a payment felt when you review it, and the pattern shows up here.</Text>
                ) : (
                    byMood.rows.map((m) => {
                        const pct = m.amount / byMood.tagged;
                        return (
                            <View key={m.id} style={styles.feltRow} accessibilityLabel={`${m.label} ${Math.round(pct * 100)} percent`}>
                                <MoodFace mood={m.id} size={26} />
                                <Text style={styles.feltLabel}>{m.label}</Text>
                                <View style={styles.feltTrack}>
                                    <View style={{ width: `${pct * 100}%`, height: 10, borderRadius: 5, backgroundColor: m.fill }} />
                                </View>
                                <Text style={styles.feltPct}>{Math.round(pct * 100)}%</Text>
                            </View>
                        );
                    })
                )}
            </View>

            {insight && (
                <View style={styles.insight}>
                    <View style={styles.insightIcon}><Icon name="lightbulb-outline" size={20} color={CATEGORY_PALETTE.bills.fg} /></View>
                    <Text style={styles.insightText}>
                        {insight.lead}<Text style={styles.insightStrong}>{insight.strong}</Text>{insight.tail}
                    </Text>
                </View>
            )}

            <View style={styles.heatmap}>
                <SentimentHeatmapSection />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    recapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: 20, height: 40, paddingHorizontal: 14 },
    recapText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 130, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, color: COLORS.text },
    period: { flex: 1, maxWidth: 230 },

    card: { backgroundColor: COLORS.surface, borderRadius: 32, padding: SPACING.lg, ...SHADOWS.md },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    cardLabel: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
    total: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    bubbles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: SPACING.md },
    bubble: { alignItems: 'center', justifyContent: 'center', padding: 6 },
    bubbleLabel: { fontSize: 12, fontWeight: '800', marginTop: 2 },
    bubbleValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    empty: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xl },
    emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },

    feltCard: { backgroundColor: COLORS.night, borderRadius: 30, paddingVertical: SPACING.lg, paddingHorizontal: 18, gap: 10 },
    feltTitle: { fontSize: 18, fontWeight: '800', color: COLORS.onNight },
    feltEmpty: { fontSize: 14, lineHeight: 20, color: '#D9D1C1' },
    feltRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    feltLabel: { width: 72, fontSize: 13, fontWeight: '700', color: COLORS.onNight },
    feltTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#2E2B24', overflow: 'hidden' },
    feltPct: { width: 38, textAlign: 'right', fontSize: 13, fontWeight: '800', color: COLORS.onNight },

    insight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 14 },
    insightIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    insightText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#3D2C00' },
    insightStrong: { fontWeight: '800' },

    heatmap: { marginTop: SPACING.sm },
});

export default StatsScreen;
