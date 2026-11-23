/**
 * Sikka - Add a payment
 * Design: design-system/screens/Add-transaction-v2.html
 *
 * Spent / Got / Moved · butter amount hero with date chip · description ·
 * category + account tiles · keypad · "Save ₹450".
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, ScrollView, Platform, Alert, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, TextInput } from './Typography';
import { Icon } from './Icon';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors, getPaletteKey, ACCOUNT_ICONS } from '../constants/theme';
import { TransactionCategory, Account } from '../types';
import { useAccounts } from '../context/AccountsContext';
import { useCurrency } from '../context/CurrencyContext';
import { CATEGORY_ICONS } from '../context/TransactionsContext';
import { CATEGORY_LABELS } from './TransactionRow';
import { Button, IconButton, Segmented, Keypad, applyKey, CategoryTile } from './ui';

/** CC: available credit · investments: not spendable · others: balance. */
export function getSpendableAmount(account: Account): number {
    if (account.type === 'credit') {
        const limit = account.creditCardDetails?.creditLimit ?? 0;
        return Math.max(0, limit - Math.abs(account.balance));
    }
    if (account.type === 'investment' || account.type === 'bitcoin') return 0;
    return account.balance;
}

type Mode = 'expense' | 'income' | 'transfer';

interface AddTransactionModalProps {
    visible: boolean;
    initialProps?: { type?: Mode; accountId?: string } | null;
    onClose: () => void;
    onAdd: (transaction: {
        accountId: string;
        merchant: string;
        category: TransactionCategory;
        amount: number;
        notes?: string;
        isAuto: boolean;
        sentimentIds?: string[];
        isImpulse?: boolean;
        type?: 'credit' | 'debit';
        timestamp?: number;
    }) => void;
}

export const SPEND_CATEGORIES: TransactionCategory[] = [
    'dining', 'groceries', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'other',
];

function whenLabel(d: Date) {
    const today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const day = same(d, today) ? 'Today' : same(d, y) ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${day} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}

function notify(title: string, message: string) {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
}

