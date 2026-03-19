/**
 * Sikka - Edit Transaction Modal
 * Modal for editing existing transactions
 */

import React, { useState, useEffect } from 'react';

import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from './SafeScreen';
import { Icon } from './Icon';
import { CustomModal } from './CustomModal';
import { Transaction, TransactionCategory } from '../types';
import { useAccounts } from '../context/AccountsContext';
import { CATEGORY_ICONS, CATEGORY_LABELS, useTransactions } from '../context/TransactionsContext';
import { SENTIMENT_LIST } from '../constants/sentiments';
import { Platform } from 'react-native';

interface EditTransactionModalProps {
    visible: boolean;
    transaction: Transaction | null;
    onClose: () => void;
    onEdit: (id: string, updates: Partial<Omit<Transaction, 'id' | 'isDeleted'>>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const CATEGORIES: TransactionCategory[] = [
    'groceries', 'dining', 'transport', 'shopping', 'entertainment',
    'utilities', 'health', 'income', 'transfer', 'other',
];

export function EditTransactionModal({ visible, transaction, onClose, onEdit, onDelete }: EditTransactionModalProps) {
    const { activeAccounts } = useAccounts();
    const { refreshTransactions } = useTransactions();
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('other');
    const [accountId, setAccountId] = useState('');
    const [notes, setNotes] = useState('');
    const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');

    // Date/Time specific
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Sentiments (Multi-select)
    const [sentimentIds, setSentimentIds] = useState<string[]>([]);
    const safeTop = useSafeTop();

    // Custom modal states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTransferWarning, setShowTransferWarning] = useState(false);

    const toggleSentiment = (id: string) => {
        setSentimentIds(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    // Populate form when transaction changes
    useEffect(() => {
        if (visible && transaction) {
            setMerchant(transaction.merchant);
            setAmount(String(Math.abs(transaction.amount)));
            setCategory(transaction.category);
            setAccountId(transaction.accountId);
            setNotes(transaction.notes || '');
            setSentimentIds(transaction.sentimentIds || []);
            setDate(new Date(transaction.timestamp));

            // Determine type from transaction data
            if (transaction.category === 'transfer') {
                setType('transfer');
            } else if (transaction.amount >= 0) {
                setType('income');
            } else {
                setType('expense');
            }
        }
    }, [visible, transaction]);

    const onDateChange = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const updatedDate = new Date(selectedDate);
            updatedDate.setHours(date.getHours());
            updatedDate.setMinutes(date.getMinutes());
            setDate(updatedDate);
        }
    };

    const onTimeChange = (_event: any, selectedTime?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            const updatedDate = new Date(date);
            updatedDate.setHours(selectedTime.getHours());
            updatedDate.setMinutes(selectedTime.getMinutes());
            setDate(updatedDate);
        }
    };

    const handleSave = async () => {
        if (!transaction) return;
        if (!amount.trim()) return;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return;

        // For transfers, show warning via custom modal
        if (type === 'transfer') {
            setShowTransferWarning(true);
            return;
        }

        if (!merchant.trim() || !accountId) return;

        const finalAmount = type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

        await onEdit(transaction.id, {
            accountId,
            merchant: merchant.trim(),
            category,
            amount: finalAmount,
            notes: notes.trim() || undefined,
            type: type === 'income' ? 'credit' : 'debit',
            timestamp: date.getTime(),
            sentimentIds: type === 'expense' ? sentimentIds : [],
        });

        await refreshTransactions();
        onClose();
    };

    const handleDelete = () => {
        if (!transaction) return;
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!transaction) return;
        setShowDeleteConfirm(false);
        await onDelete(transaction.id);
        await refreshTransactions();
        onClose();
    };

