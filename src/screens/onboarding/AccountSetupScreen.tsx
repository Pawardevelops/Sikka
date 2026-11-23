/**
 * Sikka - Accounts setup (Onboarding 3 of 4)
 * Design: design-system/screens/Accounts-setup-v2.html
 * Lime total-balance hero, stacked pastel account cards, dashed "add another".
 */

import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Typography';
import { useOnboarding, ONBOARDING_STEPS } from '../../context/OnboardingContext';
import { useAccounts } from '../../context/AccountsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors, ACCOUNT_ICONS } from '../../constants/theme';
import { Account } from '../../types';
import { AddAccountModal } from '../../components/AddAccountModal';
import { Button, IconButton, StepDots, HeroCard, Sikku } from '../../components/ui';

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    bank: 'Bank account',
    cash: 'In your pocket',
    wallet: 'Wallet',
    credit: 'Credit card',
    savings: 'Savings',
    investment: 'Investments',
    bitcoin: 'Crypto',
};

export function AccountSetupScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, goNext, goBack } = useOnboarding();
    const { activeAccounts, netWorth, addAccount, updateAccount, deleteAccount } = useAccounts();
    const { formatAmount } = useCurrency();
    const [showAddModal, setShowAddModal] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

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
        <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" label="Back" onPress={goBack} iconSize={26} />
                <View style={{ flex: 1 }}><StepDots total={ONBOARDING_STEPS} current={currentStep} /></View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title} accessibilityRole="header">Where does your money live?</Text>

                {canContinue ? (
                    <HeroCard style={styles.hero}>
                        <View>
                            <Text style={styles.heroOver}>TOTAL BALANCE</Text>
                            <Text style={styles.heroValue}>{formatAmount(netWorth, true)}</Text>
                        </View>
                        <View style={styles.countChip}>
                            <Text style={styles.countChipText}>
                                {activeAccounts.length} {activeAccounts.length === 1 ? 'account' : 'accounts'}
                            </Text>
                        </View>
                    </HeroCard>
                ) : (
                    <View style={styles.empty}>
                        <Sikku size={72} mood="thinking" />
                        <Text style={styles.emptyText}>
                            Add a bank account, cash or a card. Sikka keeps every balance on this phone.
                        </Text>
                    </View>
                )}

                {/* Stacked account cards */}
                <View>
                    {activeAccounts.map((account, i) => {
                        const pair = getCategoryColors(account.type);
                        const isLast = i === activeAccounts.length - 1;
                        return (
                            <View
                                key={account.id}
                                style={[
                                    styles.stackCard,
                                    { backgroundColor: pair.bg, paddingBottom: isLast ? SPACING.lg : 34 },
                                    i > 0 && styles.stackOverlap,
                                ]}
                            >
                                <TouchableOpacity
                                    onPress={() => openAddModal(account)}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${account.name}, ${formatAmount(account.balance, true)}. Edit`}
                                    style={styles.stackMain}
                                >
                                    <View style={styles.stackIcon}>
                                        <Icon name={(ACCOUNT_ICONS[account.type] || account.icon || 'account-balance') as any} size={22} color={pair.fg} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stackName} numberOfLines={1}>{account.name}</Text>
                                        <Text style={[styles.stackMeta, { color: pair.fg }]}>{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</Text>
                                    </View>
                                    <Text style={styles.stackBalance}>{formatAmount(account.balance, true)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => deleteAccount(account.id)}
                                    hitSlop={10}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove ${account.name}`}
                                    style={styles.removeBtn}
                                >
                                    <Icon name="close" size={16} color={pair.fg} />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal()} activeOpacity={0.75} accessibilityRole="button">
                    <Icon name="add" size={20} color={COLORS.text} />
                    <Text style={styles.addText}>{canContinue ? 'Add another account' : 'Add your first account'}</Text>
                </TouchableOpacity>
            </ScrollView>

            <AddAccountModal
                visible={showAddModal}
                accountToEdit={accountToEdit}
                onClose={closeAddModal}
                onAdd={addAccount}
                onUpdate={updateAccount}
            />

            <Button label="Continue" onPress={goNext} disabled={!canContinue} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: SPACING.lg, paddingBottom: SPACING.lg },
    title: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },

    hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 30, paddingVertical: 18 },
    heroOver: { fontSize: 13, fontWeight: '800', color: CATEGORY_PALETTE.groceries.fg, letterSpacing: 0.4 },
    heroValue: { fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1, color: COLORS.onBrand, marginTop: 2 },
    countChip: { backgroundColor: COLORS.night, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
    countChipText: { fontSize: 13, fontWeight: '800', color: COLORS.brand },

    empty: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, ...SHADOWS.md },
    emptyText: { flex: 1, fontSize: 15, lineHeight: 21, color: COLORS.textSecondary },

    stackCard: { borderRadius: 28, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    stackOverlap: { marginTop: -22, ...SHADOWS.sm },
    stackMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    stackIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    stackName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    stackMeta: { fontSize: 13, fontWeight: '600' },
    stackBalance: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    removeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },

    addBtn: {
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#BDB5A6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    addText: { fontSize: 16, fontWeight: '800', color: COLORS.text },
});
