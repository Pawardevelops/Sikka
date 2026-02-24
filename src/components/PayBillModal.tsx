/**
 * Sikka - Pay Bill Modal
 * Bottom-sheet for paying credit card bills from a bank account.
 *
 * Creates 2 linked transactions:
 *  1. Debit on source bank:  -amount  (merchant: "CC Bill Payment — {ccName}")
 *  2. Credit on CC account:  +amount  (merchant: "Bill Payment from {bankName}")
 */

import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { Icon } from './Icon';
import { useAccounts } from '../context/AccountsContext';
import { useTransactions } from '../context/TransactionsContext';
import { useCurrency } from '../context/CurrencyContext';
import { Account } from '../types';

interface PayBillModalProps {
    visible: boolean;
    ccAccount: Account;
    onClose: () => void;
}

export function PayBillModal({ visible, ccAccount, onClose }: PayBillModalProps) {
    const { activeAccounts } = useAccounts();
    const { addTransaction } = useTransactions();
    const { formatAmount } = useCurrency();

    const [payMode, setPayMode] = useState<'full' | 'custom'>('full');
    const [customAmount, setCustomAmount] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState('');

    const outstanding = Math.abs(ccAccount.balance);
    const payAmount = payMode === 'full' ? outstanding : (parseFloat(customAmount) || 0);

    // Eligible source accounts: non-CC, non-investment, non-deleted, with balance > 0
    const sourceAccounts = activeAccounts.filter(acc =>
        acc.id !== ccAccount.id &&
        acc.type !== 'credit' &&
        acc.type !== 'investment' &&
        acc.type !== 'bitcoin'
    );

    // Auto-select first source account
    useEffect(() => {
        if (visible && sourceAccounts.length > 0 && !sourceAccountId) {
            setSourceAccountId(sourceAccounts[0].id);
        }
    }, [visible]);

    // Reset on open
    useEffect(() => {
        if (visible) {
            setPayMode('full');
            setCustomAmount('');
            if (sourceAccounts.length > 0) {
                setSourceAccountId(sourceAccounts[0].id);
            }
        }
    }, [visible]);

    const handlePay = async () => {
        if (payAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount to pay.');
            return;
        }
        if (!sourceAccountId) {
            Alert.alert('No Source Account', 'Please select a bank account to pay from.');
            return;
        }
        if (payAmount > outstanding) {
            Alert.alert('Overpayment', `Outstanding is only ${formatAmount(outstanding)}. You cannot pay more.`);
            return;
        }

        const sourceAccount = sourceAccounts.find(a => a.id === sourceAccountId);
        if (!sourceAccount) return;

        if (payAmount > sourceAccount.balance) {
            Alert.alert(
                'Insufficient Balance',
                `"${sourceAccount.name}" only has ${formatAmount(sourceAccount.balance)}.`
            );
            return;
        }

        try {
            // 1. Debit from bank account
            await addTransaction({
                accountId: sourceAccountId,
                merchant: `CC Bill Payment — ${ccAccount.name}`,
                category: 'transfer',
                amount: -Math.abs(payAmount),
                type: 'debit',
                isAuto: false,
                sentimentIds: [],
            });

            // 2. Credit to CC account (reduces outstanding)
            await addTransaction({
                accountId: ccAccount.id,
                merchant: `Bill Payment from ${sourceAccount.name}`,
                category: 'transfer',
                amount: Math.abs(payAmount),
                type: 'credit',
                isAuto: false,
                sentimentIds: [],
            });

            onClose();
        } catch (error) {
            console.error('Error paying bill:', error);
            Alert.alert('Error', 'Failed to process payment. Please try again.');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={styles.sheet}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Icon name="close" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Pay Credit Card Bill</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                        {/* Outstanding Display */}
                        <View style={styles.outstandingCard}>
                            <Icon name="credit-card" size={28} color={COLORS.primary} />
                            <Text style={styles.ccName}>{ccAccount.name}</Text>
                            <Text style={styles.outstandingLabel}>OUTSTANDING</Text>
                            <Text style={styles.outstandingAmount}>{formatAmount(outstanding)}</Text>
                        </View>

                        {/* Pay Mode Toggle */}
                        <Text style={styles.fieldLabel}>PAYMENT AMOUNT</Text>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, payMode === 'full' && styles.toggleBtnActive]}
                                onPress={() => setPayMode('full')}
                            >
                                <Icon name="check-circle" size={16} color={payMode === 'full' ? COLORS.background : COLORS.textMuted} />
                                <Text style={[styles.toggleText, payMode === 'full' && styles.toggleTextActive]}>
                                    Pay Full
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, payMode === 'custom' && styles.toggleBtnActive]}
                                onPress={() => setPayMode('custom')}
                            >
                                <Icon name="edit" size={16} color={payMode === 'custom' ? COLORS.background : COLORS.textMuted} />
                                <Text style={[styles.toggleText, payMode === 'custom' && styles.toggleTextActive]}>
                                    Pay Custom
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Custom Amount Input */}
                        {payMode === 'custom' && (
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencyPrefix}>₹</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="Enter amount"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="numeric"
                                    value={customAmount}
                                    onChangeText={setCustomAmount}
                                    autoFocus
                                />
                            </View>
                        )}

                        {/* Amount Summary */}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Amount to pay</Text>
                            <Text style={styles.summaryValue}>{formatAmount(payAmount)}</Text>
                        </View>

                        {/* Source Account Selector */}
                        <Text style={styles.fieldLabel}>PAY FROM</Text>
                        {sourceAccounts.length === 0 ? (
                            <View style={styles.noAccountsCard}>
                                <Icon name="warning" size={20} color={COLORS.textMuted} />
                                <Text style={styles.noAccountsText}>No bank accounts available</Text>
                            </View>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
                                {sourceAccounts.map(acc => (
                                    <TouchableOpacity
                                        key={acc.id}
                                        style={[
                                            styles.accountChip,
                                            sourceAccountId === acc.id && styles.accountChipActive,
                                        ]}
                                        onPress={() => setSourceAccountId(acc.id)}
                                    >
                                        <Icon
                                            name={acc.icon as any}
                                            size={18}
                                            color={sourceAccountId === acc.id ? COLORS.background : COLORS.text}
                                        />
                                        <View style={styles.accountChipInfo}>
                                            <Text style={[
                                                styles.accountChipName,
                                                sourceAccountId === acc.id && styles.accountChipNameActive,
                                            ]}>
                                                {acc.name}
                                            </Text>
                                            <Text style={[
                                                styles.accountChipBal,
                                                sourceAccountId === acc.id && { color: COLORS.background + 'AA' },
                                            ]}>
                                                {formatAmount(acc.balance)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {/* After-payment preview */}
                        {sourceAccountId && payAmount > 0 && (() => {
                            const src = sourceAccounts.find(a => a.id === sourceAccountId);
                            if (!src) return null;
                            return (
                                <View style={styles.previewCard}>
                                    <Text style={styles.previewTitle}>AFTER PAYMENT</Text>
                                    <View style={styles.previewRow}>
                                        <Text style={styles.previewLabel}>{src.name} balance</Text>
                                        <Text style={styles.previewVal}>{formatAmount(src.balance - payAmount)}</Text>
                                    </View>
                                    <View style={styles.previewRow}>
                                        <Text style={styles.previewLabel}>{ccAccount.name} outstanding</Text>
                                        <Text style={[styles.previewVal, { color: COLORS.success }]}>
                                            {formatAmount(outstanding - payAmount)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()}
                    </ScrollView>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        style={[styles.payBtn, (payAmount <= 0 || !sourceAccountId) && styles.payBtnDisabled]}
                        onPress={handlePay}
                        disabled={payAmount <= 0 || !sourceAccountId}
                    >
                        <Icon name="payment" size={20} color={COLORS.background} />
                        <Text style={styles.payBtnText}>
                            Pay {formatAmount(payAmount)}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },

    sheet: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: BORDER_RADIUS.xxl,
        borderTopRightRadius: BORDER_RADIUS.xxl,
        maxHeight: '85%',
        paddingBottom: SPACING.xxl,
    },
    handleContainer: { alignItems: 'center', paddingVertical: SPACING.md },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

    body: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },

    // Outstanding card
    outstandingCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xxl,
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    ccName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginTop: SPACING.sm },
    outstandingLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.sm },
    outstandingAmount: { fontSize: 32, fontWeight: '700', color: COLORS.error, marginTop: SPACING.xs },

    // Field label
    fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.md },

    // Toggle buttons
    toggleRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    toggleText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textSecondary },
    toggleTextActive: { color: COLORS.background },

    // Custom amount input
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    currencyPrefix: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.primary, marginRight: SPACING.sm },
    amountInput: { flex: 1, fontSize: FONT_SIZE.xxl, fontWeight: '600', color: COLORS.text, paddingVertical: SPACING.lg },

    // Summary
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        marginBottom: SPACING.xxl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    summaryLabel: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
    summaryValue: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.primary },

    // Account chips
    accountScroll: { marginBottom: SPACING.xxl },
    accountChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.md,
    },
    accountChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    accountChipInfo: {},
    accountChipName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
    accountChipNameActive: { color: COLORS.background },
    accountChipBal: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 },

    // No accounts
    noAccountsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xxl,
    },
    noAccountsText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },

    // Preview
    previewCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    previewTitle: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.md },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
    },
    previewLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
    previewVal: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },

    // Pay button
    payBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.primary,
    },
    payBtnDisabled: { opacity: 0.4 },
    payBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.background },
});

export default PayBillModal;
