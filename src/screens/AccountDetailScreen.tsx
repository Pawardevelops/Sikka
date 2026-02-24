/**
 * Sikka - Account Detail Screen
 * Type-specific detail views:
 *  - Credit Cards:    Utilization bar, Available Credit, Due Date
 *  - Investment/Crypto: Holdings table with P&L per holding
 *  - Cash/Wallet:     Quick Adjust hint
 */

import React, { useState, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { useTransactions, CATEGORY_ICONS, formatTimeAgo } from '../context/TransactionsContext';
import { useNavigation } from '../context/NavigationContext';
import { Account } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';
import { computeCreditUtilization, computePortfolioPnL } from '../types/accountTypes';
import { PayBillModal } from '../components/PayBillModal';

interface AccountDetailScreenProps {
    account: Account;
    onBack: () => void;
    onDelete?: (accountId: string) => void;
}

type TxFilter = 'all' | 'expenses' | 'payments';

/** Compute how many days until (or since) the CC due date this month. */
function getDueDateInfo(dueDay: number): { label: string; color: string; daysUntil: number } {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), dueDay);
    // If due date already passed this month, look at next month
    const target = thisMonth >= now ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
    const diffMs = target.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { label: `Overdue by ${Math.abs(daysUntil)} days`, color: COLORS.error, daysUntil };
    if (daysUntil === 0) return { label: 'Due today', color: COLORS.error, daysUntil };
    if (daysUntil <= 3) return { label: `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`, color: COLORS.error, daysUntil };
    if (daysUntil <= 7) return { label: `Due in ${daysUntil} days`, color: '#F59E0B', daysUntil };
    return { label: `Due in ${daysUntil} days`, color: COLORS.success, daysUntil };
}

