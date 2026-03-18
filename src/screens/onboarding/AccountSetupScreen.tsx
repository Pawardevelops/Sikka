import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAccounts } from '../../context/AccountsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { Account } from '../../types';
import { AddAccountModal } from '../../components/AddAccountModal';

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
    bank: 'account-balance',
    cash: 'payments',
    wallet: 'account-balance-wallet',
    credit: 'credit-card',
    savings: 'savings',
    investment: 'trending-up',
    bitcoin: 'currency-bitcoin',
};

export function AccountSetupScreen() {
    const { currentStep, goNext, goBack } = useOnboarding();
    const { activeAccounts, netWorth, addAccount, updateAccount, deleteAccount } = useAccounts();
    const { formatAmount } = useCurrency();

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

    const handleContinue = () => {
        if (activeAccounts.length > 0) {
            goNext();
        }
    };

    const openAddModal = (account?: Account) => {
        setAccountToEdit(account || null);
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setAccountToEdit(null);
    };

    const canContinue = activeAccounts.length > 0;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SET UP ACCOUNTS</Text>
                <View style={{ width: 40 }} />
            </View>

            <OnboardingProgress currentStep={currentStep} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Text style={styles.title}>Track your{'\n'}money flow</Text>
                <Text style={styles.subtitle}>
                    Add at least one account like Cash, Bank, or Credit Card to get started.
                </Text>

                {/* Net Worth Summary (only if accounts exist) */}
                {activeAccounts.length > 0 && (
                    <View style={styles.netWorthCard}>
                        <Text style={styles.netWorthLabel}>TOTAL BALANCE</Text>
                        <Text style={styles.netWorthAmount}>{formatAmount(netWorth)}</Text>
                    </View>
                )}

                {/* Account List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>YOUR ACCOUNTS</Text>
                    <Text style={styles.accountCount}>{activeAccounts.length} added</Text>
                </View>

                {activeAccounts.length === 0 ? (
                    <TouchableOpacity
                        style={styles.emptyState}
                        onPress={() => openAddModal()}
                        activeOpacity={0.7}
                    >
                        <View style={styles.emptyIconContainer}>
                            <Icon name="account-balance-wallet" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No accounts yet</Text>
                        <Text style={styles.emptySubtitle}>Tap here to add your first account</Text>
                        <View style={styles.addFirstBtn}>
                            <Icon name="add" size={20} color={COLORS.background} />
                            <Text style={styles.addFirstBtnText}>Add Account</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <>
                        {activeAccounts.map((account) => (
                            <TouchableOpacity
                                key={account.id}
                                style={styles.accountCard}
                                onPress={() => openAddModal(account)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.accountIcon, { backgroundColor: account.color + '20' }]}>
                                    <Icon
                                        name={(ACCOUNT_TYPE_ICONS[account.type] || account.icon || 'account-balance') as any}
                                        size={22}
                                        color={account.color || COLORS.primary}
                                    />
                                </View>
                                <View style={styles.accountInfo}>
                                    <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                                    <Text style={styles.accountType}>{account.type.toUpperCase()}</Text>
                                </View>
                                <View style={styles.accountBalanceContainer}>
                                    <Text style={[styles.accountBalance, account.balance < 0 && styles.negativeBalance]}>
                                        {formatAmount(account.balance)}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => deleteAccount(account.id)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Icon name="delete-outline" size={18} color={COLORS.error} style={{ opacity: 0.6 }} />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={styles.addAnotherBtn}
                            onPress={() => openAddModal()}
                            activeOpacity={0.7}
                        >
                            <Icon name="add" size={20} color={COLORS.primary} />
                            <Text style={styles.addAnotherBtnText}>Add Another Account</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* Modal */}
            <AddAccountModal
                visible={showAddModal}
                accountToEdit={accountToEdit}
                onClose={closeAddModal}
                onAdd={addAccount}
                onUpdate={updateAccount}
            />

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    activeOpacity={0.8}
                    disabled={!canContinue}
                >
                    <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
                        Continue
                    </Text>
                    <Icon name="arrow-forward" size={20} color={canContinue ? COLORS.background : COLORS.textMuted} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingTop: 60,
        paddingBottom: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxxl,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxl,
        lineHeight: 22,
    },
    netWorthCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    netWorthLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: SPACING.xs,
    },
    netWorthAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    accountCount: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
    },
    emptyState: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xxxl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    addFirstBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        gap: SPACING.sm,
    },
    addFirstBtnText: {
        color: COLORS.background,
        fontWeight: '600',
        fontSize: FONT_SIZE.md,
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    accountIcon: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    accountInfo: {
        flex: 1,
    },
    accountName: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    accountType: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    accountBalanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    accountBalance: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.text,
    },
    negativeBalance: {
        color: COLORS.error,
    },
    addAnotherBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    addAnotherBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: FONT_SIZE.md,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
        paddingTop: SPACING.lg,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.xl,
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    continueButtonDisabled: {
        backgroundColor: COLORS.surfaceLight,
    },
    continueButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.background,
    },
    continueButtonTextDisabled: {
        color: COLORS.textMuted,
    },
});