    const isExpense = type === 'expense';
    const isIncome = type === 'income';
    const isTransfer = type === 'transfer';

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={'padding'}
            >
                <View style={[styles.modalHeader, { paddingTop: safeTop }]}>
                    <TouchableOpacity style={styles.cancelBtnContainer} onPress={onClose} activeOpacity={0.7}>
                        <Icon name="close" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.cancelBtn}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Edit Transaction</Text>
                    <TouchableOpacity
                        style={[styles.saveBtnContainer, (!amount || !accountId) && styles.saveBtnDisabledContainer]}
                        onPress={handleSave}
                        disabled={!amount || !accountId}
                        activeOpacity={0.7}
                    >
                        <Icon name="check" size={18} color={(amount && accountId) ? COLORS.background : COLORS.textMuted} />
                        <Text style={[styles.saveBtn, (!amount || !accountId) && styles.saveBtnDisabled]}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Type Toggle */}
                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.typeBtn, isExpense && styles.typeBtnActive]}
                            onPress={() => setType('expense')}
                        >
                            <Text style={[styles.typeBtnText, isExpense && styles.typeBtnTextActive]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, isIncome && styles.typeBtnActive]}
                            onPress={() => setType('income')}
                        >
                            <Text style={[styles.typeBtnText, isIncome && styles.typeBtnTextActive]}>Income</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, isTransfer && styles.typeBtnActive]}
                            onPress={() => setType('transfer')}
                            disabled={true}
                        >
                            <Text style={[styles.typeBtnText, isTransfer && styles.typeBtnTextActive]}>Transfer</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount */}
                    <View style={styles.amountSection}>
                        <Text style={[styles.currencySymbol, isExpense ? styles.expenseColor : (isIncome ? styles.incomeColor : styles.transferColor)]}>
                            ₹
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

                    {/* Transaction Time */}
                    <Text style={styles.inputLabel}>TRANSACTION TIME</Text>
                    <View style={styles.manualTimeContainer}>
                        <TouchableOpacity
                            style={styles.dateDisplayBtn}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Icon name="calendar-today" size={20} color={COLORS.primary} />
                            <Text style={styles.dateDisplayText}>
                                {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateDisplayBtn}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Icon name="access-time" size={20} color={COLORS.primary} />
                            <Text style={styles.dateDisplayText}>
                                {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                            />
                        )}
                        {showTimePicker && (
                            <DateTimePicker
                                value={date}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onTimeChange}
                            />
                        )}
                    </View>

                    {/* Account Selector */}
                    <Text style={styles.inputLabel}>Account</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountSelector}>
                        {activeAccounts
                            .filter(acc => {
                                if (!isTransfer && (acc.type === 'investment' || acc.type === 'bitcoin')) return false;
                                return true;
                            })
                            .map(acc => (
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

                    {/* Delete Button */}
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={handleDelete}
                        activeOpacity={0.7}
                    >
                        <Icon name="delete" size={20} color={COLORS.error} />
                        <Text style={styles.deleteBtnText}>Delete Transaction</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>

                {/* Delete Confirmation Modal */}
                <CustomModal
                    visible={showDeleteConfirm}
                    title="Delete Transaction"
                    message="Are you sure you want to delete this transaction? The account balance will be adjusted automatically."
                    type="error"
                    icon="delete"
                    onClose={() => setShowDeleteConfirm(false)}
                    actions={[
                        { text: 'Cancel', onPress: () => setShowDeleteConfirm(false), style: 'cancel' },
                        { text: 'Delete', onPress: confirmDelete, style: 'destructive' },
                    ]}
                />

                {/* Transfer Warning Modal */}
                <CustomModal
                    visible={showTransferWarning}
                    title="Transfer Editing"
                    message="To modify a transfer, please delete it and create a new one."
                    type="info"
                    icon="swap-horiz"
                    onClose={() => setShowTransferWarning(false)}
                    actions={[
                        { text: 'Got it', onPress: () => setShowTransferWarning(false), style: 'primary' },
                    ]}
                />
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
    modalContentContainer: { flexGrow: 1, paddingBottom: 100 },

    // Type Toggle
    typeToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.xs, marginBottom: SPACING.xxl },
    typeBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderRadius: BORDER_RADIUS.sm },
    typeBtnActive: { backgroundColor: COLORS.primary },
    typeBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textMuted },
    typeBtnTextActive: { color: COLORS.white },

    // Amount
    amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl },
    currencySymbol: { fontSize: 40, fontWeight: '700' },
    amountInput: { fontSize: 56, fontWeight: '700', minWidth: 100, textAlign: 'center' },
    expenseColor: { color: COLORS.error },
    incomeColor: { color: COLORS.success },
    transferColor: { color: COLORS.primary },

    manualTimeContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    dateDisplayBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateDisplayText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
        fontWeight: '500',
    },

    // Inputs
    inputLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SPACING.sm, marginTop: SPACING.lg },
    textInput: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, fontSize: FONT_SIZE.md, color: COLORS.text },
    notesInput: { minHeight: 80, textAlignVertical: 'top' },

    // Account Selector
    accountSelector: { marginBottom: SPACING.md },
    accountChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, marginRight: SPACING.sm },
    accountChipActive: { backgroundColor: COLORS.primary },
    accountChipText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
    accountChipTextActive: { color: COLORS.background, fontWeight: '600' },

    // Category Grid
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md },
    categoryChipActive: { backgroundColor: COLORS.primary },
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

    // Delete
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error + '15',
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.lg,
        marginTop: SPACING.xxl,
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.error + '30',
    },
    deleteBtnText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.error,
    },
});

export default EditTransactionModal;
