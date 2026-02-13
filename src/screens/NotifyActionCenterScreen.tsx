import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { Icon } from '../components/Icon';
import { useTransactions, formatTimeAgo, CATEGORY_ICONS } from '../context/TransactionsContext';
import { Transaction } from '../types';
import { useSafeTop } from '../components/SafeScreen';

// Safe import: react-native-android-notification-listener is a native module
// unavailable in Expo Go. Provide a stub fallback to prevent crashes.
let RNAndroidNotificationListener: any = {
    getPermissionStatus: async () => 'unknown',
    requestPermission: () => { },
};
try {
    RNAndroidNotificationListener = require('react-native-android-notification-listener').default;
} catch {
    // Running in Expo Go or web — native module unavailable
}

// Dark theme colors matching the image
const THEME = {
    background: '#0A0F0D',
    surface: '#141A17',
    cardBg: '#1C2420',
    border: '#2A332E',
    primary: '#4ADE80', // Bright green
    text: '#FFFFFF',
    textSecondary: '#8B9A8F',
    textMuted: '#5A6A5E',
    error: '#EF5350',
    success: '#4ADE80',
    warning: '#FFA726',
};

const NotifyActionCenterScreen = () => {
    const { closeNotifyCenter } = useNavigation();
    const { transactions, unparsedNotifications, approveTransaction, ignoreTransaction } = useTransactions();
    const [activeTab, setActiveTab] = React.useState<'pending' | 'inbox'>('pending');
    const safeTop = useSafeTop();
    const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

    // Check permission status on mount
    useEffect(() => {
        const checkPermission = async () => {
            if (Platform.OS === 'android') {
                try {
                    const status = await RNAndroidNotificationListener.getPermissionStatus();
                    setPermissionStatus(status);
                } catch (e) {
                    setPermissionStatus('error');
                }
            }
        };
        checkPermission();
    }, []);

    const openSettings = () => {
        if (Platform.OS === 'android') {
            RNAndroidNotificationListener.requestPermission();
        }
    };

    // Filter for pending transactions
    const pendingTransactions = transactions
        .filter(t => t.status === 'pending' && !t.isDeleted)
        .sort((a, b) => b.timestamp - a.timestamp);

    const handleApprove = async (id: string) => {
        await approveTransaction(id);
        Alert.alert("Saved", "Transaction has been added to your records.");
    };

    const handleIgnore = async (id: string) => {
        Alert.alert(
            "Ignore Transaction",
            "Are you sure you want to discard this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: async () => {
                        await ignoreTransaction(id);
                    }
                }
            ]
        );
    };

    const renderPendingItem = ({ item }: { item: Transaction }) => (
        <View style={styles.card}>
            <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                    <Icon
                        name={CATEGORY_ICONS[item.category] || 'receipt'}
                        size={24}
                        color={THEME.textSecondary}
                    />
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                        <Text style={styles.merchant}>{item.merchant}</Text>
                        <View style={styles.autoBadge}>
                            <Text style={styles.autoBadgeText}>AUTO</Text>
                        </View>
                    </View>
                    <Text style={styles.category}>{item.category} • {formatTimeAgo(item.timestamp)}</Text>
                </View>
                <View style={styles.amountContainer}>
                    <Text style={[styles.amount, item.type === 'credit' ? styles.incomeAmount : styles.expenseAmount]}>
                        {item.type === 'credit' ? '+' : '-'}₹{item.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.viaLabel}>via Notify</Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.ignoreBtn} onPress={() => handleIgnore(item.id)}>
                    <Icon name="close" size={18} color={THEME.textSecondary} />
                    <Text style={styles.ignoreBtnText}>Ignore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.id)}>
                    <Icon name="check" size={18} color="#000" />
                    <Text style={styles.approveBtnText}>Save</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderUnparsedItem = ({ item }: { item: string }) => (
        <View style={styles.inboxCard}>
            <View style={styles.inboxIconContainer}>
                <Icon name="mail-outline" size={20} color={THEME.textSecondary} />
            </View>
            <View style={styles.inboxContent}>
                <Text style={styles.inboxText} numberOfLines={2}>{item}</Text>
                <TouchableOpacity onPress={() => Alert.alert("Rule Builder", "Coming soon!")}>
                    <Text style={styles.createRuleText}>+ Create Rule</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: safeTop }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={closeNotifyCenter} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={THEME.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notify Action Center</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Permission Status Debug Card */}
            <View style={[styles.debugCard, {
                backgroundColor: permissionStatus === 'granted' ? THEME.success + '20' : THEME.warning + '30',
                borderColor: permissionStatus === 'granted' ? THEME.success : THEME.warning
            }]}>
                <Icon
                    name={permissionStatus === 'granted' ? 'check-circle' : 'warning'}
                    size={20}
                    color={permissionStatus === 'granted' ? THEME.success : THEME.warning}
                />
                <View style={styles.debugContent}>
                    <Text style={[styles.debugTitle, { color: permissionStatus === 'granted' ? THEME.success : THEME.warning }]}>
                        Listener: {permissionStatus.toUpperCase()}
                    </Text>
                    <Text style={styles.debugSubtitle}>
                        {permissionStatus === 'granted'
                            ? `Inbox has ${unparsedNotifications.length} items`
                            : 'Tap to enable notification access'}
                    </Text>
                </View>
                {permissionStatus !== 'granted' && (
                    <TouchableOpacity style={styles.debugBtn} onPress={openSettings}>
                        <Text style={styles.debugBtnText}>Enable</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Tab Container */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                        Pending ({pendingTransactions.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
                    onPress={() => setActiveTab('inbox')}
                >
                    <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
                        Inbox ({unparsedNotifications.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'pending' ? (
                <FlatList
                    data={pendingTransactions}
                    keyExtractor={item => item.id}
                    renderItem={renderPendingItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Icon name="check-circle" size={64} color={THEME.primary} />
                            <Text style={styles.emptyText}>All caught up!</Text>
                            <Text style={styles.emptySubText}>No pending transactions to review.</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={unparsedNotifications}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={renderUnparsedItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Icon name="inbox" size={64} color={THEME.textMuted} />
                            <Text style={styles.emptyText}>Inbox Empty</Text>
                            <Text style={styles.emptySubText}>Unrecognized notifications will appear here.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: THEME.surface,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: THEME.text,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: THEME.surface,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: THEME.primary + '20',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.textMuted,
    },
    activeTabText: {
        color: THEME.primary,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    // Transaction Card
    card: {
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: THEME.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    merchant: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME.text,
        marginRight: 8,
    },
    autoBadge: {
        backgroundColor: THEME.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    autoBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#000',
    },
    category: {
        fontSize: 13,
        color: THEME.textSecondary,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: '700',
    },
    incomeAmount: {
        color: THEME.success,
    },
    expenseAmount: {
        color: THEME.error,
    },
    viaLabel: {
        fontSize: 11,
        color: THEME.textMuted,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: THEME.border,
        paddingTop: 12,
    },
    ignoreBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginRight: 8,
        borderRadius: 8,
        backgroundColor: THEME.surface,
    },
    ignoreBtnText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '600',
        color: THEME.textSecondary,
    },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: THEME.primary,
    },
    approveBtnText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    // Inbox Card
    inboxCard: {
        flexDirection: 'row',
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    inboxIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: THEME.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    inboxContent: {
        flex: 1,
    },
    inboxText: {
        fontSize: 13,
        color: THEME.textSecondary,
        marginBottom: 6,
        lineHeight: 18,
    },
    createRuleText: {
        fontSize: 12,
        fontWeight: '600',
        color: THEME.primary,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME.text,
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: THEME.textMuted,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    debugCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    debugContent: {
        flex: 1,
        marginLeft: 10,
    },
    debugTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    debugSubtitle: {
        fontSize: 12,
        color: THEME.textSecondary,
        marginTop: 2,
    },
    debugBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: THEME.warning,
    },
    debugBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
    },
});

export default NotifyActionCenterScreen;
