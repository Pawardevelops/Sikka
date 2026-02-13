/**
 * Sikka - Account Setup Screen (Onboarding Step 3)
 * Select account types and initial balance
 */

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
import { OnboardingAccountType, AccountType } from '../../types';

const ACCOUNT_TYPES: (OnboardingAccountType & { iconName: any })[] = [
    { type: 'cash', name: 'Cash', description: 'Physical cash in hand', icon: '💵', iconName: 'payments', color: '#22C55E', selected: false, balance: 0 },
    { type: 'bank', name: 'Bank', description: 'Savings & Current', icon: '🏦', iconName: 'account-balance', color: '#3B82F6', selected: false, balance: 0 },
    { type: 'credit', name: 'Credit Card', description: 'Manage credit bills', icon: '💳', iconName: 'credit-card', color: '#A855F7', selected: false, balance: 0 },
    { type: 'savings', name: 'UPI / Wallet', description: 'Digital wallets', icon: '📱', iconName: 'account-balance-wallet', color: '#F97316', selected: false, balance: 0 },
    { type: 'investment', name: 'Investments', description: 'Stocks & Mutual Funds', icon: '📈', iconName: 'trending-up', color: '#EC4899', selected: false, balance: 0 },
    { type: 'bitcoin', name: 'Crypto', description: 'Bitcoin & Altcoins', icon: '₿', iconName: 'currency-bitcoin', color: '#EAB308', selected: false, balance: 0 },
];

export function AccountSetupScreen() {
    const { currentStep, goNext, goBack } = useOnboarding();
    const { addAccount } = useAccounts();
    const { formatAmount } = useCurrency();
    const [accounts, setAccounts] = useState(ACCOUNT_TYPES);

    const toggleAccount = (type: AccountType) => {
        setAccounts(prev => prev.map(acc =>
            acc.type === type ? { ...acc, selected: !acc.selected } : acc
        ));
    };

    const totalBalance = accounts
        .filter(acc => acc.selected)
        .reduce((sum, acc) => sum + acc.balance, 0);

    const selectedCount = accounts.filter(acc => acc.selected).length;

    const handleContinue = async () => {
        // Add selected accounts
        for (const account of accounts.filter(acc => acc.selected)) {
            await addAccount({
                name: account.name,
                type: account.type,
                icon: account.iconName,
                balance: account.balance,
                color: account.color,
            });
        }
        goNext();
    };

    const handleSkip = () => {
        goNext();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Setup Accounts</Text>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <OnboardingProgress currentStep={currentStep} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Text style={styles.title}>Add your accounts</Text>
                <Text style={styles.subtitle}>
                    Select account types to track your current balances. We'll help you organize them.
                </Text>

                {/* Account Grid */}
                <View style={styles.accountGrid}>
                    {accounts.map((account) => (
                        <TouchableOpacity
                            key={account.type}
                            style={[
                                styles.accountCard,
                                account.selected && styles.accountCardSelected,
                            ]}
                            onPress={() => toggleAccount(account.type)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.accountIcon,
                                { backgroundColor: `${account.color}20` },
                            ]}>
                                <Icon name={account.iconName} size={24} color={account.color} />
                            </View>
                            <Text style={styles.accountName}>{account.name}</Text>
                            <Text style={styles.accountDescription}>{account.description}</Text>
                            {account.selected && (
                                <View style={styles.checkmark}>
                                    <Icon name="check" size={14} color={COLORS.background} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Balance Summary */}
            <View style={styles.balanceSummary}>
                <View style={styles.balanceHeader}>
                    <Text style={styles.balanceLabel}>TOTAL INITIAL BALANCE</Text>
                    <Icon name="lock" size={14} color={COLORS.textMuted} />
                </View>
                <Text style={styles.balanceAmount}>{formatAmount(totalBalance)}</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: selectedCount > 0 ? '10%' : '0%' }]} />
                </View>
            </View>

            {/* Continue Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Icon name="arrow-forward" size={20} color={COLORS.background} />
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
    backIcon: {
        fontSize: 24,
        color: COLORS.text,
    },
    headerTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    skipText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxl,
        lineHeight: 22,
    },
    accountGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    accountCard: {
        width: '47%',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
    },
    accountCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
    },
    accountIcon: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    accountIconText: {
        fontSize: 24,
    },
    accountName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    accountDescription: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    checkmark: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: COLORS.background,
        fontSize: 14,
        fontWeight: '700',
    },
    balanceSummary: {
        backgroundColor: COLORS.surface,
        marginHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    balanceLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    lockIcon: {
        fontSize: 14,
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    progressBar: {
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 2,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
        paddingTop: SPACING.md,
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
    continueButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.background,
    },
    continueArrow: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.background,
    },
});
