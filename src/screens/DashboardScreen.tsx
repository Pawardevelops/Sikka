/**
 * Sikka - Home
 * Design: design-system/screens/Home-v2.html
 *
 * Sikku greeting · lime net-worth hero with 6-month sparkline ·
 * bento (review / accounts / spent today) · "This week" stacked bars with
 * on-pace line · today's payments.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Rise, growY, popIn, useFirstVisit } from '../motion';
import { Text } from '../components/Typography';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { useTransactions } from '../context/TransactionsContext';
import { usePrefs } from '../context/PrefsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useNavigation } from '../context/NavigationContext';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors } from '../constants/theme';

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

    return (
        <Svg width={width} height={height} accessibilityLabel={`Money in your accounts ${rising ? 'rising' : 'falling'} over 6 months`}>
            <Polyline
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
    const { activeAccounts } = useAccounts();
    // Home is opened tens of times a day: sections rise in on the first visit only.
    const firstVisit = useFirstVisit('home');
    const { prefs, update } = usePrefs();
    // v3: the hero shows money in your accounts (same number as Assets); cards are shown as owed.
    const inAccounts = activeAccounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
    const cardOwed = activeAccounts.filter((a) => a.type === 'credit').reduce((s, a) => s + Math.abs(a.balance), 0);
    const { todayTransactions, transactions } = useTransactions();
    const { data: onboardingData } = useOnboarding();
    const safeTop = useSafeTop();
    const { openAllTransactions, openNotifyCenter, openScreen, goToTab, openAddTransactionModal } = useNavigation();

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
    const series = useMemo(() => netWorthSeries(inAccounts, live.filter((t) => activeAccounts.find((a) => a.id === t.accountId)?.type !== 'credit')), [inAccounts, live, activeAccounts]);
    const weekBudget = Math.round((limit * 7) / daysInMonth);
    const pendingAmount = transactions.filter((t) => t.status === 'pending' && !t.isDeleted).reduce((s, t) => s + Math.abs(t.amount), 0);
    // Day 7 nudge: data only on this phone and no Drive backup yet.
    const daysSinceStart = Math.floor((Date.now() - prefs.firstOpenedAt) / DAY);
    const showBackupNudge = daysSinceStart >= 7 && !onboardingData.autoBackupEnabled && !prefs.backupNudgeDismissedAt;
    // First days of a month: last month's recap is ready.
    const showRecap = now.getDate() <= 7 && live.some((t) => t.timestamp < monthStart);

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
                <Rise skip={!firstVisit} index={0} style={styles.header}>
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
                <Rise skip={!firstVisit} index={1} style={styles.hero}>
                    <View style={styles.heroNight} pointerEvents="none"><Text style={styles.heroRupee}>₹</Text></View>
                    <View style={styles.heroDot} pointerEvents="none" />
                    <View style={styles.heroTop}>
                        <Text style={styles.heroLabel}>In your accounts</Text>
                    </View>
                    <TouchableOpacity
                        onPress={toggleBalancesVisible}
                        accessibilityRole="button"
                        accessibilityLabel={balancesVisible ? 'Hide balances' : 'Show balances'}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(inAccounts)}</Text>
                    </TouchableOpacity>
                    <View style={styles.heroBottom}>
                        {cardOwed > 0 ? (
                            <TouchableOpacity style={styles.heroChip} onPress={() => goToTab('assets')} accessibilityRole="button">
                                <Text style={styles.heroChipText}>Card owed {formatAmount(cardOwed)}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.heroChip}>
                                <Text style={styles.heroChipText}>
                                    {monthNet >= 0 ? '+' : ''}{formatAmount(monthNet)} this month
                                </Text>
                            </View>
                        )}
                        {balancesVisible && new Set(series).size > 1 && <Sparkline values={series} />}
                    </View>
                </Rise>

                {/* Bento */}
                <View style={styles.bento}>
                    <Rise skip={!firstVisit} index={2} style={{ flex: 1 }}>
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
                                {pending > 0 && <Text style={[styles.reviewAmount]}>{formatAmount(pendingAmount)}</Text>}
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
                        <Rise skip={!firstVisit} index={3}>
                            <View style={[styles.smallTile, { backgroundColor: CATEGORY_PALETTE.fun.bg }]}>
                                <View style={styles.smallIcon}><Icon name="local-fire-department" size={20} color={CATEGORY_PALETTE.fun.fg} /></View>
                                <View>
                                    <Text style={styles.smallValue}>{prefs.streak.count} {prefs.streak.count === 1 ? 'day' : 'days'}</Text>
                                    <Text style={[styles.smallLabel, { color: CATEGORY_PALETTE.fun.fg }]}>review streak</Text>
                                </View>
                            </View>
                        </Rise>
                        <Rise skip={!firstVisit} index={3}>
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
                <Rise skip={!firstVisit} index={4} style={styles.weekCard}>
                    <View style={styles.weekHead}>
                        <View>
                            <Text style={styles.weekOver}>THIS WEEK</Text>
                            <Text style={styles.weekTitle}>
                                {formatAmount(week.reduce((s2, d) => s2 + d.total, 0))}
                                <Text style={styles.weekOf}> of {formatAmount(weekBudget)}</Text>
                            </Text>
                        </View>
                        <Text style={[styles.pace, overBy > 0 && { color: COLORS.error }]}>
                            {overBy > 0 ? `Over limit by ${formatAmount(overBy)}` : `On pace · ${formatAmount(Math.round(perDayLeft))}/day left`}
                        </Text>
                    </View>
                    <View style={styles.bars} accessibilityLabel="Daily spending this week by category">
                        {week.map((d, i) => (
                            <Animated.View key={i} entering={firstVisit ? growY(i) : undefined} style={styles.barCol}>
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

                {showBackupNudge && (
                    <Rise skip={!firstVisit} index={5}>
                        <TouchableOpacity style={styles.nudge} onPress={() => openScreen({ name: 'backup' })} accessibilityRole="button" activeOpacity={0.85}>
                            <View style={styles.nudgeIcon}><Icon name="cloud-upload" size={22} color={CATEGORY_PALETTE.transport.fg} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.nudgeTitle}>Day {daysSinceStart}: your data is only on this phone</Text>
                                <Text style={styles.nudgeBody}>Back up to Google Drive in 1 tap</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => update({ backupNudgeDismissedAt: Date.now() })}
                                accessibilityRole="button"
                                accessibilityLabel="Dismiss backup reminder"
                                hitSlop={12}
                            >
                                <Icon name="close" size={20} color={CATEGORY_PALETTE.transport.fg} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Rise>
                )}
                {showRecap && (
                    <Rise skip={!firstVisit} index={5}>
                        <TouchableOpacity style={[styles.nudge, { backgroundColor: CATEGORY_PALETTE.bills.bg }]} onPress={() => openScreen({ name: 'recap' })} accessibilityRole="button" activeOpacity={0.85}>
                            <View style={styles.nudgeIcon}><Icon name="insights" size={22} color={CATEGORY_PALETTE.bills.fg} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.nudgeTitle}>
                                    Your {new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-IN', { month: 'long' })} recap is ready
                                </Text>
                                <Text style={styles.nudgeBody}>Where it went, what you regret, what to cut</Text>
                            </View>
                            <Icon name="chevron-right" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                    </Rise>
                )}

                {/* Today */}
                <Rise skip={!firstVisit} index={5} style={styles.todayHead}>
                    <Text style={styles.todayTitle}>Today</Text>
                    <TouchableOpacity onPress={openAllTransactions} accessibilityRole="button" hitSlop={10}>
                        <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                </Rise>
                <Rise skip={!firstVisit} index={6} style={{ gap: 10 }}>
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
                            <TransactionRow key={tx.id} transaction={tx} onPress={() => openScreen({ name: 'paymentStory', txId: tx.id })} />
                        ))
                    )}
                </Rise>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    reviewAmount: { fontSize: 15, fontWeight: '800', color: CATEGORY_PALETTE.dining.fg, marginTop: 2 },
    weekOver: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    weekOf: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
    nudge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.transport.bg, borderRadius: 26, padding: SPACING.lg },
    nudgeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    nudgeTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    nudgeBody: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 2 },
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
    weekTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
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
