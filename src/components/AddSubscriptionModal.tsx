import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONT_WEIGHT } from '../constants/theme';
import { Icon } from './Icon';
import {
    SUBSCRIPTION_ICONS,
    SUBSCRIPTION_COLORS,
} from '../context/SubscriptionsContext';
import {
    SubscriptionRole,
    SplitMember,
    PaymentMode,
} from '../types';
import { useAccounts } from '../context/AccountsContext';

interface AddSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (subData: any) => void;
}

export function AddSubscriptionModal({ visible, onClose, onAdd }: AddSubscriptionModalProps) {
    // ── Form State ──
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('movie');
    const [iconColor, setIconColor] = useState(SUBSCRIPTION_COLORS[0]);
    const [category, setCategory] = useState('Entertainment');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [dueDate, setDueDate] = useState('1');

    // Role & Amounts
    const [role, setRole] = useState<SubscriptionRole>('admin');
    const [totalAmount, setTotalAmount] = useState('');
    const [myShareInput, setMyShareInput] = useState(''); // for manual override or member mode

    // Split Logic (Admin only)
    const [isSplit, setIsSplit] = useState(false);
    const [splitMembers, setSplitMembers] = useState<SplitMember[]>([]);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberAmount, setNewMemberAmount] = useState('');

    // Member Logic
    const [payTo, setPayTo] = useState('');

    // Payment Source
    const { activeAccounts } = useAccounts();
    const [paymentSourceId, setPaymentSourceId] = useState<string>('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('ask_every_time');

    // ── Computed ──
    const displayMyShare = useMemo(() => {
        if (role === 'member') {
            return parseFloat(myShareInput) || 0;
        }
        // Admin
        const total = parseFloat(totalAmount) || 0;
        if (!isSplit) return total;

        // If split, my share = Total - (Sum of members)
        const membersSum = splitMembers.reduce((sum, m) => sum + m.amount, 0);
        return Math.max(0, total - membersSum);
    }, [role, totalAmount, myShareInput, isSplit, splitMembers]);

    // ── Handlers ──
    const handleAddMember = () => {
        if (!newMemberName.trim() || !newMemberAmount) return;
        const amount = parseFloat(newMemberAmount);
        if (isNaN(amount) || amount <= 0) return;

        setSplitMembers([...splitMembers, {
            name: newMemberName.trim(),
            amount,
            status: 'pending'
        }]);
        setNewMemberName('');
        setNewMemberAmount('');
    };

    const removeMember = (index: number) => {
        const updated = [...splitMembers];
        updated.splice(index, 1);
        setSplitMembers(updated);
    };

    const handleSave = () => {
        if (!name.trim()) return;

        const total = parseFloat(totalAmount) || 0;
        const myshare = displayMyShare; // trusted computed value

        // Validation
        if (role === 'admin' && total <= 0) return;
        if (role === 'member' && myshare <= 0) return;

        onAdd({
            name: name.trim(),
            icon,
            iconColor,
            category,
            billingCycle,
            dueDate: parseInt(dueDate) || 1,
            role,
            totalAmount: role === 'admin' ? total : 0, // member doesn't track total bill
            myShare: myshare,
            isSplit: role === 'admin' && isSplit,
            splitMembers: role === 'admin' && isSplit ? splitMembers : [],
            payTo: role === 'member' ? payTo : undefined,
            paymentSourceId: paymentSourceId || undefined,
            paymentMode,
            // legacy compat
            amount: myshare,
        });

        resetForm();
        onClose();
    };

    const resetForm = () => {
        setName('');
        setTotalAmount('');
        setMyShareInput('');
        setRole('admin');
        setIsSplit(false);
        setSplitMembers([]);
        setPayTo('');
        setDueDate('1');
        // keep icon/color/source/mode as they might be sticky prefs
    };

    const selectedAccount = activeAccounts.find(a => a.id === paymentSourceId);

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
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.dragHandle} />
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                                <Icon name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                            <Text style={styles.title}>New Subscription</Text>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={!name}
                            >
                                <Text style={[styles.saveBtn, !name && styles.saveBtnDisabled]}>
                                    Save
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Identify */}
                        <View style={styles.section}>
                            <View style={styles.inputRow}>
                                <TouchableOpacity style={[styles.iconPicker, { backgroundColor: iconColor + '20' }]}>
                                    <Icon name={icon as any} size={28} color={iconColor} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.nameInput}
                                    placeholder="Netflix, Spotify..."
                                    placeholderTextColor={COLORS.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                    autoFocus
                                />
                            </View>

                            {/* Icons Scroll */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                                {SUBSCRIPTION_ICONS.map(ic => (
                                    <TouchableOpacity
                                        key={ic}
                                        style={[styles.miniIcon, icon === ic && styles.miniIconActive]}
                                        onPress={() => setIcon(ic)}
                                    >
                                        <Icon name={ic as any} size={20} color={icon === ic ? COLORS.primary : COLORS.textMuted} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                                {SUBSCRIPTION_COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.colorDot, { backgroundColor: c }, iconColor === c && styles.colorDotActive]}
                                        onPress={() => setIconColor(c)}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {/* Role Switcher */}
                        <View style={styles.roleContainer}>
                            <TouchableOpacity
                                style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]}
                                onPress={() => setRole('admin')}
                            >
                                <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>
                                    I Pay the Bill
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleBtn, role === 'member' && styles.roleBtnActive]}
                                onPress={() => setRole('member')}
                            >
                                <Text style={[styles.roleText, role === 'member' && styles.roleTextActive]}>
                                    Someone Else Pays
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Amount Section */}
                        <View style={styles.section}>
                            <Text style={styles.label}>
                                {role === 'admin' ? 'Total Bill Amount' : 'My Share Amount'}
                            </Text>
                            <View style={styles.moneyInputContainer}>
                                <Text style={styles.currencySymbol}>₹</Text>
                                <TextInput
                                    style={styles.moneyInput}
                                    placeholder="0"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="numeric"
                                    value={role === 'admin' ? totalAmount : myShareInput}
                                    onChangeText={role === 'admin' ? setTotalAmount : setMyShareInput}
                                />
                            </View>

                            {/* Admin Split Logic */}
                            {role === 'admin' && (
                                <View style={styles.splitSection}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.subLabel}>Split the cost?</Text>
                                        <Switch
                                            value={isSplit}
                                            onValueChange={setIsSplit}
                                            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primaryMuted }}
                                            thumbColor={isSplit ? COLORS.primary : COLORS.textMuted}
                                        />
                                    </View>

                                    {isSplit && (
                                        <View style={styles.membersContainer}>
                                            {/* Existing Members */}
                                            {splitMembers.map((m, i) => (
                                                <View key={i} style={styles.memberRow}>
                                                    <View style={styles.memberInfo}>
                                                        <Icon name="person" size={16} color={COLORS.textSecondary} />
                                                        <Text style={styles.memberName}>{m.name}</Text>
                                                    </View>
                                                    <View style={styles.memberRight}>
                                                        <Text style={styles.memberAmount}>₹{m.amount}</Text>
                                                        <TouchableOpacity onPress={() => removeMember(i)}>
                                                            <Icon name="close" size={16} color={COLORS.error} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}

                                            {/* Add Member Form */}
                                            <View style={styles.addMemberRow}>
                                                <TextInput
                                                    style={styles.smallInput}
                                                    placeholder="Name"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    value={newMemberName}
                                                    onChangeText={setNewMemberName}
                                                />
                                                <TextInput
                                                    style={[styles.smallInput, styles.amountSmall]}
                                                    placeholder="₹"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    keyboardType="numeric"
                                                    value={newMemberAmount}
                                                    onChangeText={setNewMemberAmount}
                                                />
                                                <TouchableOpacity onPress={handleAddMember} style={styles.addMemberBtn}>
                                                    <Icon name="add" size={20} color={COLORS.primary} />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Summary */}
                                            <View style={styles.splitSummary}>
                                                <Text style={styles.splitSummaryText}>
                                                    My Share: <Text style={{ color: COLORS.primary }}>₹{displayMyShare}</Text>
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Member PayTo Logic */}
                            {role === 'member' && (
                                <View style={{ marginTop: SPACING.md }}>
                                    <Text style={styles.label}>Pay To (Optional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Friend's Name"
                                        placeholderTextColor={COLORS.textMuted}
                                        value={payTo}
                                        onChangeText={setPayTo}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Billing Cycles */}
                        <View style={styles.section}>
                            <View style={styles.rowBetween}>
                                <View style={{ flex: 1, marginRight: SPACING.md }}>
                                    <Text style={styles.label}>Frequency</Text>
                                    <View style={styles.pillRow}>
                                        <TouchableOpacity
                                            style={[styles.pill, billingCycle === 'monthly' && styles.pillActive]}
                                            onPress={() => setBillingCycle('monthly')}
                                        >
                                            <Text style={[styles.pillText, billingCycle === 'monthly' && styles.pillTextActive]}>Monthly</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.pill, billingCycle === 'yearly' && styles.pillActive]}
                                            onPress={() => setBillingCycle('yearly')}
                                        >
                                            <Text style={[styles.pillText, billingCycle === 'yearly' && styles.pillTextActive]}>Yearly</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Due Date</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Day (1-31)"
                                        placeholderTextColor={COLORS.textMuted}
                                        keyboardType="numeric"
                                        value={dueDate}
                                        onChangeText={setDueDate}
                                        maxLength={2}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Payment Source */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Payment Source</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
                                <TouchableOpacity
                                    style={[styles.accountCard, !paymentSourceId && styles.accountCardActive]}
                                    onPress={() => setPaymentSourceId('')}
                                >
                                    <View style={[styles.accountIcon, { backgroundColor: COLORS.surfaceLight }]}>
                                        <Icon name="device-unknown" size={20} color={COLORS.textMuted} />
                                    </View>
                                    <Text style={styles.accountName}>None</Text>
                                </TouchableOpacity>

                                {activeAccounts.map(acc => (
                                    <TouchableOpacity
                                        key={acc.id}
                                        style={[styles.accountCard, paymentSourceId === acc.id && styles.accountCardActive]}
                                        onPress={() => setPaymentSourceId(acc.id)}
                                    >
                                        <View style={[styles.accountIcon, { backgroundColor: acc.color + '20' }]}>
                                            <Icon name={acc.icon as any} size={20} color={acc.color} />
                                        </View>
                                        <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Payment Mode */}
                            {paymentSourceId ? (
                                <View style={styles.modeRow}>
                                    <Text style={styles.subLabel}>Auto-deduct?</Text>
                                    <View style={styles.pillRow}>
                                        <TouchableOpacity
                                            style={[styles.pillSmall, paymentMode === 'default' && styles.pillActive]}
                                            onPress={() => setPaymentMode('default')}
                                        >
                                            <Text style={[styles.pillTextSmall, paymentMode === 'default' && styles.pillTextActive]}>Yes</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.pillSmall, paymentMode === 'ask_every_time' && styles.pillActive]}
                                            onPress={() => setPaymentMode('ask_every_time')}
                                        >
                                            <Text style={[styles.pillTextSmall, paymentMode === 'ask_every_time' && styles.pillTextActive]}>Ask Me</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : null}
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        height: '90%',
    },
    header: {
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        alignItems: 'center',
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        marginBottom: SPACING.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    title: {
        color: COLORS.text,
        fontSize: FONT_SIZE.lg,
        fontWeight: 'bold',
    },
    cancelBtn: {
        padding: SPACING.xs,
    },
    saveBtn: {
        color: COLORS.primary,
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },
    saveBtnDisabled: {
        color: COLORS.textMuted,
    },
    content: {
        padding: SPACING.lg,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    // Input
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    iconPicker: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    nameInput: {
        flex: 1,
        fontSize: FONT_SIZE.xl,
        color: COLORS.text,
        fontWeight: '600',
    },
    iconScroll: {
        marginBottom: SPACING.md,
    },
    colorScroll: {
        marginBottom: SPACING.xs,
    },
    miniIcon: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    miniIconActive: {
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: BORDER_RADIUS.full,
        marginRight: SPACING.md,
    },
    colorDotActive: {
        borderWidth: 2,
        borderColor: COLORS.text,
    },
    // Role
    roleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        padding: 4,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xl,
    },
    roleBtn: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    roleBtnActive: {
        backgroundColor: COLORS.surface,
        // shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    roleText: {
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    roleTextActive: {
        color: COLORS.text,
        fontWeight: '600',
    },
    // Money
    label: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    moneyInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: SPACING.xs,
    },
    currencySymbol: {
        fontSize: FONT_SIZE.xxl,
        color: COLORS.textSecondary,
        marginRight: SPACING.sm,
    },
    moneyInput: {
        flex: 1,
        fontSize: FONT_SIZE.xxl,
        color: COLORS.text,
        fontWeight: '700',
    },
    // Split
    splitSection: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.cardDark,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subLabel: {
        color: COLORS.text,
        fontSize: FONT_SIZE.md,
    },
    membersContainer: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    memberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberName: {
        color: COLORS.text,
        marginLeft: SPACING.sm,
    },
    memberRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberAmount: {
        color: COLORS.text,
        marginRight: SPACING.md,
        fontWeight: '600',
    },
    addMemberRow: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
    },
    smallInput: {
        flex: 2,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        color: COLORS.text,
        marginRight: SPACING.sm,
    },
    amountSmall: {
        flex: 1,
    },
    addMemberBtn: {
        width: 36,
        height: 36,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splitSummary: {
        marginTop: SPACING.md,
        alignItems: 'flex-end',
    },
    splitSummaryText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZE.sm,
    },
    // Common
    input: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        color: COLORS.text,
        fontSize: FONT_SIZE.md,
    },
    pillRow: {
        flexDirection: 'row',
    },
    pill: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.sm,
    },
    pillActive: {
        backgroundColor: COLORS.primaryMuted,
        borderColor: COLORS.primary,
    },
    pillText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZE.sm,
    },
    pillTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    pillSmall: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginLeft: SPACING.sm,
    },
    pillTextSmall: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
    },
    // Accounts
    accountScroll: {
        marginBottom: SPACING.md,
    },
    accountCard: {
        width: 80,
        padding: SPACING.sm,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        marginRight: SPACING.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    accountCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryMuted,
    },
    accountIcon: {
        width: 32,
        height: 32,
        borderRadius: BORDER_RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    accountName: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    modeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
});

export default AddSubscriptionModal;
