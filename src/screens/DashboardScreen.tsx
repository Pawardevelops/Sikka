/**
 * Sikka - Home
 * Design: design-system/screens/Home-v2.html
 *
 * Sikku greeting · lime net-worth hero with 6-month sparkline ·
 * bento (review / accounts / spent today) · "This week" stacked bars with
 * on-pace line · today's payments.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming, ReduceMotion } from 'react-native-reanimated';
import { EASE, Rise, growY, popIn } from '../motion';
import { Text } from '../components/Typography';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { useTransactions } from '../context/TransactionsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useNavigation } from '../context/NavigationContext';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors, MOTION } from '../constants/theme';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';
import { Sikku, IconButton } from '../components/ui';
import { TransactionRow } from '../components/TransactionRow';
import { Transaction } from '../types';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Net worth at the end of each of the last `n` months, derived from transactions. */
function netWorthSeries(netWorth: number, txs: Transaction[], n = 6) {
    const now = new Date();
    const points: number[] = [];
    for (let k = n - 1; k >= 0; k--) {
        const monthEnd = k === 0 ? Date.now() : new Date(now.getFullYear(), now.getMonth() - k + 1, 1).getTime();
        const after = txs.filter((t) => t.timestamp >= monthEnd).reduce((s, t) => s + t.amount, 0);
        points.push(netWorth - after);
    }
    return points;
}

function Sparkline({ values, width = 130, height = 44 }: { values: number[]; width?: number; height?: number }) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
        const x = 2 + (i / (values.length - 1)) * (width - 6);
        const y = height - 4 - ((v - min) / span) * (height - 10);
        return [x, y];
    });
    const last = pts[pts.length - 1];
    const rising = values[values.length - 1] >= values[0];
    const length = pts.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])), 0);

    // `sk-draw`: the line draws itself in after the hero has risen.
    const drawn = useSharedValue(0);
    useEffect(() => {
        drawn.value = 0;
        drawn.value = withDelay(
            MOTION.durBase,
            withTiming(1, { duration: MOTION.durCelebrate, easing: EASE.out, reduceMotion: ReduceMotion.System }),
        );
    }, [length, drawn]);
    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
    return (
        <Svg width={width} height={height} accessibilityLabel={`Net worth ${rising ? 'rising' : 'falling'} over 6 months`}>
            <AnimatedPolyline
                animatedProps={lineProps}
                strokeDasharray={[length, length]}
                points={pts.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke={COLORS.onBrand}
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Circle cx={last[0]} cy={last[1]} r={5} fill={COLORS.onBrand} />
        </Svg>
    );
}

