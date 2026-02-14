/**
 * Sikka - Account Detail Screen
 * Shows details and transactions for a specific account
 */

import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useTransactions, CATEGORY_ICONS, formatTimeAgo } from '../context/TransactionsContext';
import { useNavigation } from '../context/NavigationContext';
import { Account } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';

interface AccountDetailScreenProps {
    account: Account;
    onBack: () => void;
    onDelete?: (accountId: string) => void;
}

export function AccountDetailScreen({ account, onBack, onDelete }: AccountDetailScreenProps) {
    const { formatAmount } = useCurrency();
    const { getTransactionsByAccount } = useTransactions();
    const { openAddTransactionModal, openAddModal } = useNavigation();
    const transactions = getTransactionsByAccount(account.id);
    const safeTop = useSafeTop();

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
                    <Text style={[styles.balanceAmount, account.balance < 0 && styles.negativeBalance]}>
                        {formatAmount(account.balance)}
                    </Text>
                    <Text style={styles.lastUpdated}>
                        Last updated: {account.lastUpdated || 'Today'}
                    </Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openAddTransactionModal({ type: 'income', accountId: account.id })}
                    >
                        <View style={styles.actionIcon}>
                            <Icon name="add" size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.actionLabel}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openAddTransactionModal({ type: 'transfer', accountId: account.id })}
                    >
                        <View style={styles.actionIcon}>
                            <Icon name="swap-horiz" size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.actionLabel}>Transfer</Text>
                    </TouchableOpacity>
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

                {/* Transactions */}
                <Text style={styles.sectionTitle}>TRANSACTIONS</Text>
                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="assignment" size={32} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                ) : (
                    transactions.map((tx) => (
                        <View key={tx.id} style={styles.transactionRow}>
                            <View style={styles.txIcon}>
                                <Icon name={CATEGORY_ICONS[tx.category] as any} size={24} color={COLORS.text} />
                            </View>
                            <View style={styles.txContent}>
                                <View style={styles.txTitleRow}>
                                    <Text style={styles.txMerchant}>{tx.merchant}</Text>
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
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    backIcon: { fontSize: 20, color: COLORS.text },
    headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '600', color: COLORS.text },
    deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' },
    deleteIcon: { fontSize: 18 },

    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },

    // Balance Card
    balanceCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xxl, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.xxl },
    accountIconLarge: { width: 80, height: 80, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
    accountType: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.primary, letterSpacing: 1, marginBottom: SPACING.sm },
    balanceAmount: { fontSize: 40, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
    negativeBalance: { color: COLORS.error },
    lastUpdated: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },

    // Actions
    actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.xxl },
    actionBtn: { alignItems: 'center' },
    actionIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm, ...SHADOWS.sm },
    actionLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

    // Section
    sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.lg },

    // Empty State
    emptyState: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xxl, alignItems: 'center' },
    emptyIcon: { fontSize: 32, marginBottom: SPACING.md },
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
});

export default AccountDetailScreen;
