/**
 * Sikka - New / edit account
 * Design: design-system/screens/Add-account-v2.html
 *
 * Type tiles · live preview card · fields that adapt to the type:
 *  - Bank / cash / wallet / savings: name + balance
 *  - Credit card: name + limit + outstanding + bill day + due day
 *  - Investments / crypto: name + holdings (ticker, qty, avg buy, current)
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from './Typography';
import { Icon } from './Icon';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors, getPaletteKey, ACCOUNT_ICONS } from '../constants/theme';
import { AccountType, Account } from '../types';
import { CreditCardDetails, InvestmentHoldingData } from '../types/accountTypes';
import { useCurrency } from '../context/CurrencyContext';
import { Button, IconButton, CategoryTile } from './ui';

interface AddAccountModalProps {
    visible: boolean;
    accountToEdit?: Account | null;
    onClose: () => void;
    onAdd: (
        account: { name: string; type: AccountType; icon: string; balance: number; color: string; last4?: string },
        ccDetails?: CreditCardDetails,
        holdings?: Omit<InvestmentHoldingData, 'id'>[],
    ) => void;
    onUpdate?: (id: string, updates: Partial<Account>) => void;
}

type Holding = Omit<InvestmentHoldingData, 'id'>;
const EMPTY_HOLDING: Holding = { ticker: '', quantity: 0, avgBuyPrice: 0, currentPrice: 0 };

const TYPES: { value: AccountType; label: string; noun: string }[] = [
    { value: 'bank', label: 'Bank', noun: 'account' },
    { value: 'cash', label: 'Cash', noun: 'cash' },
    { value: 'wallet', label: 'Wallet', noun: 'wallet' },
    { value: 'savings', label: 'Savings', noun: 'savings' },
    { value: 'credit', label: 'Card', noun: 'card' },
    { value: 'investment', label: 'Invest', noun: 'portfolio' },
    { value: 'bitcoin', label: 'Crypto', noun: 'crypto' },
];

const PLACEHOLDER: Record<string, string> = {
    bank: 'HDFC Savings',
    cash: 'Cash in pocket',
    wallet: 'Paytm wallet',
    savings: 'SBI Fixed Deposit',
    credit: 'HDFC Millennia',
    investment: 'Zerodha',
    bitcoin: 'WazirX',
};

const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, '')) || 0;

export function AddAccountModal({ visible, accountToEdit, onClose, onAdd, onUpdate }: AddAccountModalProps) {
    const insets = useSafeAreaInsets();
    const { formatAmount } = useCurrency();
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>('bank');
    const [balance, setBalance] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [billingDay, setBillingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [last4, setLast4] = useState('');
    const [holdings, setHoldings] = useState<Holding[]>([{ ...EMPTY_HOLDING }]);

    const isEdit = !!accountToEdit;
    const isCredit = type === 'credit';
    const isInvest = type === 'investment' || type === 'bitcoin';

    useEffect(() => {
        if (!visible) return;
        if (accountToEdit) {
            setName(accountToEdit.name);
            setType(accountToEdit.type);
            const isCC = accountToEdit.type === 'credit';
            setBalance(String(isCC ? Math.abs(accountToEdit.balance) : accountToEdit.balance));
            setCreditLimit(accountToEdit.creditCardDetails ? String(accountToEdit.creditCardDetails.creditLimit) : '');
            setBillingDay(accountToEdit.creditCardDetails ? String(accountToEdit.creditCardDetails.billingCycleDate) : '');
            setDueDay(accountToEdit.creditCardDetails ? String(accountToEdit.creditCardDetails.dueDate) : '');
            setLast4(accountToEdit.last4 ?? '');
            setHoldings(
                accountToEdit.holdings?.length
                    ? accountToEdit.holdings.map((h) => ({ ticker: h.ticker, quantity: h.quantity, avgBuyPrice: h.avgBuyPrice, currentPrice: h.currentPrice }))
                    : [{ ...EMPTY_HOLDING }],
            );
        } else {
            setName('');
            setType('bank');
            setBalance('');
            setCreditLimit('');
            setBillingDay('');
            setDueDay('');
            setLast4('');
            setHoldings([{ ...EMPTY_HOLDING }]);
        }
    }, [visible, accountToEdit]);

    const setHolding = (i: number, field: keyof Holding, value: string) =>
        setHoldings((prev) => prev.map((h, j) => (j !== i ? h : { ...h, [field]: field === 'ticker' ? value.toUpperCase() : num(value) })));

    const day = (s: string, fallback: number) => Math.min(31, Math.max(1, parseInt(s, 10) || fallback));

    const handleSave = () => {
        if (!name.trim()) return;
        // Card debt is stored as a positive amount owed; spending on the card adds to it
        // (see TransactionsContext), paying the bill takes it down.
        const bal = isCredit ? Math.abs(num(balance)) : num(balance);
        const cc: CreditCardDetails | undefined = isCredit
            ? { creditLimit: num(creditLimit), billingCycleDate: day(billingDay, 1), dueDate: day(dueDay, 15) }
            : undefined;
        const icon = ACCOUNT_ICONS[type] ?? 'account-balance';

        if (accountToEdit && onUpdate) {
            onUpdate(accountToEdit.id, { name: name.trim(), type, icon, balance: bal, last4: last4 || undefined, ...(cc ? { creditCardDetails: cc } : {}) });
        } else {
            onAdd(
                { name: name.trim(), type, icon, balance: bal, color: getCategoryColors(type).bg, last4: last4 || undefined },
                cc,
                isInvest ? holdings.filter((h) => h.ticker.trim()) : undefined,
            );
        }
        onClose();
    };

    const pair = getCategoryColors(type);
    const noun = TYPES.find((t) => t.value === type)?.noun ?? 'account';
    const previewValue = isInvest
        ? holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0)
        : isCredit ? -Math.abs(num(balance)) : num(balance);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.container, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }]}
            >
                <View style={styles.header}>
                    <IconButton icon="close" label="Close" onPress={onClose} />
                    <Text style={styles.title} accessibilityRole="header">{isEdit ? 'Edit account' : 'New account'}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.types} accessibilityRole="radiogroup" accessibilityLabel="Account type">
                        {TYPES.map((t) => (
                            <CategoryTile
                                key={t.value}
                                label={t.label}
                                icon={(ACCOUNT_ICONS[t.value] ?? 'account-balance') as any}
                                palette={getPaletteKey(t.value)}
                                selected={type === t.value}
                                onPress={() => setType(t.value)}
                                height={72}
                                style={styles.typeTile}
                            />
                        ))}
                    </View>

                    {/* Preview */}
                    <View style={[styles.preview, { backgroundColor: pair.bg }]} accessibilityLabel="Preview">
                        <View style={styles.previewBlob} pointerEvents="none" />
                        <View style={styles.previewTop}>
                            {isCredit ? <View style={styles.chip} /> : (
                                <View style={styles.previewIcon}><Icon name={(ACCOUNT_ICONS[type] ?? 'account-balance') as any} size={20} color={pair.fg} /></View>
                            )}
                            <Text style={[styles.previewTag, { color: pair.fg }]}>Preview</Text>
                        </View>
                        <View style={styles.previewBottom}>
                            <Text style={styles.previewName} numberOfLines={1}>{name.trim() || PLACEHOLDER[type]}</Text>
                            <Text style={styles.previewValue}>{formatAmount(previewValue, true)}</Text>
                        </View>
                    </View>

                    <Field label="Name">
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={PLACEHOLDER[type]} accessibilityLabel="Name" />
                    </Field>

                    {(type === 'bank' || type === 'savings' || isCredit) && (
                        <Field label="Last 4 digits">
                            <TextInput
                                style={styles.input}
                                value={last4}
                                onChangeText={(t) => setLast4(t.replace(/[^0-9]/g, '').slice(0, 4))}
                                placeholder="7731"
                                keyboardType="number-pad"
                                maxLength={4}
                                accessibilityLabel="Last 4 digits of the account or card"
                            />
                            {last4.length === 4 && (
                                <Text style={styles.last4Hint}>Bank SMS ending {last4} will land here.</Text>
                            )}
                        </Field>
                    )}

                    {!isCredit && !isInvest && (
                        <Field label={isEdit ? 'Balance' : 'Balance today'}>
                            <TextInput style={styles.input} value={balance} onChangeText={setBalance} placeholder="0" keyboardType="decimal-pad" accessibilityLabel="Balance" />
                        </Field>
                    )}

                    {isCredit && (
                        <>
                            <View style={styles.row2}>
                                <Field label="Limit" style={{ flex: 1 }}>
                                    <TextInput style={styles.input} value={creditLimit} onChangeText={setCreditLimit} placeholder="1,50,000" keyboardType="decimal-pad" accessibilityLabel="Credit limit" />
                                </Field>
                                <Field label="Owed now" style={{ flex: 1 }}>
                                    <TextInput style={styles.input} value={balance} onChangeText={setBalance} placeholder="0" keyboardType="decimal-pad" accessibilityLabel="Outstanding" />
                                </Field>
                            </View>
                            <View style={styles.row2}>
                                <Field label="Bill day" style={{ flex: 1 }}>
                                    <TextInput style={styles.input} value={billingDay} onChangeText={setBillingDay} placeholder="1" keyboardType="number-pad" maxLength={2} accessibilityLabel="Billing day of month" />
                                </Field>
                                <Field label="Due day" style={{ flex: 1 }}>
                                    <TextInput style={styles.input} value={dueDay} onChangeText={setDueDay} placeholder="15" keyboardType="number-pad" maxLength={2} accessibilityLabel="Due day of month" />
                                </Field>
                            </View>
                        </>
                    )}

                    {isInvest && (
                        isEdit ? (
                            <View style={[styles.note, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}>
                                <Icon name="info-outline" size={20} color={CATEGORY_PALETTE.bills.fg} />
                                <Text style={[styles.noteText, { color: CATEGORY_PALETTE.bills.fg }]}>Editing holdings after adding is coming soon.</Text>
                            </View>
                        ) : (
                            <View style={{ gap: SPACING.sm }}>
                                <Text style={styles.label}>Holdings</Text>
                                {holdings.map((h, i) => (
                                    <View key={i} style={styles.holding}>
                                        <View style={styles.holdingHead}>
                                            <TextInput
                                                style={[styles.input, styles.ticker]}
                                                value={h.ticker}
                                                onChangeText={(v) => setHolding(i, 'ticker', v)}
                                                placeholder="NIFTYBEES"
                                                autoCapitalize="characters"
                                                accessibilityLabel={`Holding ${i + 1} ticker`}
                                            />
                                            {holdings.length > 1 && (
                                                <IconButton icon="close" label={`Remove holding ${i + 1}`} variant="ghost" size={40} onPress={() => setHoldings((p) => p.filter((_, j) => j !== i))} />
                                            )}
                                        </View>
                                        <View style={styles.row3}>
                                            {(['quantity', 'avgBuyPrice', 'currentPrice'] as const).map((f) => (
                                                <View key={f} style={{ flex: 1, gap: 4 }}>
                                                    <Text style={styles.miniLabel}>{f === 'quantity' ? 'Qty' : f === 'avgBuyPrice' ? 'Avg buy' : 'Now'}</Text>
                                                    <TextInput
                                                        style={[styles.input, styles.small]}
                                                        value={h[f] ? String(h[f]) : ''}
                                                        onChangeText={(v) => setHolding(i, f, v)}
                                                        keyboardType="decimal-pad"
                                                        placeholder="0"
                                                        accessibilityLabel={`Holding ${i + 1} ${f}`}
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.dashed} onPress={() => setHoldings((p) => [...p, { ...EMPTY_HOLDING }])} accessibilityRole="button">
                                    <Icon name="add" size={18} color={COLORS.text} />
                                    <Text style={styles.dashedText}>Add holding</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}

                    {!isEdit && (
                        <View style={[styles.note, { backgroundColor: CATEGORY_PALETTE.groceries.bg }]}>
                            <Icon name="lock-outline" size={20} color={CATEGORY_PALETTE.groceries.fg} />
                            <Text style={[styles.noteText, { color: CATEGORY_PALETTE.groceries.fg }]}>
                                {isInvest ? 'Prices stay on this phone. Sikka never fetches them.' : 'Balances stay on this phone. Sikka never connects to your bank.'}
                            </Text>
                        </View>
                    )}
                </ScrollView>

                <Button label={isEdit ? 'Save changes' : `Add ${noun}`} icon="check" onPress={handleSave} disabled={!name.trim()} />
            </KeyboardAvoidingView>
        </Modal>
    );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
    return (
        <View style={[{ gap: 6 }, style]}>
            <Text style={styles.label}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    last4Hint: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 6 },
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    scroll: { gap: 14, paddingBottom: SPACING.lg },

    types: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    typeTile: { flexBasis: '22%', flexGrow: 0, width: '23%' },

    preview: { height: 130, borderRadius: 28, paddingVertical: SPACING.lg, paddingHorizontal: 18, justifyContent: 'space-between', overflow: 'hidden' },
    previewBlob: { position: 'absolute', right: -24, top: -24, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.35)' },
    previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: { width: 40, height: 28, borderRadius: 8, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.night },
    previewIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    previewTag: { fontSize: 12, fontWeight: '800' },
    previewBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: SPACING.md },
    previewName: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
    previewValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },

    label: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, paddingLeft: 6 },
    miniLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, paddingLeft: 6 },
    input: { height: 54, borderRadius: 27, backgroundColor: COLORS.surface, paddingHorizontal: 20, fontSize: 16, fontWeight: '700', color: COLORS.text, ...SHADOWS.sm },
    small: { height: 48, borderRadius: 24, paddingHorizontal: 14, fontSize: 15 },
    ticker: { flex: 1 },
    row2: { flexDirection: 'row', gap: 10 },
    row3: { flexDirection: 'row', gap: SPACING.sm },
    holding: { backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 24, padding: SPACING.md, gap: SPACING.sm },
    holdingHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    dashed: { height: 52, borderRadius: 26, borderWidth: 2, borderStyle: 'dashed', borderColor: '#BDB5A6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    dashedText: { fontSize: 15, fontWeight: '800', color: COLORS.text },

    note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14 },
    noteText: { flex: 1, fontSize: 14, fontWeight: '700' },
});
