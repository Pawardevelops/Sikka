/**
 * Sikka - Confirm accounts (Onboarding step 4 of 5)
 * Design: Sikka v3 canvas "06 Confirm accounts" — "Found in your SMS".
 *
 * Accounts come pre-filled from the bank SMS First look read (bank + last 4
 * digits + balance when the SMS has it). Only what SMS can't know is typed:
 * cash, and a balance the bank never sent. Continue saves them and files the
 * last 30 days of payments into Review.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../components/Typography';
import { useOnboarding, ONBOARDING_DOTS, dotFor } from '../../context/OnboardingContext';
import { usePrefs } from '../../context/PrefsContext';
import { useAccounts } from '../../context/AccountsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, CATEGORY_PALETTE, getCategoryColors, ACCOUNT_ICONS } from '../../constants/theme';
import { Account } from '../../types';
import { AddAccountModal } from '../../components/AddAccountModal';
import { Button, IconButton, StepDots, HeroCard } from '../../components/ui';
import { scanInbox } from '../../services/sms';

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    bank: 'Bank account',
    cash: 'In your pocket',
    wallet: 'Wallet',
    credit: 'Credit card',
    savings: 'Savings',
    investment: 'Investments',
    bitcoin: 'Crypto',
};

interface Draft {
    key: string;
    name: string;
    type: 'bank' | 'credit' | 'cash';
    last4?: string;
    sender?: string;
    /** Rupees; for a card this is the amount owed. */
    amount: string;
    fromSms: boolean;
    include: boolean;
}

const num = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
};

