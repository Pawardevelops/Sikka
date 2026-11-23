/**
 * Sikka - Assets
 * Design: design-system/screens/Assets-v2.html
 *
 * Lilac net-worth hero with liquid / savings / investments split ·
 * pastel account tiles · "Coming up" bills · subscriptions (active, paused, deleted).
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../components/Typography';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { useSubscriptions } from '../context/SubscriptionsContext';
import { useTransactions } from '../context/TransactionsContext';
import { COLORS, SPACING, SHADOWS, SIKKA, CATEGORY_PALETTE, getCategoryColors, ACCOUNT_ICONS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Account, Subscription } from '../types';
import { useNavigation } from '../context/NavigationContext';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ui';
import { computeCreditUtilization, computePortfolioPnL } from '../types/accountTypes';

// ==================== HELPERS ====================
export function getDaysUntilDue(dueDate: number): number {
    const now = new Date();
    const today = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return dueDate >= today ? dueDate - today : daysInMonth - today + dueDate;
}

function dueLabel(days: number) {
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    return `in ${days} days`;
}

const LIQUID = ['bank', 'cash', 'wallet'];
const SAVINGS = ['savings'];
const INVEST = ['investment', 'bitcoin'];

const accountValue = (a: Account) => (INVEST.includes(a.type) ? a.investmentValue ?? a.balance : a.balance);

// ==================== SCREEN ====================
export function AssetsScreen() {
    const { formatAmount } = useCurrency();
    const { activeAccounts, netWorth } = useAccounts();
    const { activeSubscriptions, pausedSubscriptions, archivedSubscriptions, monthlyTotal } = useSubscriptions();
    const { activeTransactions } = useTransactions();
    const { selectAccount, openAddModal, openAddSubscriptionModal, selectSubscription } = useNavigation();
    const safeTop = useSafeTop();

    const [subSort, setSubSort] = useState<'date' | 'amount'>('date');
    const [showPaused, setShowPaused] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);

    // ── Net worth split ──
    const split = useMemo(() => {
        const sum = (types: string[]) => activeAccounts.filter((a) => types.includes(a.type)).reduce((s, a) => s + Math.max(0, accountValue(a)), 0);
        const liquid = sum(LIQUID);
        const savings = sum(SAVINGS);
        const invest = sum(INVEST);
        const total = liquid + savings + invest || 1;
        return { liquid, savings, invest, total };
    }, [activeAccounts]);

    // ── Real month-over-month change ──
    const monthChange = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const net = activeTransactions.filter((t) => t.timestamp >= start && t.status !== 'pending').reduce((s, t) => s + t.amount, 0);
        const before = netWorth - net;
        if (!before) return null;
        return (net / Math.abs(before)) * 100;
    }, [activeTransactions, netWorth]);

    // ── Coming up: unpaid subscriptions + credit card dues, soonest first ──
    const comingUp = useMemo(() => {
        const subs = activeSubscriptions
            .filter((s) => !s.isPaid)
            .map((s) => ({ key: s.id, name: s.name, amount: s.myShare ?? s.amount ?? 0, days: getDaysUntilDue(s.dueDate), sub: s as Subscription | undefined, account: undefined as Account | undefined, split: s.isSplit ? s.splitMembers.length + 1 : 0 }));
        const cards = activeAccounts
            .filter((a) => a.type === 'credit' && a.creditCardDetails?.dueDate && a.balance !== 0)
            .map((a) => ({ key: a.id, name: a.name, amount: Math.abs(a.balance), days: getDaysUntilDue(a.creditCardDetails!.dueDate), sub: undefined, account: a, split: 0 }));
        return [...subs, ...cards].sort((a, b) => a.days - b.days);
    }, [activeSubscriptions, activeAccounts]);

    const sortedSubs = useMemo(
        () =>
            [...activeSubscriptions].sort((a, b) =>
                subSort === 'date'
                    ? (a.isPaid ? 999 : getDaysUntilDue(a.dueDate)) - (b.isPaid ? 999 : getDaysUntilDue(b.dueDate))
                    : (b.myShare ?? b.amount ?? 0) - (a.myShare ?? a.amount ?? 0),
            ),
        [activeSubscriptions, subSort],
    );

    // Order tiles: liquid, savings, investments, credit
    const tiles = [...activeAccounts].sort((a, b) => {
        const rank = (t: string) => (LIQUID.includes(t) ? 0 : SAVINGS.includes(t) ? 1 : INVEST.includes(t) ? 2 : 3);
        return rank(a.type) - rank(b.type);
    });

    const pct = (v: number) => `${Math.round((v / split.total) * 100)}%`;

    return (
        <ScrollView style={styles.container} contentContainerStyle={[styles.scroll, { paddingTop: safeTop + SPACING.sm }]} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">Assets</Text>
                <TouchableOpacity style={styles.addAccount} onPress={() => openAddModal()} accessibilityRole="button" activeOpacity={0.85}>
                    <Icon name="add" size={18} color={COLORS.onNight} />
                    <Text style={styles.addAccountText}>Account</Text>
                </TouchableOpacity>
            </View>

            {/* Net worth hero */}
            <View style={styles.hero}>
                <View style={styles.heroBlob} pointerEvents="none" />
                <View style={styles.heroTop}>
                    <View>
                        <Text style={styles.heroOver}>NET WORTH</Text>
                        <Text style={styles.heroValue}>{formatAmount(netWorth)}</Text>
                    </View>
                    {monthChange !== null && Math.abs(monthChange) >= 0.05 && (
                        <View style={styles.changeChip}>
                            <Text style={[styles.changeText, monthChange < 0 && { color: COLORS.error }]}>
                                {monthChange > 0 ? '+' : '−'}{Math.abs(monthChange).toFixed(1)}%
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.splitBar} accessibilityLabel={`Split: ${pct(split.liquid)} liquid, ${pct(split.savings)} savings, ${pct(split.invest)} investments`}>
                    {split.liquid > 0 && <View style={{ flex: split.liquid, backgroundColor: COLORS.night, borderRadius: 8 }} />}
                    {split.savings > 0 && <View style={{ flex: split.savings, backgroundColor: COLORS.brand, borderRadius: 8 }} />}
                    {split.invest > 0 && <View style={{ flex: split.invest, backgroundColor: SIKKA.signal, borderRadius: 8 }} />}
                    {split.liquid + split.savings + split.invest === 0 && <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 8 }} />}
                </View>
                <View style={styles.legend}>
                    <Legend color={COLORS.night} label={`Liquid ${pct(split.liquid)}`} />
                    <Legend color={COLORS.brand} label={`Savings ${pct(split.savings)}`} />
                    <Legend color={SIKKA.signal} label={`Invest ${pct(split.invest)}`} />
                </View>
            </View>

            {/* Account tiles */}
            <View style={styles.grid}>
                {tiles.map((a) => (
                    <AccountTile key={a.id} account={a} formatAmount={formatAmount} onPress={() => selectAccount(a)} />
                ))}
                <TouchableOpacity style={[styles.tile, styles.tileAdd]} onPress={() => openAddModal()} accessibilityRole="button" activeOpacity={0.8}>
                    <Icon name="add" size={24} color={COLORS.text} />
                    <Text style={styles.tileAddText}>Add account</Text>
                </TouchableOpacity>
            </View>

            {/* Coming up */}
            {comingUp.length > 0 && (
                <>
                    <View style={styles.sectionHead}>
                        <Text style={styles.sectionTitle}>Coming up</Text>
                        <Text style={styles.sectionMeta}>{comingUp.length} {comingUp.length === 1 ? 'bill' : 'bills'}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.comingRow}>
                        {comingUp.map((c, i) => {
                            const first = i === 0;
                            return (
                                <TouchableOpacity
                                    key={c.key}
                                    style={[styles.coming, first ? styles.comingNight : styles.comingWhite]}
                                    onPress={() => (c.sub ? selectSubscription(c.sub) : c.account ? selectAccount(c.account) : undefined)}
                                    accessibilityRole="button"
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.comingIcon, { backgroundColor: first ? SIKKA.signal : CATEGORY_PALETTE.bills.bg }]}>
                                        <Text style={styles.comingInitial}>{c.name.trim()[0]?.toUpperCase() ?? '•'}</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.comingName, first && { color: COLORS.onNight }]} numberOfLines={1}>
                                            {c.name} · {formatAmount(c.amount)}
                                        </Text>
                                        <Text style={[styles.comingMeta, first && { color: '#D9D1C1' }]}>
                                            {c.split ? `Split ${c.split} · ` : ''}{dueLabel(c.days)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </>
            )}

            {/* Subscriptions */}
            <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Subscriptions</Text>
                <TouchableOpacity onPress={() => setSubSort(subSort === 'date' ? 'amount' : 'date')} accessibilityRole="button" hitSlop={10}>
                    <Text style={styles.sort}>By {subSort === 'date' ? 'date' : 'amount'} ⇅</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.shareCard}>
                <View style={styles.shareIcon}><Icon name="autorenew" size={20} color={CATEGORY_PALETTE.fun.fg} /></View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.shareValue}>{formatAmount(monthlyTotal)}<Text style={styles.sharePer}> / month</Text></Text>
                    <Text style={styles.shareMeta}>your share of {activeSubscriptions.length} {activeSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}</Text>
                </View>
            </View>

            {sortedSubs.map((s) => (
                <SubRow key={s.id} sub={s} formatAmount={formatAmount} onPress={() => selectSubscription(s)} />
            ))}

            <TouchableOpacity style={styles.dashed} onPress={openAddSubscriptionModal} accessibilityRole="button" activeOpacity={0.75}>
                <Icon name="add" size={20} color={COLORS.text} />
                <Text style={styles.dashedText}>Add subscription</Text>
            </TouchableOpacity>

            {pausedSubscriptions.length > 0 && (
                <Collapsible label={`Paused (${pausedSubscriptions.length})`} open={showPaused} onToggle={() => setShowPaused(!showPaused)}>
                    {pausedSubscriptions.map((s) => (
                        <SubRow key={s.id} sub={s} formatAmount={formatAmount} onPress={() => selectSubscription(s)} muted="Paused" />
                    ))}
                </Collapsible>
            )}
            {archivedSubscriptions.length > 0 && (
                <Collapsible label={`Deleted (${archivedSubscriptions.length})`} open={showDeleted} onToggle={() => setShowDeleted(!showDeleted)} danger>
                    {/* TODO: To enable click-to-restore, pass onPress={() => selectSubscription(s)} */}
                    {archivedSubscriptions.map((s) => (
                        <SubRow key={s.id} sub={s} formatAmount={formatAmount} muted="Deleted" />
                    ))}
                </Collapsible>
            )}
        </ScrollView>
    );
}