export function AccountDetailScreen({ account, onBack, onDelete }: AccountDetailScreenProps) {
    const { formatAmount } = useCurrency();
    const { getTransactionsByAccount } = useTransactions();
    const { updateAccount } = useAccounts();
    const { openAddTransactionModal, openAddModal } = useNavigation();
    const allTransactions = getTransactionsByAccount(account.id);
    const safeTop = useSafeTop();

    const [payBillVisible, setPayBillVisible] = useState(false);
    const [txFilter, setTxFilter] = useState<TxFilter>('all');

    const isCreditCard = account.type === 'credit';
    const isInvestment = account.type === 'investment' || account.type === 'bitcoin';
    const isLiquidCash = account.type === 'cash' || account.type === 'wallet';

    // Display value: investment = portfolio value, others = balance
    const displayValue = isInvestment ? (account.investmentValue ?? account.balance) : account.balance;

    // Filtered transactions for CC tabs
    const transactions = useMemo(() => {
        if (!isCreditCard || txFilter === 'all') return allTransactions;
        if (txFilter === 'expenses') return allTransactions.filter(t => t.amount < 0);
        return allTransactions.filter(t => t.amount > 0); // payments
    }, [allTransactions, txFilter, isCreditCard]);

    // Due date info for CC
    const dueDateInfo = isCreditCard && account.creditCardDetails
        ? getDueDateInfo(account.creditCardDetails.dueDate)
        : null;

    const handleDelete = () => {
        Alert.alert(
            'Delete Account',
            `Are you sure you want to delete "${account.name}"? This action can be undone from settings.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete?.(account.id),
                },
            ]
        );
    };

    const handleQuickAdjust = () => {
        Alert.prompt?.(
            'Quick Adjust Balance',
            'Enter your actual current balance:',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Update',
                    onPress: (value?: string) => {
                        const newBalance = parseFloat(value || '0');
                        if (!isNaN(newBalance)) {
                            updateAccount(account.id, { balance: newBalance });
                        }
                    },
                },
            ],
            'plain-text',
            String(account.balance),
        );
    };

    // ── Credit Card Detail Section ──
    const renderCreditCardDetails = () => {
        if (!isCreditCard || !account.creditCardDetails) return null;
        const util = computeCreditUtilization(account.balance, account.creditCardDetails.creditLimit);
        const barColor = util.status === 'danger' ? COLORS.creditDanger
            : util.status === 'warning' ? COLORS.creditWarning
                : COLORS.creditSafe;

        return (
            <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>CREDIT CARD DETAILS</Text>
                <View style={styles.detailCard}>
                    {/* Utilization Bar */}
                    <View style={styles.utilRow}>
                        <Text style={styles.utilLabel}>Credit Utilization</Text>
                        <Text style={[styles.utilPercent, { color: barColor }]}>
                            {util.percent.toFixed(0)}%
                        </Text>
                    </View>
                    <View style={styles.utilTrack}>
                        <View style={[styles.utilFill, {
                            width: `${Math.min(util.percent, 100)}%`,
                            backgroundColor: barColor,
                        }]} />
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Available Credit</Text>
                            <Text style={[styles.statValue, { color: COLORS.creditSafe }]}>
                                {formatAmount(util.available)}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Credit Limit</Text>
                            <Text style={styles.statValue}>
                                {formatAmount(account.creditCardDetails.creditLimit)}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Outstanding</Text>
                            <Text style={[styles.statValue, { color: COLORS.error }]}>
                                {formatAmount(Math.abs(account.balance))}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Due Day</Text>
                            <Text style={styles.statValue}>
                                {account.creditCardDetails.dueDate}th
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // ── Investment Holdings Section ──
    const renderInvestmentDetails = () => {
        if (!isInvestment || !account.holdings || account.holdings.length === 0) return null;
        const portfolio = computePortfolioPnL(account.holdings);
        const isPositive = portfolio.totalPnL >= 0;

        return (
            <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>PORTFOLIO</Text>

                {/* Portfolio Summary */}
                <View style={styles.detailCard}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Value</Text>
                            <Text style={styles.statValue}>{formatAmount(portfolio.totalValue)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Invested</Text>
                            <Text style={styles.statValue}>{formatAmount(portfolio.totalInvested)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>P&L</Text>
                            <Text style={[styles.statValue, { color: isPositive ? COLORS.investGrowth : COLORS.investLoss }]}>
                                {isPositive ? '+' : ''}{formatAmount(portfolio.totalPnL)}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Return</Text>
                            <Text style={[styles.statValue, { color: isPositive ? COLORS.investGrowth : COLORS.investLoss }]}>
                                {isPositive ? '+' : ''}{portfolio.pnlPercent.toFixed(1)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Holdings Table */}
                <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>HOLDINGS</Text>
                {portfolio.holdings.map((h) => {
                    const hPositive = h.pnl >= 0;
                    return (
                        <View key={h.holding.id} style={styles.holdingCard}>
                            <View style={styles.holdingTop}>
                                <View>
                                    <Text style={styles.holdingTicker}>{h.holding.ticker}</Text>
                                    <Text style={styles.holdingQty}>{h.holding.quantity} units</Text>
                                </View>
                                <View style={styles.holdingRight}>
                                    <Text style={styles.holdingValue}>{formatAmount(h.currentValue)}</Text>
                                    <View style={[styles.holdingPnlBadge, {
                                        backgroundColor: hPositive ? COLORS.investGrowth + '18' : COLORS.investLoss + '18',
                                    }]}>
                                        <Icon
                                            name={hPositive ? 'trending-up' : 'trending-down'}
                                            size={10}
                                            color={hPositive ? COLORS.investGrowth : COLORS.investLoss}
                                        />
                                        <Text style={[styles.holdingPnlText, {
                                            color: hPositive ? COLORS.investGrowth : COLORS.investLoss,
                                        }]}>
                                            {hPositive ? '+' : ''}{h.pnlPercent.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.holdingMeta}>
                                <Text style={styles.holdingMetaText}>Avg: {formatAmount(h.holding.avgBuyPrice)}</Text>
                                <Text style={styles.holdingMetaText}>LTP: {formatAmount(h.holding.currentPrice)}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: safeTop }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{account.name}</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                    <Icon name="delete" size={20} color={COLORS.error} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.accountIconLarge}>
                        <Icon name={account.icon as any} size={40} color={COLORS.text} />
                    </View>
                    <Text style={styles.accountType}>
                        {account.type.toUpperCase()}
                    </Text>
                    <Text style={[styles.balanceAmount, displayValue < 0 && styles.negativeBalance]}>
                        {formatAmount(displayValue)}
                    </Text>
                    <Text style={styles.lastUpdated}>
                        Last updated: {account.lastUpdated || 'Today'}
                    </Text>

                    {/* Inline Utilization for CC */}
                    {isCreditCard && account.creditCardDetails && (() => {
                        const util = computeCreditUtilization(account.balance, account.creditCardDetails.creditLimit);
                        const barColor = util.status === 'danger' ? COLORS.creditDanger
                            : util.status === 'warning' ? COLORS.creditWarning : COLORS.creditSafe;
                        return (
                            <View style={styles.inlineUtil}>
                                <View style={styles.inlineUtilTrack}>
                                    <View style={[styles.inlineUtilFill, {
                                        width: `${Math.min(util.percent, 100)}%`,
                                        backgroundColor: barColor,
                                    }]} />
                                </View>
                                <Text style={[styles.inlineUtilText, { color: barColor }]}>
                                    {util.percent.toFixed(0)}% utilization
                                </Text>
                            </View>
                        );
                    })()}
                </View>

                {/* Due Date Badge (CC only) */}
                {dueDateInfo && account.balance !== 0 && (
                    <View style={[styles.dueBadge, { borderColor: dueDateInfo.color + '40' }]}>
                        <Icon name="schedule" size={16} color={dueDateInfo.color} />
                        <Text style={[styles.dueBadgeText, { color: dueDateInfo.color }]}>{dueDateInfo.label}</Text>
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    {isCreditCard ? (
                        /* CC-specific: Pay Bill as primary action */
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => setPayBillVisible(true)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                                <Icon name="payment" size={24} color={COLORS.primary} />
                            </View>
                            <Text style={[styles.actionLabel, { color: COLORS.primary }]}>Pay Bill</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => openAddTransactionModal({ type: 'income', accountId: account.id })}
                        >
                            <View style={styles.actionIcon}>
                                <Icon name="add" size={24} color={COLORS.text} />
                            </View>
                            <Text style={styles.actionLabel}>Add</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openAddTransactionModal({ type: isCreditCard ? 'expense' : 'transfer', accountId: account.id })}
                    >
                        <View style={styles.actionIcon}>
                            <Icon name={isCreditCard ? 'shopping-cart' : 'swap-horiz'} size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.actionLabel}>{isCreditCard ? 'Spend' : 'Transfer'}</Text>
                    </TouchableOpacity>
                    {isLiquidCash && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleQuickAdjust}>
                            <View style={styles.actionIcon}>
                                <Icon name="tune" size={24} color={COLORS.text} />
                            </View>
                            <Text style={styles.actionLabel}>Adjust</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionBtn}>
                        <View style={styles.actionIcon}>
                            <Icon name="bar-chart" size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.actionLabel}>Stats</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openAddModal(account)}
                    >
                        <View style={styles.actionIcon}>
                            <Icon name="edit" size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.actionLabel}>Edit</Text>
                    </TouchableOpacity>
                </View>

                {/* Type-Specific Details */}
                {renderCreditCardDetails()}
                {renderInvestmentDetails()}

                {/* Transactions */}
                <Text style={styles.sectionTitle}>TRANSACTIONS</Text>

                {/* CC filter tabs */}
                {isCreditCard && allTransactions.length > 0 && (
                    <View style={styles.filterRow}>
                        {(['all', 'expenses', 'payments'] as TxFilter[]).map(f => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterTab, txFilter === f && styles.filterTabActive]}
                                onPress={() => setTxFilter(f)}
                            >
                                <Text style={[styles.filterTabText, txFilter === f && styles.filterTabTextActive]}>
                                    {f === 'all' ? 'All' : f === 'expenses' ? 'Expenses' : 'Payments'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="assignment" size={32} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
                        <Text style={styles.emptyText}>
                            {txFilter === 'payments' ? 'No payments yet' : txFilter === 'expenses' ? 'No expenses yet' : 'No transactions yet'}
                        </Text>
                    </View>
                ) : (
                    transactions.map((tx) => {
                        const isPayment = isCreditCard && tx.amount > 0;
                        return (
                            <View key={tx.id} style={styles.transactionRow}>
                                <View style={[styles.txIcon, isPayment && { backgroundColor: COLORS.success + '18' }]}>
                                    <Icon
                                        name={isPayment ? 'check-circle' : (CATEGORY_ICONS[tx.category] as any)}
                                        size={24}
                                        color={isPayment ? COLORS.success : COLORS.text}
                                    />
                                </View>
                                <View style={styles.txContent}>
                                    <View style={styles.txTitleRow}>
                                        <Text style={styles.txMerchant}>{tx.merchant}</Text>
                                        {isPayment && (
                                            <View style={styles.paidBadge}>
                                                <Text style={styles.paidBadgeText}>PAID</Text>
                                            </View>
                                        )}
                                        {tx.isAuto && (
                                            <View style={styles.autoBadge}>
                                                <Text style={styles.autoBadgeText}>AUTO</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.txCategory}>
                                        {tx.category.charAt(0).toUpperCase() + tx.category.slice(1)} • {formatTimeAgo(tx.timestamp)}
                                    </Text>
                                </View>
                                <View style={styles.txAmount}>
                                    <Text style={[styles.txAmountText, tx.amount > 0 && styles.incomeAmount]}>
                                        {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount, true)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Pay Bill Modal */}
            {isCreditCard && (
                <PayBillModal
                    visible={payBillVisible}
                    ccAccount={account}
                    onClose={() => setPayBillVisible(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '600', color: COLORS.text },
    deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' },

    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },

    // Balance Card
    balanceCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xxl, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.xxl },
    accountIconLarge: { width: 80, height: 80, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
    accountType: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.primary, letterSpacing: 1, marginBottom: SPACING.sm },
    balanceAmount: { fontSize: 40, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
    negativeBalance: { color: COLORS.error },
    lastUpdated: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },

    // Inline utilization on balance card
    inlineUtil: { width: '100%', marginTop: SPACING.md },
    inlineUtilTrack: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    inlineUtilFill: { height: '100%', borderRadius: 3 },
    inlineUtilText: { fontSize: FONT_SIZE.xs, fontWeight: '600', textAlign: 'center' },

    // Actions
    actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.xxl },
    actionBtn: { alignItems: 'center' },
    actionIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm, ...SHADOWS.sm },
    actionLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

    // Detail Sections
    detailSection: { marginBottom: SPACING.xl },
    detailCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },

    // Credit Card Utilization
    utilRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    utilLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
    utilPercent: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
    utilTrack: { height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.lg },
    utilFill: { height: '100%', borderRadius: 4 },

    // Stats Grid
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    statItem: { width: '50%', paddingVertical: SPACING.sm },
    statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 2 },
    statValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },

    // Holdings
    holdingCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.sm },
    holdingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
    holdingTicker: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
    holdingQty: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
    holdingRight: { alignItems: 'flex-end' },
    holdingValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
    holdingPnlBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 },
    holdingPnlText: { fontSize: 10, fontWeight: '700' },
    holdingMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    holdingMetaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

    // Section
    sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.lg },

    // Empty State
    emptyState: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xxl, alignItems: 'center' },
    emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

    // Transactions
    transactionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
    txIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
    txContent: { flex: 1 },
    txTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    txMerchant: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginRight: SPACING.sm },
    autoBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    autoBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.background },
    txCategory: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
    txAmount: { alignItems: 'flex-end' },
    txAmountText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.error },
    incomeAmount: { color: COLORS.success },

    // Due Date Badge
    dueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        marginBottom: SPACING.lg,
    },
    dueBadgeText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },

    // Filter Tabs
    filterRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: 3,
        marginBottom: SPACING.lg,
    },
    filterTab: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    filterTabActive: { backgroundColor: COLORS.primary },
    filterTabText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted },
    filterTabTextActive: { color: COLORS.background },

    // Payment Badge
    paidBadge: { backgroundColor: COLORS.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: SPACING.xs },
    paidBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.background },
});

export default AccountDetailScreen;