export function AccountSetupScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, goToStep, preview, data } = useOnboarding();
    const { prefs } = usePrefs();
    const { activeAccounts, addAccount, updateAccount, deleteAccount } = useAccounts();
    const { formatAmount } = useCurrency();
    const [showAddModal, setShowAddModal] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
    const [saving, setSaving] = useState(false);

    const initial = useMemo<Draft[]>(() => {
        const found: Draft[] = (preview?.accounts ?? []).map((a) => ({
            key: `${a.sender}|${a.last4}`,
            name: a.kind === 'credit' ? `${a.bank} card` : `${a.bank} Savings`,
            type: a.kind === 'credit' ? 'credit' : 'bank',
            last4: a.last4,
            sender: a.sender,
            amount: a.kind === 'credit' ? '' : a.balance !== undefined ? String(Math.round(a.balance)) : '',
            fromSms: true,
            include: true,
        }));
        return [...found, { key: 'cash', name: 'Cash', type: 'cash', amount: '', fromSms: false, include: true }];
    }, [preview]);
    const [drafts, setDrafts] = useState<Draft[]>(initial);
    useEffect(() => setDrafts(initial), [initial]);

    const patch = (key: string, d: Partial<Draft>) => setDrafts((all) => all.map((x) => (x.key === key ? { ...x, ...d } : x)));

    const included = drafts.filter((d) => d.include && (d.type !== 'cash' || num(d.amount) > 0));
    const inAccounts =
        included.filter((d) => d.type !== 'credit').reduce((s, d) => s + num(d.amount), 0) +
        activeAccounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
    const owed =
        included.filter((d) => d.type === 'credit').reduce((s, d) => s + num(d.amount), 0) +
        activeAccounts.filter((a) => a.type === 'credit').reduce((s, a) => s + a.balance, 0);
    const canContinue = included.length > 0 || activeAccounts.length > 0;

    const save = async () => {
        setSaving(true);
        try {
            for (const d of included) {
                const pair = getCategoryColors(d.type);
                await addAccount({
                    name: d.name.trim() || (d.type === 'cash' ? 'Cash' : 'Account'),
                    type: d.type,
                    balance: num(d.amount),
                    icon: ACCOUNT_ICONS[d.type] || 'account-balance',
                    color: pair.bg,
                    last4: d.last4,
                    smsSender: d.sender,
                });
            }
            // Accounts exist now, so the last 30 days of payments can be filed into Review.
            if (prefs.aiMode === 'local') {
                void scanInbox(Date.now() - 30 * 86_400_000, Date.now(), data.userName).catch(() => undefined);
            }
            goToStep(7);
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <IconButton
                    icon="chevron-left"
                    label="Back"
                    onPress={() => goToStep(prefs.aiMode === 'local' ? 5 : 3)}
                    iconSize={26}
                />
                <View style={{ flex: 1 }}><StepDots total={ONBOARDING_DOTS} current={dotFor(currentStep)} /></View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.title} accessibilityRole="header">
                    {preview?.accounts.length ? 'Found in your SMS' : 'Where does your money live?'}
                </Text>

                <HeroCard style={styles.hero}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroOver}>IN YOUR ACCOUNTS</Text>
                        <Text style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>{formatAmount(inAccounts, true)}</Text>
                    </View>
                    {owed > 0 && (
                        <View style={styles.countChip}><Text style={styles.countChipText}>card owed {formatAmount(owed, true)}</Text></View>
                    )}
                </HeroCard>

                <View style={{ gap: SPACING.sm }}>
                    {drafts.map((d) => {
                        const pair = getCategoryColors(d.type);
                        const missing = d.include && d.type === 'bank' && d.amount === '';
                        return (
                            <View key={d.key} style={[styles.row, { backgroundColor: pair.bg }, !d.include && { opacity: 0.5 }]}>
                                <View style={styles.rowIcon}>
                                    <Icon name={(ACCOUNT_ICONS[d.type] || 'account-balance') as any} size={22} color={pair.fg} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <TextInput
                                        value={d.name}
                                        onChangeText={(name) => patch(d.key, { name })}
                                        style={styles.rowName}
                                        accessibilityLabel="Account name"
                                    />
                                    <Text style={[styles.rowMeta, { color: pair.fg }]} numberOfLines={1}>
                                        {d.fromSms ? `··${d.last4} · found in SMS` : 'Not in SMS · type it once'}
                                    </Text>
                                </View>
                                <View style={[styles.amountBox, missing && styles.amountMissing]}>
                                    <Text style={styles.amountSign}>{d.type === 'credit' ? '−₹' : '₹'}</Text>
                                    <TextInput
                                        value={d.amount ? Number(d.amount).toLocaleString('en-IN') : ''}
                                        onChangeText={(t) => patch(d.key, { amount: t.replace(/[^0-9.]/g, '') })}
                                        placeholder="0"
                                        keyboardType="decimal-pad"
                                        style={styles.amountInput}
                                        accessibilityLabel={`${d.name} ${d.type === 'credit' ? 'amount owed' : 'balance'}`}
                                    />
                                </View>
                                {d.fromSms && (
                                    <TouchableOpacity
                                        onPress={() => patch(d.key, { include: !d.include })}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: d.include }}
                                        accessibilityLabel={`Include ${d.name}`}
                                        hitSlop={10}
                                        style={[styles.check, d.include && styles.checkOn]}
                                    >
                                        {d.include && <Icon name="check" size={16} color={COLORS.brand} />}
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}

                    {activeAccounts.map((account) => {
                        const pair = getCategoryColors(account.type);
                        return (
                            <TouchableOpacity
                                key={account.id}
                                onPress={() => {
                                    setAccountToEdit(account);
                                    setShowAddModal(true);
                                }}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel={`${account.name}, ${formatAmount(account.balance, true)}. Edit`}
                                style={[styles.row, { backgroundColor: pair.bg }]}
                            >
                                <View style={styles.rowIcon}>
                                    <Icon name={(ACCOUNT_ICONS[account.type] || 'account-balance') as any} size={22} color={pair.fg} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowName}>{account.name}</Text>
                                    <Text style={[styles.rowMeta, { color: pair.fg }]}>{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</Text>
                                </View>
                                <Text style={styles.rowBalance}>{formatAmount(account.balance, true)}</Text>
                                <TouchableOpacity onPress={() => deleteAccount(account.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${account.name}`}>
                                    <Icon name="close" size={18} color={pair.fg} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                        setAccountToEdit(null);
                        setShowAddModal(true);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                >
                    <Icon name="add" size={20} color={COLORS.text} />
                    <Text style={styles.addText}>Add another account</Text>
                </TouchableOpacity>
            </ScrollView>

            <AddAccountModal
                visible={showAddModal}
                accountToEdit={accountToEdit}
                onClose={() => {
                    setShowAddModal(false);
                    setAccountToEdit(null);
                }}
                onAdd={addAccount}
                onUpdate={updateAccount}
            />

            <Button label="Continue" onPress={save} disabled={!canContinue} loading={saving} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: SPACING.lg, paddingBottom: SPACING.lg },
    title: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },

    hero: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: 30, paddingVertical: 18 },
    heroOver: { fontSize: 13, fontWeight: '800', color: CATEGORY_PALETTE.groceries.fg, letterSpacing: 0.6 },
    heroValue: { fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1, color: COLORS.onBrand, marginTop: 2 },
    countChip: { backgroundColor: COLORS.night, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
    countChipText: { fontSize: 13, fontWeight: '800', color: COLORS.brand },

    row: { borderRadius: 26, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    rowName: { fontSize: 16, fontWeight: '800', color: COLORS.text, paddingVertical: 0, width: '100%' },
    rowMeta: { fontSize: 13, fontWeight: '700' },
    rowBalance: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    amountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 14, paddingHorizontal: 10, height: 44, width: 116 },
    amountMissing: { borderWidth: 2, borderColor: COLORS.night },
    amountSign: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    amountInput: { flex: 1, minWidth: 0, width: '100%', fontSize: 18, fontWeight: '800', color: COLORS.text, paddingVertical: 0, textAlign: 'right' },
    check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.night, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: COLORS.night },

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
