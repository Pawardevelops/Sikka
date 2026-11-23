/**
 * Sikka - Payment story + edit
 * Design: design-system/screens/Transaction-detail-v2.html
 *
 * Opens on the "payment story" (pastel hero, Felt/From/Category/Source tiles,
 * timeline). "Edit" switches to an edit form in the Add-a-payment style.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, TextInput } from './Typography';
import { Icon } from './Icon';
import { CustomModal } from './CustomModal';
import { COLORS, SPACING, SHADOWS, SIKKA, CATEGORY_PALETTE, getCategoryColors, getPaletteKey, ACCOUNT_ICONS } from '../constants/theme';
import { Transaction, TransactionCategory } from '../types';
import { useAccounts } from '../context/AccountsContext';
import { useCurrency } from '../context/CurrencyContext';
import { CATEGORY_ICONS, useTransactions } from '../context/TransactionsContext';
import { CATEGORY_LABELS, formatTime } from './TransactionRow';
import { SPEND_CATEGORIES } from './AddTransactionModal';
import { Button, IconButton, CategoryTile, MoodFace, MoodPicker, MOODS, Keypad, applyKey } from './ui';

interface EditTransactionModalProps {
    visible: boolean;
    transaction: Transaction | null;
    onClose: () => void;
    onEdit: (id: string, updates: Partial<Omit<Transaction, 'id' | 'isDeleted'>>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function EditTransactionModal({ visible, transaction, onClose, onEdit, onDelete }: EditTransactionModalProps) {
    const insets = useSafeAreaInsets();
    const { activeAccounts, getAccount } = useAccounts();
    const { refreshTransactions } = useTransactions();
    const { formatAmount, currency } = useCurrency();

    const [mode, setMode] = useState<'story' | 'edit'>('story');
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('other');
    const [accountId, setAccountId] = useState('');
    const [notes, setNotes] = useState('');
    const [mood, setMood] = useState<string | undefined>();
    const [date, setDate] = useState(new Date());
    const [dateStep, setDateStep] = useState<null | 'date' | 'time'>(null);
    const [editingAmount, setEditingAmount] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTransferWarning, setShowTransferWarning] = useState(false);

    useEffect(() => {
        if (visible && transaction) {
            setMode('story');
            setMerchant(transaction.merchant);
            setAmount(String(Math.abs(transaction.amount)));
            setCategory(transaction.category);
            setAccountId(transaction.accountId);
            setNotes(transaction.notes || '');
            setMood(transaction.sentimentIds?.[0]);
            setDate(new Date(transaction.timestamp));
            setEditingAmount(false);
        }
    }, [visible, transaction]);

    if (!transaction) return null;

    const isTransfer = transaction.category === 'transfer';
    const isIncome = transaction.amount > 0 && !isTransfer;
    const pair = getCategoryColors(transaction.category);
    const account = getAccount(transaction.accountId);
    const accPair = getCategoryColors(account?.type);
    const txMood = transaction.sentimentIds?.[0];
    const when = new Date(transaction.timestamp);

    const startEdit = () => {
        if (isTransfer) setShowTransferWarning(true);
        else setMode('edit');
    };

    const handleSave = async () => {
        const num = parseFloat(amount);
        if (!num || !merchant.trim() || !accountId) return;
        await onEdit(transaction.id, {
            accountId,
            merchant: merchant.trim(),
            category: isIncome ? 'income' : category,
            amount: isIncome ? Math.abs(num) : -Math.abs(num),
            notes: notes.trim() || undefined,
            type: isIncome ? 'credit' : 'debit',
            timestamp: date.getTime(),
            sentimentIds: !isIncome && mood ? [mood] : [],
            isImpulse: mood === 'impulse',
        });
        await refreshTransactions();
        onClose();
    };

    const confirmDelete = async () => {
        setShowDeleteConfirm(false);
        await onDelete(transaction.id);
        await refreshTransactions();
        onClose();
    };

    // ── Story timeline entries ──
    const story: { icon: string; bg: string; fg: string; title: string; body?: string; bubble?: string }[] = [
        transaction.isAuto
            ? { icon: 'chat-bubble-outline', bg: COLORS.night, fg: COLORS.brand, title: 'Caught from payment SMS', body: formatTime(transaction.timestamp) }
            : { icon: 'edit', bg: COLORS.night, fg: COLORS.brand, title: 'Added by you', body: formatTime(transaction.timestamp) },
        { icon: (ACCOUNT_ICONS[account?.type ?? 'bank'] ?? 'account-balance') as string, bg: accPair.bg, fg: accPair.fg, title: isIncome ? `Into ${account?.name ?? 'account'}` : `From ${account?.name ?? 'account'}`, body: account ? `Balance now ${formatAmount(account.balance)}` : undefined },
    ];
    if (transaction.notes) story.push({ icon: 'notes', bg: CATEGORY_PALETTE.fun.bg, fg: CATEGORY_PALETTE.fun.fg, title: 'Note', bubble: transaction.notes });
    if (txMood) story.push({ icon: 'mood', bg: CATEGORY_PALETTE.bills.bg, fg: CATEGORY_PALETTE.bills.fg, title: `Felt ${MOODS.find((m) => m.id === txMood)?.label.toLowerCase() ?? txMood}` });
    story.push({ icon: 'check', bg: COLORS.brand, fg: COLORS.onBrand, title: 'Recorded', body: 'Sikka only records this — it never moves money' });

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={mode === 'edit' ? () => setMode('story') : onClose}>
            <View style={[styles.container, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }]}>
                {mode === 'story' ? (
                    <>
                        <View style={styles.header}>
                            <IconButton icon="chevron-left" label="Back" onPress={onClose} iconSize={26} />
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity style={styles.editBtn} onPress={startEdit} accessibilityRole="button" activeOpacity={0.85}>
                                <Text style={styles.editText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => setShowDeleteConfirm(true)}
                                accessibilityRole="button"
                                accessibilityLabel="Delete payment"
                            >
                                <Icon name="delete-outline" size={22} color={CATEGORY_PALETTE.shopping.fg} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                            <View style={[styles.hero, { backgroundColor: pair.bg }]}>
                                <View style={styles.heroBlob} pointerEvents="none" />
                                <View style={styles.heroIcon}>
                                    <Icon name={(CATEGORY_ICONS[transaction.category] || 'receipt-long') as any} size={28} color={pair.fg} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.heroTitle} accessibilityRole="header" numberOfLines={2}>{transaction.merchant}</Text>
                                    <Text style={[styles.heroMeta, { color: pair.fg }]}>
                                        {when.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(transaction.timestamp)}
                                    </Text>
                                </View>
                                <Text style={[styles.heroAmount, isIncome && { color: COLORS.primary }]}>
                                    {isIncome ? '+' : ''}{formatAmount(transaction.amount, true)}
                                </Text>
                            </View>

                            <View style={styles.facts}>
                                <View style={[styles.fact, styles.factWhite]}>
                                    <Text style={styles.factOver}>FELT</Text>
                                    {txMood ? <MoodFace mood={txMood} size={30} /> : <Text style={styles.factValue}>—</Text>}
                                </View>
                                <View style={[styles.fact, { backgroundColor: accPair.bg }]}>
                                    <Text style={[styles.factOver, { color: accPair.fg }]}>{isIncome ? 'INTO' : 'FROM'}</Text>
                                    <Text style={[styles.factValue, styles.factSmall]} numberOfLines={2}>{account?.name ?? '—'}</Text>
                                </View>
                                <View style={[styles.fact, { backgroundColor: pair.bg }]}>
                                    <Text style={[styles.factOver, { color: pair.fg }]}>TYPE</Text>
                                    <Text style={styles.factValue} numberOfLines={1}>{CATEGORY_LABELS[transaction.category]}</Text>
                                </View>
                                <View style={[styles.fact, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}>
                                    <Text style={[styles.factOver, { color: CATEGORY_PALETTE.bills.fg }]}>VIA</Text>
                                    <Text style={styles.factValue}>{transaction.isAuto ? 'SMS' : 'You'}</Text>
                                </View>
                            </View>

                            <View style={styles.storyCard}>
                                <Text style={styles.storyTitle}>Payment story</Text>
                                {story.map((s, i) => (
                                    <View key={i} style={styles.storyRow}>
                                        <View style={styles.storyRail}>
                                            <View style={[styles.storyDot, { backgroundColor: s.bg }]}>
                                                <Icon name={s.icon as any} size={16} color={s.fg} />
                                            </View>
                                            {i < story.length - 1 && <View style={styles.storyLine} />}
                                        </View>
                                        <View style={styles.storyText}>
                                            <Text style={styles.storyRowTitle}>{s.title}</Text>
                                            {!!s.body && <Text style={styles.storyRowBody}>{s.body}</Text>}
                                            {!!s.bubble && <Text style={styles.bubble}>"{s.bubble}"</Text>}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </>
                ) : (
                    <>
                        <View style={styles.header}>
                            <IconButton icon="close" label="Cancel editing" onPress={() => setMode('story')} />
                            <Text style={styles.editTitle} accessibilityRole="header">Edit payment</Text>
                        </View>

                        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <View style={styles.amountHero}>
                                <TouchableOpacity
                                    onPress={() => setEditingAmount((v) => !v)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Amount ${amount}. Change`}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
                                        <Text style={styles.currency}>{currency.symbol}</Text>
                                        {amount || '0'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.when} onPress={() => setDateStep('date')} accessibilityRole="button">
                                    <Text style={styles.whenText}>
                                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {formatTime(date.getTime())}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {editingAmount && <Keypad onKey={(k) => setAmount((a) => applyKey(a, k))} />}

                            <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholder="Who was this?" accessibilityLabel="Payee" />

                            {!isIncome && (
                                <View style={styles.catGrid}>
                                    {SPEND_CATEGORIES.map((c) => (
                                        <CategoryTile
                                            key={c}
                                            label={CATEGORY_LABELS[c]}
                                            icon={CATEGORY_ICONS[c] as any}
                                            palette={getPaletteKey(c)}
                                            selected={category === c}
                                            onPress={() => setCategory(c)}
                                            height={76}
                                            style={styles.catTile}
                                        />
                                    ))}
                                </View>
                            )}

                            <Text style={styles.label}>ACCOUNT</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                                {activeAccounts
                                    .filter((a) => a.type !== 'investment' && a.type !== 'bitcoin')
                                    .map((a) => {
                                        const p = getCategoryColors(a.type);
                                        const on = a.id === accountId;
                                        return (
                                            <TouchableOpacity
                                                key={a.id}
                                                onPress={() => setAccountId(a.id)}
                                                style={[styles.accChip, { backgroundColor: p.bg }, on && styles.accChipOn]}
                                                accessibilityRole="radio"
                                                accessibilityState={{ checked: on }}
                                            >
                                                <Icon name={(ACCOUNT_ICONS[a.type] ?? 'account-balance') as any} size={16} color={p.fg} />
                                                <Text style={styles.accChipText}>{a.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                            </ScrollView>

                            <TextInput
                                style={[styles.input, styles.noteInput]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Add a note"
                                multiline
                                accessibilityLabel="Note"
                            />

                            {!isIncome && (
                                <>
                                    <Text style={styles.label}>HOW DID IT FEEL?</Text>
                                    <MoodPicker value={mood} onChange={setMood} />
                                </>
                            )}
                        </ScrollView>

                        <Button label="Save changes" icon="check" onPress={handleSave} disabled={!parseFloat(amount) || !merchant.trim()} />

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
                    </>
                )}

                <CustomModal
                    visible={showDeleteConfirm}
                    title="Delete this payment?"
                    message="Sikka will put the money back in the account's balance."
                    type="error"
                    icon="delete"
                    onClose={() => setShowDeleteConfirm(false)}
                    actions={[
                        { text: 'Keep it', onPress: () => setShowDeleteConfirm(false), style: 'cancel' },
                        { text: 'Delete', onPress: confirmDelete, style: 'destructive' },
                    ]}
                />
                <CustomModal
                    visible={showTransferWarning}
                    title="Transfers can't be edited"
                    message="Delete this transfer and add it again with the right details."
                    type="info"
                    icon="swap-horiz"
                    onClose={() => setShowTransferWarning(false)}
                    actions={[{ text: 'Got it', onPress: () => setShowTransferWarning(false), style: 'primary' }]}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
    editBtn: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', ...SHADOWS.sm },
    editText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: CATEGORY_PALETTE.shopping.bg, alignItems: 'center', justifyContent: 'center' },
    editTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: COLORS.text },
    scroll: { gap: SPACING.md, paddingBottom: SPACING.lg },

    hero: { borderRadius: 32, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
    heroBlob: { position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.35)' },
    heroIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    heroMeta: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    heroAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1, color: COLORS.text },

    facts: { flexDirection: 'row', gap: SPACING.sm },
    fact: { flex: 1, borderRadius: 20, padding: 10, alignItems: 'center', gap: 6, minHeight: 74 },
    factWhite: { backgroundColor: COLORS.surface, ...SHADOWS.sm },
    factOver: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.4 },
    factValue: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 2, textAlign: 'center' },
    factSmall: { fontSize: 12, lineHeight: 15 },

    storyCard: { backgroundColor: COLORS.surface, borderRadius: 30, padding: 18, ...SHADOWS.md },
    storyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
    storyRow: { flexDirection: 'row', gap: SPACING.md },
    storyRail: { alignItems: 'center' },
    storyDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    storyLine: { width: 3, flex: 1, minHeight: 12, borderRadius: 2, backgroundColor: SIKKA.line },
    storyText: { flex: 1, paddingBottom: SPACING.md },
    storyRowTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 6 },
    storyRowBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    bubble: {
        marginTop: 6,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        backgroundColor: '#F3EFFF',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
        overflow: 'hidden',
    },

    amountHero: { backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 32, padding: 18, alignItems: 'center' },
    amount: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -2, color: COLORS.text },
    currency: { fontSize: 32, fontWeight: '800', color: '#7A5600' },
    when: { marginTop: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
    whenText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    input: { minHeight: 54, borderRadius: 27, backgroundColor: COLORS.surface, paddingHorizontal: 20, fontSize: 16, fontWeight: '700', color: COLORS.text, ...SHADOWS.sm },
    noteInput: { borderRadius: 24, paddingVertical: 14, minHeight: 80, textAlignVertical: 'top' },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    catTile: { flexBasis: '22%', flexGrow: 1 },
    label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, color: COLORS.textSecondary, marginTop: SPACING.xs },
    accChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 22 },
    accChipOn: { borderWidth: 3, borderColor: COLORS.night },
    accChipText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
});