export function DashboardScreen() {
    const { formatAmount, balancesVisible, toggleBalancesVisible } = useCurrency();
    const { activeAccounts, netWorth } = useAccounts();
    const { todayTransactions, transactions } = useTransactions();
    const { data: onboardingData } = useOnboarding();
    const safeTop = useSafeTop();
    const { openAllTransactions, openNotifyCenter, selectTransaction, goToTab, openAddTransactionModal } = useNavigation();

    const live = useMemo(() => transactions.filter((t) => !t.isDeleted && t.status !== 'pending' && t.status !== 'ignored'), [transactions]);
    const pending = transactions.filter((t) => t.status === 'pending' && !t.isDeleted).length;

    // ── Numbers ──
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthTx = live.filter((t) => t.timestamp >= monthStart);
    const monthNet = monthTx.reduce((s, t) => s + t.amount, 0);
    const monthSpent = Math.abs(monthTx.filter((t) => t.amount < 0 && t.category !== 'transfer').reduce((s, t) => s + t.amount, 0));
    const todaySpent = Math.abs(todayTransactions.filter((t) => t.amount < 0 && t.category !== 'transfer').reduce((s, t) => s + t.amount, 0));
    const limit = onboardingData.monthlySpendLimit ?? 30000;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate() + 1;
    const perDayLeft = Math.max(0, (limit - monthSpent) / daysLeft);
    const overBy = monthSpent - limit;
    const series = useMemo(() => netWorthSeries(netWorth, live), [netWorth, live]);

    // ── This week: 7 days ending today, stacked by category ──
    const week = useMemo(() => {
        const today0 = startOfDay(now);
        return Array.from({ length: 7 }, (_, i) => {
            const dayStart = today0 - (6 - i) * DAY;
            const dayTx = live.filter((t) => t.amount < 0 && t.category !== 'transfer' && t.timestamp >= dayStart && t.timestamp < dayStart + DAY);
            const byCat: Record<string, number> = {};
            dayTx.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + Math.abs(t.amount); });
            return {
                label: new Date(dayStart).toLocaleDateString('en-IN', { weekday: 'narrow' }),
                isToday: i === 6,
                total: Object.values(byCat).reduce((a, b) => a + b, 0),
                parts: Object.entries(byCat).sort((a, b) => b[1] - a[1]),
            };
        });
    }, [live]);
    const weekMax = Math.max(1, ...week.map((d) => d.total));

    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: safeTop + SPACING.sm }]} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Rise index={0} style={styles.header}>
                    <Sikku size={48} simple />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greeting}>{greeting}</Text>
                        <Text style={styles.name} accessibilityRole="header" numberOfLines={1}>
                            {onboardingData.userName?.trim() || 'Hello there'}
                        </Text>
                    </View>
                    <IconButton icon="tune" label="Settings" onPress={() => goToTab('settings')} size={48} />
                </Rise>

                {/* Net worth hero */}
                <Rise index={1} style={styles.hero}>
                    <View style={styles.heroNight} pointerEvents="none"><Text style={styles.heroRupee}>₹</Text></View>
                    <View style={styles.heroDot} pointerEvents="none" />
                    <View style={styles.heroTop}>
                        <Text style={styles.heroLabel}>Net worth</Text>
                    </View>
                    <TouchableOpacity
                        onPress={toggleBalancesVisible}
                        accessibilityRole="button"
                        accessibilityLabel={balancesVisible ? 'Hide balances' : 'Show balances'}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.heroValue}>{formatAmount(netWorth)}</Text>
                    </TouchableOpacity>
                    <View style={styles.heroBottom}>
                        <View style={styles.heroChip}>
                            <Text style={styles.heroChipText}>
                                {monthNet >= 0 ? '+' : ''}{formatAmount(monthNet)} this month
                            </Text>
                        </View>
                        {balancesVisible && new Set(series).size > 1 && <Sparkline values={series} />}
                    </View>
                </Rise>

                {/* Bento */}
                <View style={styles.bento}>
                    <Rise index={2} style={{ flex: 1 }}>
                        <TouchableOpacity
                            style={styles.reviewTile}
                            onPress={openNotifyCenter}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel={pending ? `Review, ${pending} waiting` : 'Review inbox, all clear'}
                        >
                            <View>
                                <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.dining.fg }]}>REVIEW</Text>
                                <Animated.View key={pending} entering={popIn()}>
                                    <Text style={styles.reviewValue}>{pending ? `${pending} waiting` : 'All clear'}</Text>
                                </Animated.View>
                            </View>
                            <View style={styles.miniDeck} importantForAccessibility="no-hide-descendants">
                                <View style={styles.miniDeckBack} />
                                <View style={styles.miniDeckTop}>
                                    <View style={styles.miniDeckIcon} />
                                    <View style={styles.miniDeckLine} />
                                </View>
                            </View>
                            <View style={styles.reviewGo}><Icon name="arrow-forward" size={18} color={COLORS.onNight} /></View>
                        </TouchableOpacity>
                    </Rise>
                    <View style={styles.bentoCol}>
                        <Rise index={3}>
                            <TouchableOpacity
                                style={[styles.smallTile, { backgroundColor: CATEGORY_PALETTE.fun.bg }]}
                                onPress={() => goToTab('assets')}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                            >
                                <View style={styles.smallIcon}><Icon name="account-balance-wallet" size={20} color={CATEGORY_PALETTE.fun.fg} /></View>
                                <View>
                                    <Text style={styles.smallValue}>{activeAccounts.length}</Text>
                                    <Text style={[styles.smallLabel, { color: CATEGORY_PALETTE.fun.fg }]}>
                                        {activeAccounts.length === 1 ? 'account' : 'accounts'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Rise>
                        <Rise index={3}>
                            <View style={[styles.smallTile, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}>
                                <View style={styles.smallIcon}><Icon name="schedule" size={20} color={CATEGORY_PALETTE.bills.fg} /></View>
                                <View style={{ flexShrink: 1 }}>
                                    <Text style={styles.smallValue} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(todaySpent)}</Text>
                                    <Text style={[styles.smallLabel, { color: CATEGORY_PALETTE.bills.fg }]}>spent today</Text>
                                </View>
                            </View>
                        </Rise>
                    </View>
                </View>

                {/* This week */}
                <Rise index={4} style={styles.weekCard}>
                    <View style={styles.weekHead}>
                        <Text style={styles.weekTitle}>This week</Text>
                        <Text style={[styles.pace, overBy > 0 && { color: COLORS.error }]}>
                            {overBy > 0 ? `Over limit by ${formatAmount(overBy)}` : `On pace · ${formatAmount(Math.round(perDayLeft))}/day left`}
                        </Text>
                    </View>
                    <View style={styles.bars} accessibilityLabel="Daily spending this week by category">
                        {week.map((d, i) => (
                            <Animated.View key={i} entering={growY(i)} style={styles.barCol}>
                                {d.total === 0 ? (
                                    <View style={[styles.barPart, { height: 4, backgroundColor: COLORS.surfaceSunk }]} />
                                ) : d.isToday ? (
                                    <View style={[styles.barPart, { height: Math.max(8, (d.total / weekMax) * 64), backgroundColor: COLORS.night }]} />
                                ) : (
                                    d.parts.map(([cat, amt]) => (
                                        <View
                                            key={cat}
                                            style={[styles.barPart, { height: Math.max(6, (amt / weekMax) * 64), backgroundColor: getCategoryColors(cat).bg }]}
                                        />
                                    ))
                                )}
                            </Animated.View>
                        ))}
                    </View>
                    <View style={styles.days}>
                        {week.map((d, i) => (
                            <Text key={i} style={[styles.day, d.isToday && { color: COLORS.text }]}>{d.label}</Text>
                        ))}
                    </View>
                </Rise>

                {/* Today */}
                <Rise index={5} style={styles.todayHead}>
                    <Text style={styles.todayTitle}>Today</Text>
                    <TouchableOpacity onPress={openAllTransactions} accessibilityRole="button" hitSlop={10}>
                        <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                </Rise>
                <Rise index={6} style={{ gap: 10 }}>
                    {todayTransactions.length === 0 ? (
                        <TouchableOpacity style={styles.empty} onPress={() => openAddTransactionModal()} activeOpacity={0.85} accessibilityRole="button">
                            <Sikku size={44} mood="sleepy" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.emptyTitle}>Nothing spent today</Text>
                                <Text style={styles.emptyBody}>Payments from SMS show up here. Tap to add one by hand.</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        todayTransactions.slice(0, 3).map((tx) => (
                            <TransactionRow key={tx.id} transaction={tx} onPress={() => selectTransaction(tx)} />
                        ))
                    )}
                </Rise>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 130, gap: SPACING.md },

    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    greeting: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    name: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: COLORS.text },

    hero: { backgroundColor: COLORS.brand, borderRadius: 34, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, overflow: 'hidden' },
    heroNight: {
        position: 'absolute',
        right: -22,
        top: -22,
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: COLORS.night,
        justifyContent: 'flex-end',
        paddingLeft: 30,
        paddingBottom: 24,
    },
    heroRupee: { fontSize: 34, fontWeight: '800', color: COLORS.brand },
    heroDot: {
        position: 'absolute',
        right: 58,
        top: 58,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF7A3D',
        borderWidth: 4,
        borderColor: COLORS.brand,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    heroLabel: { fontSize: 14, fontWeight: '700', color: CATEGORY_PALETTE.groceries.fg },
    heroValue: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1.5, color: COLORS.onBrand, marginTop: 2 },
    heroBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6, minHeight: 44 },
    heroChip: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
    heroChipText: { fontSize: 13, fontWeight: '800', color: COLORS.onBrand },

    bento: { flexDirection: 'row', gap: 10 },
    bentoCol: { flex: 1, gap: 10 },
    reviewTile: {
        height: 176,
        borderRadius: 30,
        padding: SPACING.lg,
        backgroundColor: CATEGORY_PALETTE.dining.bg,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    tileOver: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
    reviewValue: { fontSize: 30, lineHeight: 32, fontWeight: '800', color: COLORS.text, marginTop: 2 },
    miniDeck: { height: 56 },
    miniDeckBack: { position: 'absolute', left: 14, right: 22, top: 0, height: 40, borderRadius: 14, backgroundColor: '#FFBE98', transform: [{ rotate: '-4deg' }] },
    miniDeckTop: {
        position: 'absolute',
        left: 0,
        right: 30,
        top: 10,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    miniDeckIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: CATEGORY_PALETTE.groceries.bg },
    miniDeckLine: { width: 36, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceSunk },
    reviewGo: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.night,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallTile: { height: 83, borderRadius: 26, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
    smallIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    smallValue: { fontSize: 22, lineHeight: 24, fontWeight: '800', color: COLORS.text },
    smallLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },

    weekCard: { backgroundColor: COLORS.surface, borderRadius: 30, paddingVertical: SPACING.lg, paddingHorizontal: 18, gap: 10, ...SHADOWS.md },
    weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACING.sm },
    weekTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    pace: { fontSize: 13, fontWeight: '800', color: COLORS.primary, flexShrink: 1, textAlign: 'right' },
    bars: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 72 },
    barCol: { flex: 1, gap: 3, justifyContent: 'flex-end', transformOrigin: 'bottom' },
    barPart: { borderRadius: 6 },
    days: { flexDirection: 'row', gap: 8 },
    day: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

    todayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: SPACING.xs, paddingHorizontal: 2 },
    todayTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    seeAll: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
    empty: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, ...SHADOWS.md },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    emptyBody: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary, marginTop: 2 },
});
