/**
 * Sikka - Dashboard Screen
 * Main dashboard with net worth, accounts, and transactions
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
import { useOnboarding } from '../context/OnboardingContext';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { useSafeTop } from '../components/SafeScreen';
import { Account } from '../types';

// Import navigation from NavigationContext
import { useNavigation } from '../context/NavigationContext';
import { Icon } from '../components/Icon';

export function DashboardScreen() {
    const { formatAmount } = useCurrency();
    const { activeAccounts, totalBalance, getAccount } = useAccounts();
    const { todayTransactions, transactions } = useTransactions();
    const { data: onboardingData } = useOnboarding();
    const safeTop = useSafeTop();
    const { selectAccount, openAddModal, openAddTransactionModal, openAllTransactions, openNotifyCenter } = useNavigation();

    // Get pending transactions count
    const pendingTransactionsCount = transactions.filter(t => t.status === 'pending' && !t.isDeleted).length;

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const netWorthScale = useRef(new Animated.Value(0.9)).current;
    const netWorthSlide = useRef(new Animated.Value(-30)).current;
    const smsCardAnim = useRef(new Animated.Value(0)).current;
    const accountsAnim = useRef(new Animated.Value(0)).current;
    const transactionAnims = useRef(
        Array(Math.max(todayTransactions.length, 5)).fill(0).map(() => new Animated.Value(0))
    ).current;

    useEffect(() => {
        // Sequence of animations for a polished feel
        Animated.sequence([
            // 1. Fade in header
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            // 2. Net worth card springs in
            Animated.parallel([
                Animated.spring(netWorthScale, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.spring(netWorthSlide, {
                    toValue: 0,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // SMS card fades in
        Animated.timing(smsCardAnim, {
            toValue: 1,
            duration: 400,
            delay: 200,
            useNativeDriver: true,
        }).start();

        // Accounts scroll fades in
        Animated.timing(accountsAnim, {
            toValue: 1,
            duration: 400,
            delay: 300,
            useNativeDriver: true,
        }).start();

        // Stagger transactions
        Animated.stagger(100, transactionAnims.map(anim =>
            Animated.spring(anim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        )).start();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const handleAccountPress = (account: Account) => {
        selectAccount(account);
    };

    // FAB items
    // FAB items
    const fabItems = [
        { id: 'transaction', icon: 'attach-money', label: 'Add Transaction', onPress: openAddTransactionModal },
        { id: 'notify', icon: 'notifications', label: 'Notify Center', onPress: openNotifyCenter },
        { id: 'scan', icon: 'camera-alt', label: 'Scan Receipt', onPress: () => { } },
        { id: 'transfer', icon: 'swap-horiz', label: 'Transfer', onPress: () => { } },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header with Fade Animation */}
                <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatar}>
                            <Icon name="person" size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.greeting}>{getGreeting()}, {onboardingData.userName || 'there'}</Text>
                    </View>
                </Animated.View>

                {/* Net Worth Card with Scale + Slide Animation */}
                <Animated.View style={[
                    styles.netWorthCard,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { scale: netWorthScale },
                            { translateY: netWorthSlide },
                        ],
                    }
                ]}>
                    <Text style={styles.netWorthLabel}>NET WORTH</Text>
                    <View style={styles.netWorthRow}>
                        <Text style={styles.netWorthAmount}>{formatAmount(totalBalance)}</Text>
                        {totalBalance !== 0 && (
                            <View style={[styles.changeBadge, totalBalance < 0 && styles.negativeBadge]}>
                                <Text style={[styles.changeText, totalBalance < 0 && styles.negativeChangeText]}>
                                    {totalBalance >= 0 ? <Icon name="arrow-upward" size={12} color={COLORS.primary} /> : <Icon name="arrow-downward" size={12} color={COLORS.error} />} {activeAccounts.length} accounts
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>TODAY'S SPEND</Text>
                            <Text style={styles.statValue}>
                                {formatAmount(Math.abs(todayTransactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)))}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>TRANSACTIONS</Text>
                            <Text style={styles.statValue}>{todayTransactions.length} Today</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Notification Action Center Card */}
                {pendingTransactionsCount > 0 && (
                    <Animated.View style={[styles.smsCard, { opacity: smsCardAnim }]}>
                        <View style={styles.smsIconContainer}>
                            <View style={styles.smsIconBackground}>
                                <Icon name="chat" size={24} color={COLORS.black} />
                            </View>
                        </View>
                        <View style={styles.smsContent}>
                            <Text style={styles.smsTitle}>Notify Action Center</Text>
                            <Text style={styles.smsSubtitle}>{pendingTransactionsCount} new transactions detected from notifications.</Text>
                        </View>
                        <TouchableOpacity style={styles.reviewBtn} onPress={openNotifyCenter}>
                            <Text style={styles.reviewBtnText}>Review</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}


                {/* Accounts Section with Fade */}
                <Animated.View style={{ opacity: accountsAnim }}>
                    <Text style={styles.sectionTitle}>ACCOUNTS</Text>
                    {activeAccounts.length === 0 ? (
                        <TouchableOpacity style={styles.emptyAccountsCard} activeOpacity={0.85} onPress={() => openAddModal()}>
                            <Icon name="account-balance" size={40} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
                            <Text style={styles.emptyTitle}>No accounts yet</Text>
                            <Text style={styles.emptySubtitle}>Tap to add your first account</Text>
                        </TouchableOpacity>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
                            {activeAccounts.slice(0, 4).map((account) => (
                                <TouchableOpacity
                                    key={account.id}
                                    style={styles.accountCard}
                                    activeOpacity={0.85}
                                    onPress={() => handleAccountPress(account)}
                                >
                                    <View style={styles.accountIcon}>
                                        <Icon name={account.icon as any} size={24} color={COLORS.text} />
                                    </View>
                                    <Text style={styles.accountName}>{account.name}</Text>
                                    <Text style={[styles.accountBalance, account.balance < 0 && styles.negativeBalance]}>
                                        {formatAmount(account.balance)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </Animated.View>

                {/* Recent Activity with Stagger */}
                <View style={styles.activityHeader}>
                    <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>
                    <TouchableOpacity onPress={openAllTransactions}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {todayTransactions.length === 0 ? (
                    <View style={styles.emptyTransactionsCard}>
                        <Icon name="assignment" size={40} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
                        <Text style={styles.emptyTitle}>No transactions today</Text>
                        <Text style={styles.emptySubtitle}>Tap the + button to add one</Text>
                    </View>
                ) : (
                    todayTransactions.slice(0, 5).map((tx, index) => {
                        const account = getAccount(tx.accountId);
                        return (
                            <Animated.View
                                key={tx.id}
                                style={{
                                    opacity: transactionAnims[index] || 1,
                                    transform: [{
                                        translateX: (transactionAnims[index] || new Animated.Value(1)).interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [50, 0],
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
                                            {tx.amount >= 0 ? '+' : ''}{formatAmount(tx.amount)}
                                        </Text>
                                    </View>
                                </View>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <FloatingActionButton items={fabItems} />
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 140 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xxl },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
    avatarText: { fontSize: 18 },
    greeting: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text },

    // Net Worth Card
    netWorthCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xxl, padding: SPACING.xxl, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderLight },
    netWorthLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.primary, letterSpacing: 1, marginBottom: SPACING.sm },
    netWorthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
    netWorthAmount: { fontSize: 36, fontWeight: '700', color: COLORS.text, marginRight: SPACING.md },
    changeBadge: { backgroundColor: COLORS.primaryMuted, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm },
    negativeBadge: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
    changeText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.primary },
    negativeChangeText: { color: COLORS.error },
    statsRow: { flexDirection: 'row' },
    statItem: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, marginRight: SPACING.md },
    statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 2 },
    statValue: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },

    // SMS Card
    smsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E2321', // Dark card background from image
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: '#2A332E',
    },
    smsIconContainer: {
        marginRight: SPACING.md,
    },
    smsIconBackground: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#4ADE80', // bright green
        alignItems: 'center',
        justifyContent: 'center',
    },
    smsContent: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    smsTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 2,
    },
    smsSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: '#A0AEC0', // Light gray text
        lineHeight: 18,
    },
    reviewBtn: {
        backgroundColor: '#4ADE80',
        paddingHorizontal: SPACING.lg,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.md,
    },
    reviewBtnText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: '#000000',
    },

    // Sections
    sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.lg, marginTop: SPACING.sm },
    accountsScroll: { marginBottom: SPACING.xxl, marginHorizontal: -SPACING.xl, paddingHorizontal: SPACING.xl },
    accountCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, width: 150, marginRight: SPACING.md },
    accountIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    accountName: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    accountBalance: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
    negativeBalance: { color: COLORS.error },

    // Transactions
    activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
    seeAll: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.primary },
    transactionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
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

    // Empty State
    emptyAccountsCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.xxl, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border },
    emptyTransactionsCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.md, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border },
    emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
    emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
    emptySubtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
});

export default DashboardScreen;