// ==================== PIECES ====================
function Legend({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
        </View>
    );
}

function AccountTile({ account: a, formatAmount, onPress }: { account: Account; formatAmount: (n: number) => string; onPress: () => void }) {
    const pair = getCategoryColors(a.type);
    let badge: React.ReactNode = null;
    let sub = '';
    if (a.type === 'credit' && a.creditCardDetails) {
        const util = computeCreditUtilization(a.balance, a.creditCardDetails.creditLimit);
        sub = `${Math.round(util.percent)}% used`;
        if (a.balance !== 0 && a.creditCardDetails.dueDate) {
            const d = getDaysUntilDue(a.creditCardDetails.dueDate);
            badge = <View style={styles.badgeNight}><Text style={styles.badgeNightText}>{d === 0 ? 'Due today' : `${d} days`}</Text></View>;
        }
    } else if (INVEST.includes(a.type) && a.holdings?.length) {
        const p = computePortfolioPnL(a.holdings);
        badge = (
            <View style={styles.badgeWhite}>
                <Text style={[styles.badgeWhiteText, { color: p.totalPnL >= 0 ? COLORS.primary : COLORS.error }]}>
                    {p.totalPnL >= 0 ? '+' : '−'}{Math.abs(p.pnlPercent).toFixed(1)}%
                </Text>
            </View>
        );
    }
    const value = a.type === 'credit' ? -Math.abs(a.balance) : accountValue(a);
    return (
        <TouchableOpacity
            style={[styles.tile, { backgroundColor: pair.bg }]}
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${a.name}, ${formatAmount(value)}`}
        >
            <View style={styles.tileTop}>
                <View style={styles.tileIcon}><Icon name={(ACCOUNT_ICONS[a.type] ?? 'account-balance') as any} size={20} color={pair.fg} /></View>
                {badge}
            </View>
            <View>
                <Text style={[styles.tileName, { color: pair.fg }]} numberOfLines={1}>{a.name}{sub ? ` · ${sub}` : ''}</Text>
                <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(value)}</Text>
            </View>
        </TouchableOpacity>
    );
}

function SubRow({ sub: s, formatAmount, onPress, muted }: { sub: Subscription; formatAmount: (n: number) => string; onPress?: () => void; muted?: string }) {
    const days = getDaysUntilDue(s.dueDate);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const progress = s.isPaid ? 1 : 1 - days / daysInMonth;
    const urgent = !s.isPaid && days <= 3;
    const Wrapper: any = onPress ? TouchableOpacity : View;
    return (
        <Wrapper
            style={[styles.subRow, muted && { opacity: 0.55 }]}
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole={onPress ? 'button' : undefined}
        >
            <View style={styles.subTop}>
                <View style={[styles.subIcon, { backgroundColor: muted ? COLORS.surfaceSunk : CATEGORY_PALETTE.fun.bg }]}>
                    <Icon name={s.icon as any} size={20} color={muted ? COLORS.textSecondary : CATEGORY_PALETTE.fun.fg} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={styles.subNameRow}>
                        <Text style={styles.subName} numberOfLines={1}>{s.name}</Text>
                        {s.isSplit && s.role === 'admin' && <View style={styles.tag}><Text style={styles.tagText}>Split</Text></View>}
                        {s.role === 'member' && <View style={styles.tag}><Text style={styles.tagText}>Member</Text></View>}
                    </View>
                    <Text style={[styles.subMeta, muted === 'Deleted' && { color: COLORS.error }]}>
                        {muted ?? (s.isPaid ? 'Paid this cycle' : `Due ${dueLabel(days)}`)}
                        {!muted && s.role === 'member' && s.payTo ? ` · pay ${s.payTo}` : ''}
                    </Text>
                </View>
                <Text style={styles.subAmount}>{formatAmount(s.myShare ?? s.amount ?? 0)}</Text>
            </View>
            {!muted && (
                <ProgressBar
                    value={progress}
                    height={8}
                    color={s.isPaid ? COLORS.brand : urgent ? SIKKA.signal : COLORS.night}
                    label={s.isPaid ? 'Paid' : `Due ${dueLabel(days)}`}
                />
            )}
        </Wrapper>
    );
}

function Collapsible({ label, open, onToggle, danger, children }: { label: string; open: boolean; onToggle: () => void; danger?: boolean; children: React.ReactNode }) {
    return (
        <View style={{ gap: 10 }}>
            <TouchableOpacity style={styles.collapse} onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                <Text style={[styles.collapseText, danger && { color: COLORS.error }]}>{label}</Text>
                <Icon name={open ? 'expand-less' : 'expand-more'} size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {open && children}
        </View>
    );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 130, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, color: COLORS.text },
    addAccount: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: COLORS.night, flexDirection: 'row', alignItems: 'center', gap: 6 },
    addAccountText: { fontSize: 14, fontWeight: '800', color: COLORS.onNight },

    hero: { backgroundColor: CATEGORY_PALETTE.fun.bg, borderRadius: 32, padding: 20, gap: 12, overflow: 'hidden' },
    heroBlob: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: '#D4C6FF' },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroOver: { fontSize: 13, fontWeight: '800', color: CATEGORY_PALETTE.fun.fg, letterSpacing: 0.4 },
    heroValue: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1, color: COLORS.text, marginTop: 2 },
    changeChip: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
    changeText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
    splitBar: { flexDirection: 'row', height: 16, gap: 4 },
    legend: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, fontWeight: '700', color: CATEGORY_PALETTE.fun.fg },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { width: '48%', flexGrow: 1, height: 124, borderRadius: 28, padding: SPACING.lg, justifyContent: 'space-between' },
    tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tileIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    tileName: { fontSize: 13, fontWeight: '800' },
    tileValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    tileAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#BDB5A6', alignItems: 'center', justifyContent: 'center', gap: 6 },
    tileAddText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    badgeNight: { backgroundColor: COLORS.night, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
    badgeNightText: { fontSize: 12, fontWeight: '800', color: COLORS.onNight },
    badgeWhite: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
    badgeWhiteText: { fontSize: 12, fontWeight: '800' },

    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, marginTop: SPACING.xs },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    sectionMeta: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
    sort: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },

    bleed: { marginHorizontal: -SPACING.lg },
    comingRow: { gap: 10, paddingHorizontal: SPACING.lg },
    coming: { borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 170 },
    comingNight: { backgroundColor: COLORS.night },
    comingWhite: { backgroundColor: COLORS.surface, ...SHADOWS.sm },
    comingIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    comingInitial: { fontSize: 18, fontWeight: '800', color: COLORS.onBrand },
    comingName: { fontSize: 15, fontWeight: '800', color: COLORS.text, maxWidth: 180 },
    comingMeta: { fontSize: 12, color: COLORS.textSecondary },

    shareCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 24, padding: 14, ...SHADOWS.sm },
    shareIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: CATEGORY_PALETTE.fun.bg, alignItems: 'center', justifyContent: 'center' },
    shareValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    sharePer: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
    shareMeta: { fontSize: 13, color: COLORS.textSecondary },

    subRow: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 14, gap: 12, ...SHADOWS.sm },
    subTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    subIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    subNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subName: { fontSize: 16, fontWeight: '800', color: COLORS.text, flexShrink: 1 },
    subMeta: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 1 },
    subAmount: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    tag: { backgroundColor: COLORS.background, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    tagText: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary },

    dashed: { height: 56, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: '#BDB5A6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
    dashedText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    collapse: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: SPACING.sm },
    collapseText: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
});
