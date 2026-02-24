/**
 * Sikka - Add Account Modal
 * Dynamic form that adapts based on selected account type.
 *
 * - Bank/Cash/Wallet/Savings: Name + Balance
 * - Credit Card: Name + Credit Limit + Outstanding Balance + Billing Day + Due Day
 * - Investment/Crypto: Name + inline "Add Holding" rows (Ticker, Qty, Buy Price, Current Price)
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { Icon } from './Icon';
import { AccountType, Account } from '../types';
import { ACCOUNT_ICONS, ACCOUNT_TYPES } from '../context/AccountsContext';
import { CreditCardDetails, InvestmentHoldingData } from '../types/accountTypes';

// ==================== HOLDING ROW COMPONENT ====================
interface HoldingRowProps {
    holding: Omit<InvestmentHoldingData, 'id'>;
    index: number;
    onChange: (index: number, field: string, value: string) => void;
    onRemove: (index: number) => void;
    canRemove: boolean;
}

function HoldingRow({ holding, index, onChange, onRemove, canRemove }: HoldingRowProps) {
    return (
        <View style={styles.holdingRow}>
            <View style={styles.holdingHeader}>
                <Text style={styles.holdingLabel}>HOLDING {index + 1}</Text>
                {canRemove && (
                    <TouchableOpacity onPress={() => onRemove(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="close" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.holdingGrid}>
                <View style={styles.holdingField}>
                    <Text style={styles.fieldLabel}>Ticker</Text>
                    <TextInput
                        style={styles.holdingInput}
                        placeholder="AAPL"
                        placeholderTextColor={COLORS.textMuted}
                        value={holding.ticker}
                        onChangeText={(v) => onChange(index, 'ticker', v)}
                        autoCapitalize="characters"
                    />
                </View>
                <View style={styles.holdingField}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput
                        style={styles.holdingInput}
                        placeholder="10"
                        placeholderTextColor={COLORS.textMuted}
                        value={holding.quantity ? String(holding.quantity) : ''}
                        onChangeText={(v) => onChange(index, 'quantity', v)}
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.holdingField}>
                    <Text style={styles.fieldLabel}>Avg Buy Price</Text>
                    <TextInput
                        style={styles.holdingInput}
                        placeholder="150.00"
                        placeholderTextColor={COLORS.textMuted}
                        value={holding.avgBuyPrice ? String(holding.avgBuyPrice) : ''}
                        onChangeText={(v) => onChange(index, 'avgBuyPrice', v)}
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.holdingField}>
                    <Text style={styles.fieldLabel}>Current Price</Text>
                    <TextInput
                        style={styles.holdingInput}
                        placeholder="175.00"
                        placeholderTextColor={COLORS.textMuted}
                        value={holding.currentPrice ? String(holding.currentPrice) : ''}
                        onChangeText={(v) => onChange(index, 'currentPrice', v)}
                        keyboardType="numeric"
                    />
                </View>
            </View>
        </View>
    );
}

// ==================== MAIN MODAL ====================
interface AddAccountModalProps {
    visible: boolean;
    accountToEdit?: Account | null;
    onClose: () => void;
    onAdd: (
        account: { name: string; type: AccountType; icon: string; balance: number; color: string },
        ccDetails?: CreditCardDetails,
        holdings?: Omit<InvestmentHoldingData, 'id'>[],
    ) => void;
    onUpdate?: (id: string, updates: Partial<Account>) => void;
}

const EMPTY_HOLDING: Omit<InvestmentHoldingData, 'id'> = {
    ticker: '',
    quantity: 0,
    avgBuyPrice: 0,
    currentPrice: 0,
};

export function AddAccountModal({ visible, accountToEdit, onClose, onAdd, onUpdate }: AddAccountModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>('bank');
    const [icon, setIcon] = useState('account-balance');
    const [balance, setBalance] = useState('');

    // Credit Card fields
    const [creditLimit, setCreditLimit] = useState('');
    const [billingCycleDate, setBillingCycleDate] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Investment holdings
    const [holdings, setHoldings] = useState<Omit<InvestmentHoldingData, 'id'>[]>([{ ...EMPTY_HOLDING }]);

    // Derived: is the type Credit Card or Investment?
    const isCreditCard = type === 'credit';
    const isInvestment = type === 'investment' || type === 'bitcoin';
    const isLiquid = !isCreditCard && !isInvestment;

    // Type-to-icon auto mapping
    const TYPE_DEFAULT_ICONS: Record<AccountType, string> = {
        bank: 'account-balance',
        cash: 'payments',
        wallet: 'account-balance-wallet',
        savings: 'savings',
        credit: 'credit-card',
        investment: 'trending-up',
        bitcoin: 'currency-bitcoin',
    };

    // Load account data when modal opens
    React.useEffect(() => {
        if (visible) {
            if (accountToEdit) {
                setName(accountToEdit.name);
                setType(accountToEdit.type);
                setIcon(accountToEdit.icon);
                setBalance(accountToEdit.balance.toString());
                // Hydrate CC details
                if (accountToEdit.creditCardDetails) {
                    setCreditLimit(accountToEdit.creditCardDetails.creditLimit.toString());
                    setBillingCycleDate(accountToEdit.creditCardDetails.billingCycleDate.toString());
                    setDueDate(accountToEdit.creditCardDetails.dueDate.toString());
                }
                // Hydrate holdings
                if (accountToEdit.holdings && accountToEdit.holdings.length > 0) {
                    setHoldings(accountToEdit.holdings.map(h => ({
                        ticker: h.ticker,
                        quantity: h.quantity,
                        avgBuyPrice: h.avgBuyPrice,
                        currentPrice: h.currentPrice,
                    })));
                }
            } else {
                resetForm();
            }
        }
    }, [visible, accountToEdit]);

    const resetForm = () => {
        setName('');
        setType('bank');
        setIcon('account-balance');
        setBalance('');
        setCreditLimit('');
        setBillingCycleDate('');
        setDueDate('');
        setHoldings([{ ...EMPTY_HOLDING }]);
    };

    // Auto-update icon when type changes
    const handleTypeChange = (newType: AccountType) => {
        setType(newType);
        setIcon(TYPE_DEFAULT_ICONS[newType] || 'account-balance');
    };

    // Holdings management
    const handleHoldingChange = (index: number, field: string, value: string) => {
        setHoldings(prev => {
            const updated = [...prev];
            if (field === 'ticker') {
                updated[index] = { ...updated[index], ticker: value };
            } else {
                updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
            }
            return updated;
        });
    };

    const addHoldingRow = () => {
        setHoldings(prev => [...prev, { ...EMPTY_HOLDING }]);
    };

    const removeHoldingRow = (index: number) => {
        setHoldings(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!name.trim()) return;

        const balanceNum = parseFloat(balance) || 0;

        if (accountToEdit && onUpdate) {
            // Edit mode — update main account + CC details
            const updates: Partial<Account> = {
                name: name.trim(),
                type,
                icon,
                balance: balanceNum,
            };
            if (isCreditCard) {
                updates.creditCardDetails = {
                    creditLimit: parseFloat(creditLimit) || 0,
                    billingCycleDate: parseInt(billingCycleDate) || 1,
                    dueDate: parseInt(dueDate) || 15,
                };
            }
            onUpdate(accountToEdit.id, updates);
        } else {
            // Add mode
            const ccDetails: CreditCardDetails | undefined = isCreditCard ? {
                creditLimit: parseFloat(creditLimit) || 0,
                billingCycleDate: parseInt(billingCycleDate) || 1,
                dueDate: parseInt(dueDate) || 15,
            } : undefined;

            const holdingsData = isInvestment
                ? holdings.filter(h => h.ticker.trim() !== '')
                : undefined;

            onAdd(
                {
                    name: name.trim(),
                    type,
                    icon,
                    balance: balanceNum,
                    color: COLORS.primary,
                },
                ccDetails,
                holdingsData,
            );
        }

        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={'padding'}
                style={styles.modalOverlay}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlayBackdrop} />
                </TouchableWithoutFeedback>

                <View style={styles.modalContent}>
                    {/* Drag Handle */}
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity style={styles.cancelBtnContainer} onPress={onClose} activeOpacity={0.7}>
                            <Icon name="close" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.cancelBtn}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{accountToEdit ? 'Edit Account' : 'Add Account'}</Text>
                        <TouchableOpacity
                            style={[styles.saveBtnContainer, !name.trim() && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            activeOpacity={0.7}
                            disabled={!name.trim()}
                        >
                            <Icon name="check" size={18} color={name.trim() ? COLORS.background : COLORS.textMuted} />
                            <Text style={[styles.saveBtn, !name.trim() && styles.saveBtnTextDisabled]}>
                                {accountToEdit ? 'Save' : 'Add'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Icon Selector */}
                        <Text style={styles.label}>ICON</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                            {ACCOUNT_ICONS.map((ic) => (
                                <TouchableOpacity
                                    key={ic}
                                    style={[styles.iconBtn, icon === ic && styles.iconBtnActive]}
                                    onPress={() => setIcon(ic)}
                                >
                                    <Icon name={ic as any} size={24} color={icon === ic ? COLORS.primary : COLORS.text} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Name Input */}
                        <Text style={styles.label}>ACCOUNT NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={isCreditCard ? "e.g. HDFC Credit Card" : isInvestment ? "e.g. Zerodha Demat" : "e.g. SBI Savings"}
                            placeholderTextColor={COLORS.textMuted}
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Type Selector */}
                        <Text style={styles.label}>ACCOUNT TYPE</Text>
                        <View style={styles.typeGrid}>
                            {ACCOUNT_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t.value}
                                    style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                                    onPress={() => handleTypeChange(t.value)}
                                >
                                    <Text style={[styles.typeText, type === t.value && styles.typeTextActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ══════════ LIQUID ACCOUNTS ══════════ */}
                        {isLiquid && (
                            <>
                                <Text style={styles.label}>INITIAL BALANCE</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={balance}
                                    onChangeText={setBalance}
                                    keyboardType="numeric"
                                />
                                {(type === 'cash' || type === 'wallet') && (
                                    <View style={styles.tipCard}>
                                        <Icon name="lightbulb" size={16} color={COLORS.warning} />
                                        <Text style={styles.tipText}>
                                            Tip: You can Quick Adjust this balance anytime from the account screen.
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* ══════════ CREDIT CARD ══════════ */}
                        {isCreditCard && (
                            <>
                                <Text style={styles.label}>CREDIT LIMIT</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 200000"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={creditLimit}
                                    onChangeText={setCreditLimit}
                                    keyboardType="numeric"
                                />
                                <Text style={styles.label}>OUTSTANDING BALANCE (DEBT)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={balance}
                                    onChangeText={setBalance}
                                    keyboardType="numeric"
                                />
                                <View style={styles.twoColRow}>
                                    <View style={styles.halfCol}>
                                        <Text style={styles.label}>BILLING DAY</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="1"
                                            placeholderTextColor={COLORS.textMuted}
                                            value={billingCycleDate}
                                            onChangeText={setBillingCycleDate}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={styles.halfCol}>
                                        <Text style={styles.label}>DUE DAY</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="15"
                                            placeholderTextColor={COLORS.textMuted}
                                            value={dueDate}
                                            onChangeText={setDueDate}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                                <View style={styles.tipCard}>
                                    <Icon name="info" size={16} color={COLORS.info} />
                                    <Text style={styles.tipText}>
                                        CC spending increases your debt. Pay Bill transactions reduce it.
                                    </Text>
                                </View>
                            </>
                        )}

                        {/* ══════════ INVESTMENT / CRYPTO ══════════ */}
                        {isInvestment && (
                            <>
                                <Text style={styles.label}>HOLDINGS</Text>
                                {holdings.map((holding, index) => (
                                    <HoldingRow
                                        key={index}
                                        holding={holding}
                                        index={index}
                                        onChange={handleHoldingChange}
                                        onRemove={removeHoldingRow}
                                        canRemove={holdings.length > 1}
                                    />
                                ))}
                                <TouchableOpacity style={styles.addHoldingBtn} onPress={addHoldingRow}>
                                    <Icon name="add" size={18} color={COLORS.primary} />
                                    <Text style={styles.addHoldingText}>Add Another Holding</Text>
                                </TouchableOpacity>
                                <View style={styles.tipCard}>
                                    <Icon name="lightbulb" size={16} color={COLORS.warning} />
                                    <Text style={styles.tipText}>
                                        You can add multiple holdings to one portfolio. Update prices anytime from the detail screen.
                                    </Text>
                                </View>
                            </>
                        )}

                        {/* Bottom spacing for keyboard */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    overlayBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: BORDER_RADIUS.xxl,
        borderTopRightRadius: BORDER_RADIUS.xxl,
        paddingHorizontal: SPACING.xl,
        paddingBottom: 40,
        maxHeight: '90%',
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: SPACING.md,
        paddingBottom: SPACING.xs,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.textMuted,
        opacity: 0.4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.text,
    },
    cancelBtnContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        gap: SPACING.xs,
    },
    cancelBtn: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    saveBtnContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        gap: SPACING.xs,
    },
    saveBtn: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.background,
    },
    saveBtnDisabled: {
        backgroundColor: COLORS.surfaceLight,
    },
    saveBtnTextDisabled: {
        color: COLORS.textMuted,
    },
    label: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: SPACING.sm,
        marginTop: SPACING.lg,
    },
    iconScroll: {
        marginHorizontal: -SPACING.xl,
        paddingHorizontal: SPACING.xl,
    },
    iconBtn: {
        width: 50,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    iconBtnActive: {
        backgroundColor: COLORS.primaryMuted,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        fontSize: FONT_SIZE.lg,
        color: COLORS.text,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -SPACING.xs,
    },
    typeBtn: {
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        margin: SPACING.xs,
    },
    typeBtnActive: {
        backgroundColor: COLORS.primary,
    },
    typeText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    typeTextActive: {
        color: COLORS.background,
        fontWeight: '600',
    },

    // Two-column layout for billing/due day
    twoColRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    halfCol: {
        flex: 1,
    },

    // Tip card
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    tipText: {
        flex: 1,
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },

    // Holding row
    holdingRow: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    holdingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    holdingLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    holdingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    holdingField: {
        width: '47%',
    },
    fieldLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    holdingInput: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.md,
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
    },
    addHoldingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        gap: SPACING.xs,
    },
    addHoldingText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.primary,
    },
});

export default AddAccountModal;