export function AddTransactionModal({ visible, initialProps, onClose, onAdd }: AddTransactionModalProps) {
    const insets = useSafeAreaInsets();
    const { activeAccounts } = useAccounts();
    const { currency, formatAmount } = useCurrency();

    const [mode, setMode] = useState<Mode>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('other');
    const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');
    const [toAccountId, setToAccountId] = useState('');
    const [date, setDate] = useState(new Date());
    const [picker, setPicker] = useState<null | 'category' | 'account' | 'to'>(null);
    const [dateStep, setDateStep] = useState<null | 'date' | 'time'>(null);

    useEffect(() => {
        if (!visible) return;
        setMode(initialProps?.type ?? 'expense');
        setAccountId(initialProps?.accountId ?? activeAccounts[0]?.id ?? '');
        setDate(new Date());
        setAmount('');
        setDescription('');
        setCategory('other');
        setToAccountId('');
        setPicker(null);
    }, [visible, initialProps]);

    const account = activeAccounts.find((a) => a.id === accountId);
    const toAccount = activeAccounts.find((a) => a.id === toAccountId);
    const num = parseFloat(amount) || 0;
    const shownCategory: TransactionCategory = mode === 'income' ? 'income' : mode === 'transfer' ? 'transfer' : category;

    const fail = (title: string, message: string) => {
        Vibration.vibrate(150);
        notify(title, message);
    };

    const handleSave = () => {
        if (num <= 0) return fail('How much?', 'Type the amount first.');
        if (!account) return fail('Which account?', 'Pick the account this came from.');

        if (mode === 'transfer') {
            if (!toAccount) return fail('Moved where?', 'Pick the account the money went to.');
            if (toAccount.id === account.id) return fail('Same account', 'Pick two different accounts.');
            const available = getSpendableAmount(account);
            if (num > available) {
                return fail('Not enough money', `${account.name} has ${formatAmount(available, true)} ${account.type === 'credit' ? 'credit left' : 'available'}.`);
            }
            const note = description.trim();
            onAdd({
                accountId: account.id,
                merchant: 'Transfer Out',
                category: 'transfer',
                amount: -num,
                notes: `To: ${toAccount.name}${note ? `. ${note}` : ''}`,
                isAuto: false,
                type: 'debit',
                timestamp: date.getTime(),
            });
            onAdd({
                accountId: toAccount.id,
                merchant: 'Transfer In',
                category: 'transfer',
                amount: num,
                notes: `From: ${account.name}${note ? `. ${note}` : ''}`,
                isAuto: false,
                type: 'credit',
                timestamp: date.getTime(),
            });
        } else {
            if (!description.trim()) return fail('Who was this?', 'Add a short description, like "Auto to Indiranagar".');
            if (mode === 'expense') {
                const available = getSpendableAmount(account);
                if (num > available) {
                    return fail('Not enough money', `${account.name} only has ${formatAmount(available, true)} ${account.type === 'credit' ? 'credit left' : 'available'}.`);
                }
            }
            onAdd({
                accountId: account.id,
                merchant: description.trim(),
                category: shownCategory,
                amount: mode === 'expense' ? -num : num,
                isAuto: false,
                type: mode === 'income' ? 'credit' : 'debit',
                timestamp: date.getTime(),
            });
        }
        onClose();
    };

    const pair = getCategoryColors(shownCategory);
    const accPair = getCategoryColors(account?.type);
    const toPair = getCategoryColors(toAccount?.type);
    const saveLabel = num > 0 ? `${mode === 'transfer' ? 'Move' : 'Save'} ${formatAmount(num, true)}` : mode === 'transfer' ? 'Move money' : 'Save payment';

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={[styles.container, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }]}>
                <View style={styles.header}>
                    <IconButton icon="close" label="Close" onPress={onClose} />
                    <Segmented
                        label="Type"
                        style={{ flex: 1 }}
                        value={mode}
                        onChange={(m) => { setMode(m); setPicker(null); }}
                        options={[
                            { value: 'expense', label: 'Spent' },
                            { value: 'income', label: 'Got' },
                            { value: 'transfer', label: 'Moved' },
                        ]}
                    />
                </View>

                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* Amount hero */}
                    <View style={styles.hero}>
                        <View style={styles.heroBlob} pointerEvents="none" />
                        <Text style={styles.amount} accessibilityLabel={`Amount ${amount || 0}`} numberOfLines={1} adjustsFontSizeToFit>
                            <Text style={styles.currency}>{currency.symbol}</Text>
                            {amount || '0'}
                        </Text>
                        <TouchableOpacity
                            style={styles.when}
                            onPress={() => setDateStep('date')}
                            accessibilityRole="button"
                            accessibilityLabel={`When: ${whenLabel(date)}. Change`}
                        >
                            <Text style={styles.whenText}>{whenLabel(date)}</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder={mode === 'transfer' ? 'Note (optional)' : mode === 'income' ? 'Who paid you?' : 'What was it for?'}
                        value={description}
                        onChangeText={setDescription}
                        accessibilityLabel="Description"
                        returnKeyType="done"
                    />

                    {/* Category + account tiles */}
                    <View style={styles.pickRow}>
                        {mode === 'transfer' ? (
                            <PickTile
                                label={account?.name ?? 'From'}
                                hint="From"
                                icon={(ACCOUNT_ICONS[account?.type ?? 'bank'] ?? 'account-balance') as any}
                                pair={accPair}
                                onPress={() => setPicker(picker === 'account' ? null : 'account')}
                            />
                        ) : (
                            <PickTile
                                label={CATEGORY_LABELS[shownCategory]}
                                hint="Category"
                                icon={CATEGORY_ICONS[shownCategory] as any}
                                pair={pair}
                                onPress={mode === 'expense' ? () => setPicker(picker === 'category' ? null : 'category') : undefined}
                            />
                        )}
                        {mode === 'transfer' ? (
                            <PickTile
                                label={toAccount?.name ?? 'Pick account'}
                                hint="To"
                                icon={(ACCOUNT_ICONS[toAccount?.type ?? 'bank'] ?? 'account-balance') as any}
                                pair={toAccount ? toPair : { bg: COLORS.surface, fg: COLORS.text }}
                                onPress={() => setPicker(picker === 'to' ? null : 'to')}
                            />
                        ) : (
                            <PickTile
                                label={account?.name ?? 'Pick account'}
                                hint="Account"
                                icon={(ACCOUNT_ICONS[account?.type ?? 'bank'] ?? 'account-balance') as any}
                                pair={accPair}
                                onPress={() => setPicker(picker === 'account' ? null : 'account')}
                            />
                        )}
                    </View>

                    {picker === 'category' && (
                        <View style={styles.catGrid}>
                            {SPEND_CATEGORIES.map((c) => {
                                return (
                                    <CategoryTile
                                        key={c}
                                        label={CATEGORY_LABELS[c]}
                                        icon={CATEGORY_ICONS[c] as any}
                                        palette={getPaletteKey(c)}
                                        selected={category === c}
                                        height={76}
                                        style={styles.catTile}
                                        onPress={() => { setCategory(c); setPicker(null); }}
                                    />
                                );
                            })}
                        </View>
                    )}

                    {(picker === 'account' || picker === 'to') && (
                        <View style={styles.accList}>
                            {activeAccounts
                                .filter((a) => a.type !== 'investment' && a.type !== 'bitcoin')
                                .map((a) => {
                                    const p = getCategoryColors(a.type);
                                    const on = picker === 'to' ? a.id === toAccountId : a.id === accountId;
                                    return (
                                        <TouchableOpacity
                                            key={a.id}
                                            style={[styles.accItem, { backgroundColor: p.bg }, on && styles.accItemOn]}
                                            onPress={() => {
                                                if (picker === 'to') setToAccountId(a.id);
                                                else setAccountId(a.id);
                                                setPicker(null);
                                            }}
                                            accessibilityRole="radio"
                                            accessibilityState={{ checked: on }}
                                        >
                                            <Icon name={(ACCOUNT_ICONS[a.type] ?? 'account-balance') as any} size={18} color={p.fg} />
                                            <Text style={styles.accName} numberOfLines={1}>{a.name}</Text>
                                            <Text style={[styles.accBal, { color: p.fg }]}>{formatAmount(getSpendableAmount(a))}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                        </View>
                    )}

                    {!picker && <Keypad onKey={(k) => setAmount((a) => applyKey(a, k))} />}
                </ScrollView>

                <Button label={saveLabel} icon="check" onPress={handleSave} disabled={num <= 0} />

                {dateStep && (
                    <DateTimePicker
                        value={date}
                        mode={dateStep}
                        maximumDate={new Date()}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_e: any, picked?: Date) => {
                            if (!picked) { setDateStep(null); return; }
                            const next = new Date(date);
                            if (dateStep === 'date') {
                                next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
                                setDate(next);
                                setDateStep(Platform.OS === 'ios' ? null : 'time');
                            } else {
                                next.setHours(picked.getHours(), picked.getMinutes());
                                setDate(next);
                                setDateStep(null);
                            }
                        }}
                    />
                )}
            </View>
        </Modal>
    );
}

