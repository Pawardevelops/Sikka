/**
 * Sikka - Pay card bill (bottom sheet)
 * Design: design-system/screens/Pay-bill-v2.html
 * Full outstanding / minimum due / other amount · paid-from account · "Record ₹X".
 * Sikka only records the payment: a debit on the bank, a credit on the card.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Pressable, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from './Typography';
import { Icon } from './Icon';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors, ACCOUNT_ICONS } from '../constants/theme';
import { Account } from '../types';
import { useAccounts } from '../context/AccountsContext';
import { useTransactions } from '../context/TransactionsContext';
import { useCurrency } from '../context/CurrencyContext';
import { Button, IconButton } from './ui';

interface PayBillModalProps {
    visible: boolean;
    ccAccount: Account;
    onClose: () => void;
}

type Mode = 'full' | 'minimum' | 'other';
const MIN_DUE_RATE = 0.05;

function notify(title: string, message: string) {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
}

export function PayBillModal({ visible, ccAccount, onClose }: PayBillModalProps) {
    const insets = useSafeAreaInsets();
    const { activeAccounts } = useAccounts();
    const { addTransaction } = useTransactions();
    const { formatAmount } = useCurrency();

    const [mode, setMode] = useState<Mode>('full');
    const [custom, setCustom] = useState('');
    const [sourceId, setSourceId] = useState('');
    const [busy, setBusy] = useState(false);

    const outstanding = Math.abs(ccAccount.balance); // legacy cards may store debt as positive
    const minimum = Math.min(outstanding, Math.ceil(outstanding * MIN_DUE_RATE));
    const amount = mode === 'full' ? outstanding : mode === 'minimum' ? minimum : parseFloat(custom) || 0;

    const sources = activeAccounts.filter(
        (a) => a.id !== ccAccount.id && a.type !== 'credit' && a.type !== 'investment' && a.type !== 'bitcoin',
    );
    const source = sources.find((a) => a.id === sourceId) ?? sources[0];

    useEffect(() => {
        if (!visible) return;
        setMode('full');
        setCustom('');
        // Default to an account that can actually cover the full bill (v3: Pay bill source).
        const fits = [...sources].sort((x, y) => y.balance - x.balance).find((a) => a.balance >= outstanding);
        setSourceId((fits ?? sources[0])?.id ?? '');
    }, [visible]);

    const cycleSource = () => {
        if (sources.length < 2 || !source) return;
        const i = sources.findIndex((a) => a.id === source.id);
        setSourceId(sources[(i + 1) % sources.length].id);
    };

    const handleRecord = async () => {
        if (amount <= 0) return notify('How much?', 'Pick or type the amount you paid.');
        if (!source) return notify('Paid from where?', 'Add a bank account first.');
        if (amount > outstanding) return notify('More than you owe', `Outstanding is ${formatAmount(outstanding, true)}.`);
        if (amount > source.balance) return notify('Not enough money', `${source.name} has ${formatAmount(source.balance, true)}.`);
        setBusy(true);
        try {
            await addTransaction({
                accountId: source.id,
                merchant: `CC Bill Payment — ${ccAccount.name}`,
                category: 'transfer',
                amount: -amount,
                type: 'debit',
                isAuto: false,
                sentimentIds: [],
            });
            await addTransaction({
                accountId: ccAccount.id,
                merchant: `Bill Payment from ${source.name}`,
                category: 'transfer',
                amount,
                type: 'credit',
                isAuto: false,
                sentimentIds: [],
            });
            onClose();
        } catch (e) {
            console.error('Error paying bill:', e);
            notify('Could not record it', 'Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const options: { mode: Mode; label: string; value?: number }[] = [
        { mode: 'full', label: 'Full outstanding', value: outstanding },
        { mode: 'minimum', label: 'Minimum due', value: minimum },
        { mode: 'other', label: 'Other amount' },
    ];
    const srcPair = getCategoryColors(source?.type);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.xxl }]}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={styles.title} accessibilityRole="header">Pay card bill</Text>
                        <IconButton icon="close" label="Close" onPress={onClose} size={42} />
                    </View>

                    <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Amount">
                        {options.map((o) => {
                            const on = mode === o.mode;
                            return (
                                <TouchableOpacity
                                    key={o.mode}
                                    onPress={() => setMode(o.mode)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: on }}
                                    activeOpacity={0.85}
                                    style={[styles.option, on && styles.optionOn]}
                                >
                                    <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                                    <Text style={styles.optionLabel}>{o.label}</Text>
                                    {o.mode === 'other' ? (
                                        on ? (
                                            <TextInput
                                                style={styles.otherInput}
                                                value={custom}
                                                onChangeText={(t) => setCustom(t.replace(/[^0-9.]/g, ''))}
                                                keyboardType="decimal-pad"
                                                placeholder="0"
                                                autoFocus
                                                accessibilityLabel="Other amount"
                                            />
                                        ) : (
                                            <Text style={styles.otherHint}>₹ —</Text>
                                        )
                                    ) : (
                                        <Text style={styles.optionValue}>{formatAmount(o.value ?? 0, true)}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {source ? (
                        <TouchableOpacity
                            style={[styles.source, { backgroundColor: srcPair.bg }]}
                            onPress={cycleSource}
                            disabled={sources.length < 2}
                            accessibilityRole="button"
                            accessibilityLabel={`Paid from ${source.name}${sources.length > 1 ? '. Change' : ''}`}
                            activeOpacity={0.85}
                        >
                            <View style={styles.sourceIcon}><Icon name={(ACCOUNT_ICONS[source.type] ?? 'account-balance') as any} size={22} color={srcPair.fg} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sourceOver, { color: srcPair.fg }]}>PAID FROM</Text>
                                <Text style={styles.sourceName}>{source.name}</Text>
                                <Text style={[styles.sourceMeta, { color: srcPair.fg }]}>
                                    {formatAmount(source.balance, true)} → {formatAmount(source.balance - amount, true)} after
                                </Text>
                            </View>
                            {sources.length > 1 && <Icon name="swap-vert" size={22} color={srcPair.fg} />}
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.source, { backgroundColor: COLORS.surface }]}>
                            <Text style={styles.sourceName}>Add a bank account to pay from</Text>
                        </View>
                    )}

                    <View style={styles.note}>
                        <Icon name="info-outline" size={20} color={CATEGORY_PALETTE.fun.fg} />
                        <Text style={styles.noteText}>Sikka only records this. Pay in your bank app — the SMS will match it.</Text>
                    </View>

                    <Button
                        label={amount > 0 ? `Record ${formatAmount(amount, true)}` : 'Record payment'}
                        icon="check"
                        onPress={handleRecord}
                        disabled={amount <= 0 || !source}
                        loading={busy}
                        style={{ marginTop: SPACING.sm }}
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
    sheet: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: SPACING.lg,
        paddingTop: 10,
        gap: 14,
    },
    handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#D9D1C1', alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.text },

    options: { gap: SPACING.sm },
    option: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, minHeight: 64, ...SHADOWS.sm },
    optionOn: { backgroundColor: COLORS.brand, borderWidth: 3, borderColor: COLORS.night, padding: 13 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#BDB5A6', alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: COLORS.night, borderColor: COLORS.night },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.brand },
    optionLabel: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
    optionValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    otherHint: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
    otherInput: { minWidth: 100, textAlign: 'right', fontSize: 22, fontWeight: '800', color: COLORS.text, paddingVertical: 0 },

    source: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: 26, paddingVertical: 12, paddingHorizontal: 14 },
    sourceIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    sourceOver: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
    sourceName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    sourceMeta: { fontSize: 12, fontWeight: '600' },

    note: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: CATEGORY_PALETTE.fun.bg, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14 },
    noteText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: CATEGORY_PALETTE.fun.fg },
});
