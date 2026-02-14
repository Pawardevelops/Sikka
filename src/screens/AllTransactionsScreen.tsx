/**
 * Sikka - All Transactions Screen
 * Shows complete transaction history
 */

import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { useTransactions, CATEGORY_ICONS, formatTimeAgo } from '../context/TransactionsContext';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';

interface AllTransactionsScreenProps {
    onBack: () => void;
}

export function AllTransactionsScreen({ onBack }: AllTransactionsScreenProps) {
    const { formatAmount } = useCurrency();
    const { getAccount } = useAccounts();
    const { activeTransactions } = useTransactions();

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const transactionAnims = useRef(activeTransactions.map(() => new Animated.Value(0))).current;
    const safeTop = useSafeTop();

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        Animated.stagger(50, transactionAnims.map(anim =>
            Animated.spring(anim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        )).start();
    }, []);

    // Group transactions by date
    const groupedTransactions = activeTransactions.reduce((groups, tx) => {
        const date = new Date(tx.timestamp).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
        });
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(tx);
        return groups;
    }, {} as Record<string, typeof activeTransactions>);

    return (
        <View style={styles.container}>
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim, paddingTop: safeTop }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="arrow-back" size={24} color={COLORS.primary} />
                        <Text style={[styles.backBtnText, { marginLeft: 4 }]}>Back</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.screenTitle}>All Transactions</Text>
                <View style={styles.placeholder} />
            </Animated.View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {activeTransactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="receipt-long" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.lg }} />
                        <Text style={styles.emptyTitle}>No transactions yet</Text>
                        <Text style={styles.emptySubtitle}>Add your first transaction from the dashboard</Text>
                    </View>
                ) : (
                    Object.entries(groupedTransactions).map(([date, txs]) => (
                        <View key={date} style={styles.dateGroup}>
                            <Text style={styles.dateHeader}>{date}</Text>
                            {txs.map((tx) => {
                                const account = getAccount(tx.accountId);
                                const animIndex = activeTransactions.findIndex(t => t.id === tx.id);
                                return (
                                    <Animated.View
                                        key={tx.id}
                                        style={{
                                            opacity: transactionAnims[animIndex] || 1,
                                            transform: [{
                                                translateX: (transactionAnims[animIndex] || new Animated.Value(1)).interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [30, 0],
                                                }),
                                            }],
                                        }}
                                    >
                                        <View style={styles.transactionRow}>
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
                                                    {account?.name || 'Unknown'} • {formatTimeAgo(tx.timestamp)}
                                                </Text>
                                            </View>
                                            <View style={styles.txAmount}>
                                                <Text style={[
                                                    styles.txAmountText,
                                                    tx.amount >= 0 ? styles.incomeText : styles.expenseText
                                                ]}>
                                                    {tx.amount >= 0 ? '+' : ''}{formatAmount(tx.amount, true)}
                                                </Text>
                                            </View>
                                        </View>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
    backBtn: { padding: SPACING.sm },
    backBtnText: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: '600' },
    screenTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
    placeholder: { width: 60 },

    scrollView: { flex: 1, paddingHorizontal: SPACING.xl },

    // Empty State
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: SPACING.lg },
    emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
    emptySubtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

    // Date Groups
    dateGroup: { marginBottom: SPACING.xl },
    dateHeader: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SPACING.md, textTransform: 'uppercase' },

    // Transactions
    transactionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.sm },
    txIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
    txContent: { flex: 1 },
    txTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    txMerchant: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginRight: SPACING.sm },
    autoBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    autoBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.background },
    txCategory: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
    txAmount: { alignItems: 'flex-end' },
    txAmountText: { fontSize: FONT_SIZE.md, fontWeight: '600' },
    incomeText: { color: COLORS.success },
    expenseText: { color: COLORS.error },
});

export default AllTransactionsScreen;
