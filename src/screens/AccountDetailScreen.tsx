/**
 * Sikka - Account detail
 * Designs: design-system/screens/Credit-card-v2.html, Investments-v2.html
 *
 *  - Credit card: pink card hero, usage ring, due / bill-cycle tiles, "Pay bill"
 *  - Investments / crypto: butter portfolio hero, holdings with share bars
 *  - Bank / cash / wallet / savings: pastel balance hero + quick actions
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '../components/Typography';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { useTransactions } from '../context/TransactionsContext';
import { useNavigation } from '../context/NavigationContext';
import { Account } from '../types';
import { COLORS, SPACING, SHADOWS, SIKKA, CATEGORY_PALETTE, CHART_COLORS, getCategoryColors, ACCOUNT_ICONS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';
import { computeCreditUtilization, computePortfolioPnL } from '../types/accountTypes';
import { PayBillModal } from '../components/PayBillModal';
import { Button, IconButton, Segmented, ProgressBar, Sikku } from '../components/ui';
import { TransactionRow } from '../components/TransactionRow';
import { ACCOUNT_TYPE_LABELS } from './onboarding/AccountSetupScreen';
import { getDaysUntilDue } from './AssetsScreen';

interface AccountDetailScreenProps {
    account: Account;
    onBack: () => void;
    onDelete?: (accountId: string) => void;
}

type TxFilter = 'all' | 'expenses' | 'payments';

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th'}`;

function UsageRing({ percent, size = 96 }: { percent: number; size?: number }) {
    const stroke = 13;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = Math.min(100, Math.max(0, percent));
    const color = p > 60 ? SIKKA.signal : p > 30 ? '#FFD45C' : SIKKA.lime;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${Math.round(p)} percent of limit used`}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.surfaceSunk} strokeWidth={stroke} fill="none" />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={color}
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={`${(p / 100) * c} ${c}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <Text style={styles.ringText}>{Math.round(p)}%</Text>
        </View>
    );
}

export function AccountDetailScreen({ account, onBack, onDelete }: AccountDetailScreenProps) {
    const { formatAmount } = useCurrency();
    const { getTransactionsByAccount } = useTransactions();
    const { updateAccount } = useAccounts();
    const { openAddTransactionModal, openAddModal, selectTransaction } = useNavigation();
    const safeTop = useSafeTop();
    const allTransactions = getTransactionsByAccount(account.id);

    const [payBillVisible, setPayBillVisible] = useState(false);
    const [txFilter, setTxFilter] = useState<TxFilter>('all');

    const isCredit = account.type === 'credit';
    const isInvestment = account.type === 'investment' || account.type === 'bitcoin';
    const isCash = account.type === 'cash' || account.type === 'wallet';
    const pair = getCategoryColors(account.type);

    const transactions = useMemo(() => {
        if (!isCredit || txFilter === 'all') return allTransactions;
        return txFilter === 'expenses' ? allTransactions.filter((t) => t.amount < 0) : allTransactions.filter((t) => t.amount > 0);
    }, [allTransactions, txFilter, isCredit]);

    const handleDelete = () => {
        const msg = `Delete "${account.name}"? Its payments stay in your history.`;
        if (Platform.OS === 'web') {
            if (window.confirm(msg)) onDelete?.(account.id);
            return;
        }
        Alert.alert('Delete account', msg, [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(account.id) },
        ]);
    };

    const handleAdjust = () => {
        // iOS has a native prompt; elsewhere open the account editor.
        if (Platform.OS === 'ios' && Alert.prompt) {
            Alert.prompt('Set balance', 'What does this account hold right now?', (value?: string) => {
                const n = parseFloat(value || '');
                if (!isNaN(n)) updateAccount(account.id, { balance: n });
            }, 'plain-text', String(account.balance));
        } else {
            openAddModal(account);
        }
    };

    // ── Hero per type ──
    const renderHero = () => {
        if (isCredit) {
            return (
                <View style={[styles.cardHero, { backgroundColor: pair.bg }]}>
                    <View style={styles.heroBlob} pointerEvents="none" />
                    <View style={styles.cardTop}>
                        <View style={styles.chip} />
                        <View style={styles.whitePill}><Text style={styles.whitePillText}>Credit card</Text></View>
                    </View>
                    <View>
                        <Text style={[styles.over, { color: pair.fg }]}>OUTSTANDING</Text>
                        <Text style={styles.cardAmount}>{formatAmount(Math.abs(account.balance))}</Text>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>{account.name}</Text>
                </View>
            );
        }
        if (isInvestment) {
            const p = account.holdings?.length ? computePortfolioPnL(account.holdings) : null;
            const value = account.investmentValue ?? account.balance;
            return (
                <View style={[styles.hero, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}>
                    <View style={styles.heroBlob} pointerEvents="none" />
                    <Text style={[styles.over, { color: CATEGORY_PALETTE.bills.fg }]}>PORTFOLIO</Text>
                    <Text style={styles.heroValue}>{formatAmount(value)}</Text>
                    {p && (
                        <View style={styles.pillRow}>
                            <View style={styles.whitePill}><Text style={styles.whitePillText}>Invested {formatAmount(p.totalInvested)}</Text></View>
                            <View style={styles.nightPill}>
                                <Text style={styles.nightPillText}>
                                    {p.totalPnL >= 0 ? '+' : '−'}{formatAmount(Math.abs(p.totalPnL))} · {Math.abs(p.pnlPercent).toFixed(1)}%
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            );
        }
        return (
            <View style={[styles.hero, { backgroundColor: pair.bg }]}>
                <View style={styles.heroBlob} pointerEvents="none" />
                <View style={styles.heroRow}>
                    <View style={styles.heroIcon}><Icon name={(ACCOUNT_ICONS[account.type] ?? 'account-balance') as any} size={26} color={pair.fg} /></View>
                    <View style={styles.whitePill}><Text style={styles.whitePillText}>{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</Text></View>
                </View>
                <Text style={[styles.over, { color: pair.fg, marginTop: SPACING.md }]}>BALANCE</Text>
                <Text style={[styles.heroValue, account.balance < 0 && { color: COLORS.error }]}>{formatAmount(account.balance)}</Text>
            </View>
        );
    };

    const renderCreditDetails = () => {
        if (!isCredit || !account.creditCardDetails) return null;
        const d = account.creditCardDetails;
        const util = computeCreditUtilization(account.balance, d.creditLimit);
        const health = util.percent > 60 ? { label: 'High usage', bg: CATEGORY_PALETTE.dining.bg, fg: CATEGORY_PALETTE.dining.fg }
            : util.percent > 30 ? { label: 'Watch usage', bg: CATEGORY_PALETTE.bills.bg, fg: CATEGORY_PALETTE.bills.fg }
                : { label: 'Healthy usage', bg: CATEGORY_PALETTE.groceries.bg, fg: CATEGORY_PALETTE.groceries.fg };
        const dueDays = getDaysUntilDue(d.dueDate);
        const now = new Date();
        const dueDate = new Date(now.getFullYear(), now.getMonth() + (d.dueDate < now.getDate() ? 1 : 0), d.dueDate);
        return (
            <>
                <View style={styles.usageCard}>
                    <UsageRing percent={util.percent} />
                    <View style={{ flex: 1, gap: 6 }}>
                        <View style={[styles.healthChip, { backgroundColor: health.bg }]}>
                            <Text style={[styles.healthText, { color: health.fg }]}>{health.label}</Text>
                        </View>
                        <View style={styles.kv}><Text style={styles.k}>Limit</Text><Text style={styles.v}>{formatAmount(d.creditLimit)}</Text></View>
                        <View style={styles.kv}><Text style={styles.k}>Available</Text><Text style={styles.v}>{formatAmount(util.available)}</Text></View>
                    </View>
                </View>
                <View style={styles.tiles}>
                    <View style={[styles.tile, { backgroundColor: CATEGORY_PALETTE.dining.bg }]}>
                        <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.dining.fg }]}>DUE</Text>
                        <Text style={styles.tileValue}>{dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                        <Text style={[styles.tileMeta, { color: CATEGORY_PALETTE.dining.fg }]}>
                            {account.balance === 0 ? 'nothing due' : dueDays === 0 ? 'today' : `in ${dueDays} days`}
                        </Text>
                    </View>
                    <View style={[styles.tile, { backgroundColor: CATEGORY_PALETTE.transport.bg }]}>
                        <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.transport.fg }]}>BILL CYCLE</Text>
                        <Text style={styles.tileValue}>{ordinal(d.billingCycleDate)}</Text>
                        <Text style={[styles.tileMeta, { color: CATEGORY_PALETTE.transport.fg }]}>each month</Text>
                    </View>
                </View>
            </>
        );
    };

    const renderHoldings = () => {
        if (!isInvestment || !account.holdings?.length) return null;
        const p = computePortfolioPnL(account.holdings);
        return (
            <>
                {p.holdings.map((h, i) => {
                    const up = h.pnl >= 0;
                    const share = p.totalValue ? h.currentValue / p.totalValue : 0;
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    return (
                        <View key={h.holding.id} style={styles.holding}>
                            <View style={styles.holdingTop}>
                                <View style={[styles.holdingBadge, { backgroundColor: color }]}>
                                    <Text style={styles.holdingBadgeText}>{h.holding.ticker.slice(0, 2).toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.holdingName}>{h.holding.ticker}</Text>
                                    <Text style={styles.holdingMeta}>
                                        {h.holding.quantity} × {formatAmount(h.holding.avgBuyPrice)} → {formatAmount(h.holding.currentPrice)}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.holdingValue}>{formatAmount(h.currentValue)}</Text>
                                    <Text style={[styles.holdingPnl, { color: up ? COLORS.primary : COLORS.error }]}>
                                        {up ? '+' : '−'}{formatAmount(Math.abs(h.pnl))}
                                    </Text>
                                </View>
                            </View>
                            <ProgressBar value={share} color={color} label={`${Math.round(share * 100)}% of portfolio`} />
                        </View>
                    );
                })}
                <View style={styles.note}>
                    <Icon name="cloud-off" size={20} color={CATEGORY_PALETTE.fun.fg} />
                    <Text style={styles.noteText}>Prices are offline · Sikka never fetches them</Text>
                </View>
            </>
        );
    };

    const actions = isCredit
        ? [
            { icon: 'shopping-bag', label: 'Spend', onPress: () => openAddTransactionModal({ type: 'expense', accountId: account.id }) },
        ]
        : isInvestment
            ? []
            : [
                { icon: 'south-west', label: 'Add money', onPress: () => openAddTransactionModal({ type: 'income', accountId: account.id }) },
                { icon: 'north-east', label: 'Spend', onPress: () => openAddTransactionModal({ type: 'expense', accountId: account.id }) },
                { icon: 'swap-horiz', label: 'Move', onPress: () => openAddTransactionModal({ type: 'transfer', accountId: account.id }) },
                ...(isCash ? [{ icon: 'tune', label: 'Set balance', onPress: handleAdjust }] : []),
            ];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: safeTop + SPACING.sm }]} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <IconButton icon="chevron-left" label="Back" onPress={onBack} iconSize={26} />
                    <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{account.name}</Text>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openAddModal(account)} accessibilityRole="button">
                        <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} accessibilityRole="button" accessibilityLabel="Delete account">
                        <Icon name="delete-outline" size={22} color={CATEGORY_PALETTE.shopping.fg} />
                    </TouchableOpacity>
                </View>

                {renderHero()}
                {renderCreditDetails()}
                {renderHoldings()}

                {actions.length > 0 && (
                    <View style={styles.actions}>
                        {actions.map((a) => (
                            <TouchableOpacity key={a.label} style={styles.action} onPress={a.onPress} accessibilityRole="button" activeOpacity={0.85}>
                                <View style={styles.actionIcon}><Icon name={a.icon as any} size={20} color={COLORS.text} /></View>
                                <Text style={styles.actionText}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {!isInvestment && (
                    <>
                        <View style={styles.sectionHead}>
                            <Text style={styles.sectionTitle}>Payments</Text>
                        </View>
                        {isCredit && allTransactions.length > 0 && (
                            <Segmented
                                label="Filter"
                                value={txFilter}
                                onChange={setTxFilter}
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'expenses', label: 'Spent' },
                                    { value: 'payments', label: 'Paid off' },
                                ]}
                            />
                        )}
                        {transactions.length === 0 ? (
                            <View style={styles.empty}>
                                <Sikku size={56} mood="sleepy" />
                                <Text style={styles.emptyText}>Nothing here yet</Text>
                            </View>
                        ) : (
                            transactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} onPress={() => selectTransaction(tx)} />)
                        )}
                    </>
                )}
            </ScrollView>

            {isCredit && account.balance !== 0 && (
                <View style={styles.footer}>
                    <Button label="Pay bill" onPress={() => setPayBillVisible(true)} />
                </View>
            )}

            {isCredit && <PayBillModal visible={payBillVisible} ccAccount={account} onClose={() => setPayBillVisible(false)} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 120, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
    editBtn: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', ...SHADOWS.sm },
    editText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: CATEGORY_PALETTE.shopping.bg, alignItems: 'center', justifyContent: 'center' },

    hero: { borderRadius: 32, padding: 20, gap: 4, overflow: 'hidden' },
    heroBlob: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.35)' },
    heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    over: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
    heroValue: { fontSize: 42, lineHeight: 46, fontWeight: '800', letterSpacing: -1, color: COLORS.text },
    pillRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: SPACING.sm },
    whitePill: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start' },
    whitePillText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    nightPill: { backgroundColor: COLORS.night, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
    nightPillText: { fontSize: 13, fontWeight: '800', color: COLORS.brand },

    cardHero: { height: 196, borderRadius: 32, padding: 20, justifyContent: 'space-between', overflow: 'hidden' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: { width: 46, height: 34, borderRadius: 9, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.night },
    cardAmount: { fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1, color: COLORS.text },
    cardName: { fontSize: 16, fontWeight: '800', letterSpacing: 1, color: COLORS.text },

    usageCard: { backgroundColor: COLORS.surface, borderRadius: 30, paddingVertical: SPACING.lg, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, ...SHADOWS.md },
    ringText: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    healthChip: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
    healthText: { fontSize: 12, fontWeight: '800' },
    kv: { flexDirection: 'row', justifyContent: 'space-between' },
    k: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    v: { fontSize: 14, fontWeight: '800', color: COLORS.text },

    tiles: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, borderRadius: 24, padding: 14 },
    tileOver: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
    tileValue: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 2 },
    tileMeta: { fontSize: 13, fontWeight: '700' },

    holding: { backgroundColor: COLORS.surface, borderRadius: 26, padding: 14, gap: 10, ...SHADOWS.sm },
    holdingTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    holdingBadge: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    holdingBadgeText: { fontSize: 14, fontWeight: '800', color: COLORS.onBrand },
    holdingName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    holdingMeta: { fontSize: 12, color: COLORS.textSecondary },
    holdingValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    holdingPnl: { fontSize: 12, fontWeight: '800' },
    note: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CATEGORY_PALETTE.fun.bg, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14 },
    noteText: { flex: 1, fontSize: 14, fontWeight: '700', color: CATEGORY_PALETTE.fun.fg },

    actions: { flexDirection: 'row', gap: SPACING.sm },
    action: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 22, paddingVertical: 12, alignItems: 'center', gap: 6, ...SHADOWS.sm },
    actionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
    actionText: { fontSize: 13, fontWeight: '800', color: COLORS.text },

    sectionHead: { paddingHorizontal: 4, marginTop: SPACING.xs },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    empty: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xl },
    emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },

    footer: { position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: 24 },
});
