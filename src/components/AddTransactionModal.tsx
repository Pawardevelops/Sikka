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
    Switch,
    Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from './SafeScreen';
import { Icon } from './Icon';
import { TransactionCategory } from '../types';
import { useAccounts } from '../context/AccountsContext';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../context/TransactionsContext';

interface AddTransactionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (transaction: {
        accountId: string;
        merchant: string;
        category: TransactionCategory;
        amount: number;
        notes?: string;
        isAuto: boolean;
        isImpulse?: boolean;
    }) => void;
}

const CATEGORIES: TransactionCategory[] = [
    'groceries', 'dining', 'transport', 'shopping', 'entertainment',
    'utilities', 'health', 'income', 'transfer', 'other',
];

export function AddTransactionModal({ visible, onClose, onAdd }: AddTransactionModalProps) {
    const { activeAccounts } = useAccounts();
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('other');
    const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');
    const [notes, setNotes] = useState('');
    const [isExpense, setIsExpense] = useState(true);

    const [isImpulse, setIsImpulse] = useState(false);
    const safeTop = useSafeTop();

    const handleAdd = () => {
        if (!merchant.trim() || !amount.trim() || !accountId) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return;

        // Check for insufficient balance on expenses
        if (isExpense) {
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
            amount: isExpense ? -Math.abs(numAmount) : Math.abs(numAmount),
            notes: notes.trim() || undefined,
            isAuto: false,
            isImpulse: isExpense ? isImpulse : undefined, // Only track impulse for expenses
        });

        // Reset form
        setMerchant('');
        setAmount('');
        setCategory('other');
        setNotes('');
        setIsExpense(true);
        setIsImpulse(false);
        onClose();
    };

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
                        style={[styles.saveBtnContainer, (!merchant || !amount || !accountId) && styles.saveBtnDisabledContainer]}
                        onPress={handleAdd}
                        disabled={!merchant || !amount || !accountId}
                        activeOpacity={0.7}
                    >
                        <Icon name="check" size={18} color={(merchant && amount && accountId) ? COLORS.background : COLORS.textMuted} />
                        <Text style={[styles.saveBtn, (!merchant || !amount || !accountId) && styles.saveBtnDisabled]}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    {/* Type Toggle */}
                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.typeBtn, isExpense && styles.typeBtnActiveExpense]}
                            onPress={() => setIsExpense(true)}
                        >
                            <Text style={[styles.typeBtnText, isExpense && styles.typeBtnTextActive]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, !isExpense && styles.typeBtnActiveIncome]}
                            onPress={() => setIsExpense(false)}
                        >
                            <Text style={[styles.typeBtnText, !isExpense && styles.typeBtnTextActive]}>Income</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount */}
                    <View style={styles.amountSection}>
                        <Text style={[styles.currencySymbol, isExpense ? styles.expenseColor : styles.incomeColor]}>
                            {isExpense ? '-₹' : '+₹'}
                        </Text>
                        <TextInput
                            style={[styles.amountInput, isExpense ? styles.expenseColor : styles.incomeColor]}
                            placeholder="0"
                            placeholderTextColor={COLORS.textMuted}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Merchant */}
                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Swiggy, Amazon, Salary..."
                        placeholderTextColor={COLORS.textMuted}
                        value={merchant}
                        onChangeText={setMerchant}
                    />

                    {/* Account Selector */}
                    <Text style={styles.inputLabel}>Account</Text>
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

                    {/* Category Selector */}
                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map(cat => (
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

                    {/* Impulse Spending Toggle - Only show for expenses */}
                    {isExpense && (
                        <View style={styles.impulseCard}>
                            <View style={styles.impulseIconContainer}>
                                <Icon name="flash-on" size={20} color="#FBBF24" />
                            </View>
                            <View style={styles.impulseContent}>
                                <Text style={styles.impulseTitle}>Is this a want?</Text>
                                <Text style={styles.impulseSubtitle}>Track impulse spending</Text>
                            </View>
                            <Switch
                                value={isImpulse}
                                onValueChange={setIsImpulse}
                                trackColor={{ false: COLORS.surfaceLight, true: COLORS.primaryMuted }}
                                thumbColor={isImpulse ? COLORS.primary : COLORS.textMuted}
                            />
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
    typeBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textMuted },
    typeBtnTextActive: { color: COLORS.white },

    // Amount
    amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl },
    currencySymbol: { fontSize: 40, fontWeight: '700' },
    amountInput: { fontSize: 56, fontWeight: '700', minWidth: 100, textAlign: 'center' },
    expenseColor: { color: COLORS.error },
    incomeColor: { color: COLORS.success },

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

    // Impulse Spending Card
    impulseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginTop: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    impulseIconContainer: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    impulseIcon: {
        fontSize: 20,
    },
    impulseContent: {
        flex: 1,
    },
    impulseTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    impulseSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});

export default AddTransactionModal;
