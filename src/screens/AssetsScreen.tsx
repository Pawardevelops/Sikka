/**
 * Sikka - Assets Screen
 * Tabbed view: Accounts (grouped) + Subscriptions with progress bars
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useAccounts } from '../context/AccountsContext';
import { useSubscriptions } from '../context/SubscriptionsContext';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Account } from '../types';
import { useNavigation } from '../context/NavigationContext';
import { Icon } from '../components/Icon';

// ==================== ACCOUNT CATEGORY GROUPING ====================
type AccountGroup = {
    label: string;
    types: string[];
};

const ACCOUNT_GROUPS: AccountGroup[] = [
    { label: 'LIQUID CASH', types: ['bank', 'cash', 'wallet'] },
    { label: 'CREDIT & DEBT', types: ['credit'] },
    { label: 'SAVINGS', types: ['savings', 'investment', 'bitcoin'] },
];

// ==================== HELPERS ====================
function getDaysUntilDue(dueDate: number): number {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (dueDate >= currentDay) {
        return dueDate - currentDay;
    }
    // Due date is next month
    return (daysInMonth - currentDay) + dueDate;
}

function getDueProgress(dueDate: number): number {
    const daysUntil = getDaysUntilDue(dueDate);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, Math.min(1, 1 - (daysUntil / daysInMonth)));
}

function getProgressColor(daysUntil: number): string {
    if (daysUntil <= 3) return '#EF4444';    // Red — urgent
    if (daysUntil <= 7) return '#F59E0B';    // Orange — soon
    return COLORS.primary;                    // Green — plenty of time
}

function formatDueDate(dueDate: number): string {
    const now = new Date();
    let month = now.getMonth();
    let year = now.getFullYear();
    if (dueDate < now.getDate()) {
        month += 1;
        if (month > 11) { month = 0; year += 1; }
    }
    const date = new Date(year, month, dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

// ==================== ACCOUNT ICON MAPPING ====================
const ACCOUNT_TYPE_ICONS: Record<string, string> = {
    bank: 'account-balance',
    cash: 'payments',
    wallet: 'account-balance-wallet',
    credit: 'credit-card',
    savings: 'savings',
    investment: 'trending-up',
    bitcoin: 'currency-bitcoin',
};

// ==================== MAIN COMPONENT ====================
export function AssetsScreen() {
    const { formatAmount } = useCurrency();
    const { activeAccounts, totalBalance } = useAccounts();
    const { activeSubscriptions, monthlyTotal } = useSubscriptions();
    const { selectAccount, openAddModal, openAddSubscriptionModal } = useNavigation();
    const safeTop = useSafeTop();

    const [activeTab, setActiveTab] = useState<'accounts' | 'subscriptions'>('accounts');
    const [hideBalance, setHideBalance] = useState(false);
    const [subSort, setSubSort] = useState<'date' | 'amount'>('date');

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const tabAnim = useRef(new Animated.Value(0)).current; // 0 = accounts, 1 = subscriptions
    const screenWidth = Dimensions.get('window').width;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();
    }, []);

    // Animate tab transitions
    const animateToTab = (tab: 'accounts' | 'subscriptions') => {
        const toValue = tab === 'accounts' ? 0 : 1;
        setActiveTab(tab);
        Animated.spring(tabAnim, {
            toValue,
            friction: 10,
            tension: 60,
            useNativeDriver: true,
        }).start();
    };

    // Swipe gesture handler
    const panResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
            // Only capture horizontal swipes (more horizontal than vertical)
            return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
            return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
        },
        onPanResponderRelease: (_, gestureState) => {
            const swipeThreshold = 50;
            if (gestureState.dx < -swipeThreshold && activeTab === 'accounts') {
                // Swipe left → go to subscriptions
                animateToTab('subscriptions');
            } else if (gestureState.dx > swipeThreshold && activeTab === 'subscriptions') {
                // Swipe right → go to accounts
                animateToTab('accounts');
            }
        },
    }), [activeTab]);

    // Group accounts by category
    const groupedAccounts = ACCOUNT_GROUPS.map(group => ({
        ...group,
        accounts: activeAccounts.filter(acc => group.types.includes(acc.type)),
    })).filter(group => group.accounts.length > 0);

    // Sort subscriptions
    const sortedSubscriptions = [...activeSubscriptions].sort((a, b) => {
        if (subSort === 'date') {
            const aDays = a.isPaid ? 999 : getDaysUntilDue(a.dueDate);
            const bDays = b.isPaid ? 999 : getDaysUntilDue(b.dueDate);
            return aDays - bDays;
        }
        return b.amount - a.amount;
    });

    const handleAccountPress = (account: Account) => {
        selectAccount(account);
    };

    // ==================== ACCOUNTS TAB ====================
    const renderAccountsTab = () => (
        <Animated.View style={{ opacity: fadeAnim }}>
            {/* Net Worth Header */}
            <View style={styles.netWorthSection}>
                <View style={styles.netWorthLabelRow}>
                    <Text style={styles.netWorthLabel}>NET WORTH</Text>
                    <TouchableOpacity onPress={() => setHideBalance(!hideBalance)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name={hideBalance ? 'visibility-off' : 'visibility'} size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.netWorthAmount}>
                    {hideBalance ? '••••••' : formatAmount(totalBalance)}
                </Text>
                <View style={styles.changeBadge}>
                    <Icon name="trending-up" size={14} color={COLORS.primary} />
                    <Text style={styles.changeText}>+2.4%</Text>
                    <Text style={styles.changeSubtext}>vs last month</Text>
                </View>
            </View>

            {/* Grouped Account List */}
            {groupedAccounts.map((group) => (
                <View key={group.label} style={styles.accountGroup}>
                    <Text style={styles.groupLabel}>{group.label}</Text>
                    {group.accounts.map((account) => (
                        <TouchableOpacity
                            key={account.id}
                            style={styles.accountCard}
                            activeOpacity={0.85}
                            onPress={() => handleAccountPress(account)}
                        >
                            <View style={[styles.accountIcon, { backgroundColor: account.color ? account.color + '20' : COLORS.primaryMuted }]}>
                                <Icon
                                    name={(ACCOUNT_TYPE_ICONS[account.type] || account.icon || 'account-balance') as any}
                                    size={22}
                                    color={account.color || COLORS.primary}
                                />
                            </View>
                            <View style={styles.accountContent}>
                                <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                                <Text style={styles.accountSubtitle}>
                                    {account.lastUpdated ? `• Updated ${account.lastUpdated.toLowerCase()}` : account.type.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.accountBalance, account.balance < 0 && styles.negativeBalance]}>
                                {hideBalance ? '••••' : formatAmount(account.balance)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}

            {/* Add Account Button */}
            <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={openAddModal}>
                <Icon name="add" size={20} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                <Text style={styles.addBtnText}>Add New Account</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    // ==================== SUBSCRIPTIONS TAB ====================
    const renderSubscriptionsTab = () => (
        <Animated.View style={{ opacity: fadeAnim }}>
            {/* Monthly Commitment Header */}
            <View style={styles.netWorthSection}>
                <Text style={styles.netWorthLabel}>MONTHLY COMMITMENT</Text>
                <View style={styles.commitmentRow}>
                    <Text style={styles.netWorthAmount}>{formatAmount(monthlyTotal)}</Text>
                    <Text style={styles.perMonth}> / mo</Text>
                </View>
            </View>

            {/* Upcoming Bills Header */}
            <View style={styles.billsHeaderRow}>
                <Text style={styles.groupLabel}>UPCOMING BILLS</Text>
                <TouchableOpacity onPress={() => setSubSort(subSort === 'date' ? 'amount' : 'date')}>
                    <Text style={styles.sortBtn}>
                        Sort by {subSort === 'date' ? 'Date' : 'Amount'} ▾
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Subscription Cards */}
            {sortedSubscriptions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="subscriptions" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No subscriptions yet</Text>
                    <Text style={styles.emptySubtext}>Track your recurring bills here</Text>
                </View>
            ) : (
                sortedSubscriptions.map((sub) => {
                    const daysUntil = getDaysUntilDue(sub.dueDate);
                    const progress = getDueProgress(sub.dueDate);
                    const progressColor = sub.isPaid ? COLORS.primary : getProgressColor(daysUntil);

                    return (
                        <View key={sub.id} style={styles.subCard}>
                            <View style={styles.subCardTop}>
                                <View style={[styles.subIcon, { backgroundColor: sub.iconColor + '20' }]}>
                                    <Icon name={sub.icon as any} size={20} color={sub.iconColor} />
                                </View>
                                <View style={styles.subContent}>
                                    <Text style={styles.subName}>{sub.name}</Text>
                                    <Text style={styles.subDueText}>
                                        Due {formatDueDate(sub.dueDate)}
                                    </Text>
                                </View>
                                <View style={styles.subRight}>
                                    <Text style={styles.subAmount}>{formatAmount(sub.amount)}</Text>
                                    <View style={[styles.dueBadge, sub.isPaid && styles.paidBadge]}>
                                        <Text style={[styles.dueBadgeText, sub.isPaid && styles.paidBadgeText]}>
                                            {sub.isPaid ? 'PAID' : `DUE IN ${daysUntil} DAYS`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            {/* Progress Bar */}
                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${(sub.isPaid ? 100 : progress * 100)}%`,
                                            backgroundColor: progressColor,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    );
                })
            )}

            {/* Add Subscription Button */}
            <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={openAddSubscriptionModal}>
                <Icon name="add" size={20} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                <Text style={styles.addBtnText}>Add Subscription</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    // ==================== RENDER ====================
    // Animated tab content translation
    const contentTranslateX = tabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -(screenWidth - SPACING.xl * 2)],
    });

    // Animated tab indicator position
    const indicatorTranslateX = tabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1], // will be used as a fraction
    });

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <Text style={styles.screenTitle}>Assets</Text>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="search" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </Animated.View>

            {/* Tab Switcher with animated indicator */}
            <View style={styles.tabBar}>
                {/* Animated pill indicator */}
                <Animated.View
                    style={[
                        styles.tabIndicator,
                        {
                            transform: [{
                                translateX: tabAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [4, (screenWidth - SPACING.xl * 2) / 2 - 4],
                                }),
                            }],
                            width: (screenWidth - SPACING.xl * 2 - 8) / 2,
                        },
                    ]}
                />
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => animateToTab('accounts')}
                    activeOpacity={0.8}
                >
                    <Animated.Text style={[
                        styles.tabText,
                        {
                            color: tabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [COLORS.background, COLORS.textSecondary],
                            }),
                        },
                    ]}>
                        Accounts
                    </Animated.Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => animateToTab('subscriptions')}
                    activeOpacity={0.8}
                >
                    <Animated.Text style={[
                        styles.tabText,
                        {
                            color: tabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [COLORS.textSecondary, COLORS.background],
                            }),
                        },
                    ]}>
                        Subscriptions
                    </Animated.Text>
                </TouchableOpacity>
            </View>

            {/* Swipeable Tab Content */}
            <View style={styles.tabContentContainer} {...panResponder.panHandlers}>
                <Animated.View
                    style={[
                        styles.tabContentSlider,
                        {
                            width: (screenWidth - SPACING.xl * 2) * 2,
                            transform: [{ translateX: contentTranslateX }],
                        },
                    ]}
                >
                    <View style={{ width: screenWidth - SPACING.xl * 2 }}>
                        {renderAccountsTab()}
                    </View>
                    <View style={{ width: screenWidth - SPACING.xl * 2 }}>
                        {renderSubscriptionsTab()}
                    </View>
                </Animated.View>
            </View>
        </ScrollView>
    );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 140 },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },

    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: 4,
        marginBottom: SPACING.xxl,
        position: 'relative',
    },
    tabIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.primary,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        zIndex: 1,
    },
    tabText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },

    // Tab Content
    tabContentContainer: {
        overflow: 'hidden',
    },
    tabContentSlider: {
        flexDirection: 'row',
    },

    // Net Worth / Commitment Section
    netWorthSection: {
        marginBottom: SPACING.xxl,
    },
    netWorthLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    netWorthLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    netWorthAmount: {
        fontSize: 36,
        fontWeight: '700',
        color: COLORS.text,
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
        gap: SPACING.xs,
    },
    changeText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.primary,
        backgroundColor: COLORS.primaryMuted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        overflow: 'hidden',
    },
    changeSubtext: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginLeft: SPACING.xs,
    },
    commitmentRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    perMonth: {
        fontSize: FONT_SIZE.xl,
        color: COLORS.textMuted,
        fontWeight: '400',
    },

    // Group
    accountGroup: {
        marginBottom: SPACING.lg,
    },
    groupLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.primary,
        letterSpacing: 1,
        marginBottom: SPACING.md,
    },

    // Account Card
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    accountIcon: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    accountContent: {
        flex: 1,
    },
    accountName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    accountSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
    },
    accountBalance: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.text,
    },
    negativeBalance: {
        color: COLORS.error,
    },

    // Add Button
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginTop: SPACING.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
    },
    addBtnText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.primary,
    },

    // Subscriptions
    billsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sortBtn: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.primary,
    },

    // Subscription Card
    subCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primaryMuted,
    },
    subCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    subIcon: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    subContent: {
        flex: 1,
    },
    subName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    subDueText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
    },
    subRight: {
        alignItems: 'flex-end',
    },
    subAmount: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    dueBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    dueBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    paidBadge: {
        backgroundColor: COLORS.primaryMuted,
    },
    paidBadgeText: {
        color: COLORS.primary,
    },

    // Progress Bar
    progressTrack: {
        height: 4,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xxxl * 2,
    },
    emptyText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: SPACING.lg,
    },
    emptySubtext: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
    },
});

export default AssetsScreen;