function PickTile({
    label,
    hint,
    icon,
    pair,
    onPress,
}: {
    label: string;
    hint: string;
    icon: any;
    pair: { bg: string; fg: string };
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.pick, { backgroundColor: pair.bg }]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${hint}: ${label}${onPress ? '. Change' : ''}`}
        >
            <View style={styles.pickIcon}><Icon name={icon} size={18} color={pair.fg} /></View>
            <Text style={styles.pickLabel} numberOfLines={1}>{label}</Text>
            {onPress && <Icon name="expand-more" size={18} color={pair.fg} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: SPACING.md, paddingBottom: SPACING.sm },

    hero: { backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 32, padding: 18, alignItems: 'center', overflow: 'hidden' },
    heroBlob: { position: 'absolute', left: -20, top: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFD45C' },
    amount: { fontSize: 62, lineHeight: 66, fontWeight: '800', letterSpacing: -2, color: COLORS.text },
    currency: { fontSize: 36, fontWeight: '800', color: '#7A5600' },
    when: { marginTop: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
    whenText: { fontSize: 13, fontWeight: '800', color: COLORS.text },

    input: {
        height: 54,
        borderRadius: 27,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 20,
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        ...SHADOWS.sm,
    },

    pickRow: { flexDirection: 'row', gap: SPACING.sm },
    pick: { flex: 1, height: 56, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    pickIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    pickLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    catTile: { flexBasis: '22%', flexGrow: 1 },

    accList: { gap: SPACING.sm },
    accItem: { height: 52, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
    accItemOn: { borderWidth: 3, borderColor: COLORS.night },
    accName: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
    accBal: { fontSize: 14, fontWeight: '800' },
});
