/**
 * Sikka - Add Transaction Modal
 * Modal for adding new transactions
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from './SafeScreen';
import { Icon } from './Icon';
import { TransactionCategory } from '../types';
import { useAccounts } from '../context/AccountsContext';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../context/TransactionsContext';
import { SENTIMENT_LIST } from '../constants/sentiments';

interface AddTransactionModalProps {
    visible: boolean;
    initialProps?: { type?: 'income' | 'expense' | 'transfer', accountId?: string } | null;
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
    }) => void;
}

const CATEGORIES: TransactionCategory[] = [
    'groceries', 'dining', 'transport', 'shopping', 'entertainment',
    'utilities', 'health', 'income', 'transfer', 'other',
];

export function AddTransactionModal({ visible, initialProps, onClose, onAdd }: AddTransactionModalProps) {
    const { activeAccounts } = useAccounts();
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('other');
    const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');

    // Transfer specific
    const [toAccountId, setToAccountId] = useState('');

    const [notes, setNotes] = useState('');
    const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');

    // Sentiments (Multi-select)
    const [sentimentIds, setSentimentIds] = useState<string[]>([]);
    const safeTop = useSafeTop();

    const toggleSentiment = (id: string) => {
        setSentimentIds(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    // Handle Initial Props
    React.useEffect(() => {
        if (visible && initialProps) {
            if (initialProps.type) setType(initialProps.type);
            if (initialProps.accountId) setAccountId(initialProps.accountId);
        } else if (visible) {
            // Reset to defaults if no props
            setType('expense');
            if (activeAccounts.length > 0) setAccountId(activeAccounts[0].id);
        }
    }, [visible, initialProps]);

    const handleAdd = () => {
        // Validation
        if (!amount.trim()) return;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return;

        if (type === 'transfer') {
            if (!accountId || !toAccountId) {
                Alert.alert('Missing Details', 'Please select both From and To accounts.');
                return;
            }
            if (accountId === toAccountId) {
                Alert.alert('Invalid Transfer', 'Cannot transfer to the same account.');
                return;
            }
            // Check balance
            const fromAccount = activeAccounts.find(acc => acc.id === accountId);
            if (fromAccount && numAmount > fromAccount.balance) {
                Alert.alert('Insufficient Balance', `Account "${fromAccount.name}" has insufficient funds.`);
                return;
            }

            // Add OUT transaction (Debit)
            onAdd({
                accountId,
                merchant: 'Transfer Out',
                category: 'transfer',
                amount: -Math.abs(numAmount),
                notes: notes ? `To: ${activeAccounts.find(a => a.id === toAccountId)?.name}. ${notes}` : `To: ${activeAccounts.find(a => a.id === toAccountId)?.name}`,
                isAuto: false,
                type: 'debit',
            });

            // Add IN transaction (Credit)
            // Note: onAdd currently only adds one. The parent needs to handle this or we call it twice.
            // Since onAdd adds to context, calling it twice is fine.
            setTimeout(() => {
                onAdd({
                    accountId: toAccountId,
                    merchant: 'Transfer In',
                    category: 'transfer',
                    amount: Math.abs(numAmount),
                    notes: notes ? `From: ${activeAccounts.find(a => a.id === accountId)?.name}. ${notes}` : `From: ${activeAccounts.find(a => a.id === accountId)?.name}`,
                    isAuto: false,
                    type: 'credit',
                });
            }, 100);

        } else {
            // Regular Expense/Income
            if (!merchant.trim() || !accountId) return;

            // Check for insufficient balance on expenses
            if (type === 'expense') {
                const selectedAccount = activeAccounts.find(acc => acc.id === accountId);
                if (selectedAccount && Math.abs(numAmount) > selectedAccount.balance) {
                    const message = `Your "${selectedAccount.name}" account only has ₹${selectedAccount.balance.toLocaleString()}. You can't spend ₹${Math.abs(numAmount).toLocaleString()}.`;
                    if (Platform.OS === 'web') {
                        window.alert(`Insufficient Balance\n\n${message}`);
                    } else {
                        Alert.alert('Insufficient Balance', message, [{ text: 'OK' }]);
                    }
                    return;
                }
            }

            onAdd({
                accountId,
                merchant: merchant.trim(),
                category,
                amount: type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount),
                notes: notes.trim() || undefined,
                isAuto: false,
                sentimentIds: type === 'expense' ? sentimentIds : [],
                isImpulse: type === 'expense' ? sentimentIds.includes('impulse') : undefined,
                type: type === 'income' ? 'credit' : 'debit',
            });
        }

        // Reset form
        setMerchant('');
        setAmount('');
        setCategory('other');
        setNotes('');
        setType('expense');
        setSentimentIds([]);
        setToAccountId('');
        onClose();
    };

    const isExpense = type === 'expense';
    const isIncome = type === 'income';
    const isTransfer = type === 'transfer';

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[styles.modalHeader, { paddingTop: safeTop }]}>
                    <TouchableOpacity style={styles.cancelBtnContainer} onPress={onClose} activeOpacity={0.7}>
                        <Icon name="close" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.cancelBtn}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Add Transaction</Text>
                    <TouchableOpacity
                        style={[styles.saveBtnContainer, (!amount || !accountId || (isTransfer && !toAccountId)) && styles.saveBtnDisabledContainer]}
                        onPress={handleAdd}
                        disabled={!amount || !accountId || (isTransfer && !toAccountId)}
                        activeOpacity={0.7}
                    >
                        <Icon name="check" size={18} color={(amount && accountId) ? COLORS.background : COLORS.textMuted} />
                        <Text style={[styles.saveBtn, (!amount || !accountId) && styles.saveBtnDisabled]}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    {/* Type Toggle */}
                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.typeBtn, isExpense && styles.typeBtnActiveExpense]}
                            onPress={() => setType('expense')}
                        >
                            <Text style={[styles.typeBtnText, isExpense && styles.typeBtnTextActive]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, isIncome && styles.typeBtnActiveIncome]}
                            onPress={() => setType('income')}
                        >
                            <Text style={[styles.typeBtnText, isIncome && styles.typeBtnTextActive]}>Income</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, isTransfer && styles.typeBtnActiveTransfer]}
                            onPress={() => setType('transfer')}
                        >
                            <Text style={[styles.typeBtnText, isTransfer && styles.typeBtnTextActive]}>Transfer</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount */}
                    <View style={styles.amountSection}>
                        <Text style={[styles.currencySymbol, isExpense ? styles.expenseColor : (isIncome ? styles.incomeColor : styles.transferColor)]}>
                            {isExpense ? '-₹' : (isIncome ? '+₹' : '₹')}
                        </Text>
                        <TextInput
                            style={[styles.amountInput, isExpense ? styles.expenseColor : (isIncome ? styles.incomeColor : styles.transferColor)]}
                            placeholder="0"
                            placeholderTextColor={COLORS.textMuted}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* From Account Selector */}
                    <Text style={styles.inputLabel}>{isTransfer ? 'From Account' : 'Account'}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountSelector}>
                        {activeAccounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[styles.accountChip, accountId === acc.id && styles.accountChipActive]}
                                onPress={() => setAccountId(acc.id)}
                            >
                                <View style={{ marginRight: SPACING.sm }}>
                                    <Icon name={acc.icon as any} size={18} color={accountId === acc.id ? COLORS.background : COLORS.text} />
                                </View>
                                <Text style={[styles.accountChipText, accountId === acc.id && styles.accountChipTextActive]}>
                                    {acc.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* To Account Selector (Transfer Only) */}
                    {isTransfer && (
                        <>
                            <Text style={styles.inputLabel}>To Account</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountSelector}>
                                {activeAccounts.filter(a => a.id !== accountId).map(acc => (
                                    <TouchableOpacity
                                        key={acc.id}
                                        style={[styles.accountChip, toAccountId === acc.id && styles.accountChipActive]}
                                        onPress={() => setToAccountId(acc.id)}
                                    >
                                        <View style={{ marginRight: SPACING.sm }}>
                                            <Icon name={acc.icon as any} size={18} color={toAccountId === acc.id ? COLORS.background : COLORS.text} />
                                        </View>
                                        <Text style={[styles.accountChipText, toAccountId === acc.id && styles.accountChipTextActive]}>
                                            {acc.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Merchant & Category (Hide for Transfer) */}
                    {!isTransfer && (
                        <>
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Swiggy, Amazon, Salary..."
                                placeholderTextColor={COLORS.textMuted}
                                value={merchant}
                                onChangeText={setMerchant}
                            />

                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {CATEGORIES.filter(c => c !== 'transfer').map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <View style={{ marginRight: SPACING.xs }}>
                                            <Icon name={CATEGORY_ICONS[cat] as any} size={16} color={category === cat ? COLORS.background : COLORS.text} />
                                        </View>
                                        <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                                            {CATEGORY_LABELS[cat]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Sentiment Selector - Only show for expenses */}
                    {isExpense && (
                        <View style={styles.sentimentSection}>
                            <Text style={styles.inputLabel}>How did this spend feel?</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.sentimentScroll}
                                contentContainerStyle={styles.sentimentContainer}
                            >
                                {SENTIMENT_LIST.map((sentiment) => {
                                    const isSelected = sentimentIds.includes(sentiment.id);
                                    return (
                                        <TouchableOpacity
                                            key={sentiment.id}
                                            style={[
                                                styles.sentimentChip,
                                                isSelected && { backgroundColor: sentiment.color + '20', borderColor: sentiment.color }
                                            ]}
                                            onPress={() => toggleSentiment(sentiment.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.sentimentLabel,
                                                isSelected && { color: sentiment.color, fontWeight: '700' }
                                            ]}>
                                                {sentiment.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Notes */}
                    <Text style={styles.inputLabel}>Notes (optional)</Text>
                    <TextInput
                        style={[styles.textInput, styles.notesInput]}
                        placeholder="Add any notes..."
                        placeholderTextColor={COLORS.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: { flex: 1, backgroundColor: COLORS.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text },
    cancelBtnContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        gap: SPACING.xs,
    },
    cancelBtn: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, fontWeight: '500' },
    saveBtnContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        gap: SPACING.xs,
    },
    saveBtn: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.background },
    saveBtnDisabledContainer: { backgroundColor: COLORS.surfaceLight },
    saveBtnDisabled: { color: COLORS.textMuted },
    modalContent: { flex: 1, padding: SPACING.xl },

    // Type Toggle
    typeToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.xs, marginBottom: SPACING.xxl },
    typeBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderRadius: BORDER_RADIUS.sm },
    typeBtnActiveExpense: { backgroundColor: COLORS.error },
    typeBtnActiveIncome: { backgroundColor: COLORS.success },
    typeBtnActiveTransfer: { backgroundColor: COLORS.primary },
    typeBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textMuted },
    typeBtnTextActive: { color: COLORS.white },

    // Amount
    amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl },
    currencySymbol: { fontSize: 40, fontWeight: '700' },
    amountInput: { fontSize: 56, fontWeight: '700', minWidth: 100, textAlign: 'center' },
    expenseColor: { color: COLORS.error },
    incomeColor: { color: COLORS.success },
    transferColor: { color: COLORS.primary },

    // Inputs
    inputLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SPACING.sm, marginTop: SPACING.lg },
    textInput: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, fontSize: FONT_SIZE.md, color: COLORS.text },
    notesInput: { minHeight: 80, textAlignVertical: 'top' },

    // Account Selector
    accountSelector: { marginBottom: SPACING.md },
    accountChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, marginRight: SPACING.sm },
    accountChipActive: { backgroundColor: COLORS.primary },
    accountChipIcon: { fontSize: 18, marginRight: SPACING.sm },
    accountChipText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
    accountChipTextActive: { color: COLORS.background, fontWeight: '600' },

    // Category Grid
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md },
    categoryChipActive: { backgroundColor: COLORS.primary },
    categoryChipIcon: { fontSize: 16, marginRight: SPACING.xs },
    categoryChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
    categoryChipTextActive: { color: COLORS.background, fontWeight: '600' },

    // Sentiment Selector
    sentimentSection: {
        marginBottom: SPACING.xl,
    },
    sentimentScroll: {
        maxHeight: 50,
    },
    sentimentContainer: {
        paddingRight: SPACING.xl,
        gap: SPACING.sm,
    },
    sentimentChip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm + 4,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentimentLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
});

export default AddTransactionModal;
