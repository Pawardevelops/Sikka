import React, { useState, useMemo, useEffect } from 'react';
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
import { Icon } from './Icon';
import {
    SUBSCRIPTION_ICONS,
    SUBSCRIPTION_COLORS,
    useSubscriptions,
} from '../context/SubscriptionsContext';
import {
    Subscription,
    SubscriptionRole,
    SplitMember,
    PaymentMode,
} from '../types';
import { useAccounts } from '../context/AccountsContext';

interface EditSubscriptionModalProps {
    visible: boolean;
    subscription: Subscription | null;
    onClose: () => void;
}

export function EditSubscriptionModal({ visible, subscription, onClose }: EditSubscriptionModalProps) {
    const {
        updateSubscription,
        pauseSubscription,
        reactivateSubscription,
        archiveSubscription,
        markAsPaid,
        markAsUnpaid
    } = useSubscriptions();
    const { activeAccounts } = useAccounts();

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
    const [myShareInput, setMyShareInput] = useState('');

    // Split Logic
    const [isSplit, setIsSplit] = useState(false);
    const [splitMembers, setSplitMembers] = useState<SplitMember[]>([]);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberAmount, setNewMemberAmount] = useState('');

    // Member Logic
    const [payTo, setPayTo] = useState('');

    // Payment Source
    const [paymentSourceId, setPaymentSourceId] = useState<string>('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('ask_every_time');

    // ── Init State on Open ──
    useEffect(() => {
        if (subscription) {
            setName(subscription.name);
            setIcon(subscription.icon);
            setIconColor(subscription.iconColor);
            setCategory(subscription.category);
            setBillingCycle(subscription.billingCycle);
            setDueDate(subscription.dueDate.toString());
            setRole(subscription.role);

            setTotalAmount(subscription.totalAmount?.toString() || '');
            setMyShareInput(subscription.myShare?.toString() || subscription.amount?.toString() || '');

            setIsSplit(subscription.isSplit || false);
            setSplitMembers(subscription.splitMembers || []);

            setPayTo(subscription.payTo || '');
            setPaymentSourceId(subscription.paymentSourceId || '');
            setPaymentMode(subscription.paymentMode || 'ask_every_time');
        }
    }, [subscription, visible]);

    // ── Computed ──
    const displayMyShare = useMemo(() => {
        if (role === 'member') {
            return parseFloat(myShareInput) || 0;
        }
        // Admin
        const total = parseFloat(totalAmount) || 0;
        if (!isSplit) return total;

        const membersSum = splitMembers.reduce((sum, m) => sum + m.amount, 0);
        return Math.max(0, total - membersSum);
    }, [role, totalAmount, myShareInput, isSplit, splitMembers]);

    if (!subscription) return null;

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

    const handleSave = async () => {
        if (!name.trim()) return;

        const total = parseFloat(totalAmount) || 0;
        const myshare = displayMyShare;

        await updateSubscription(subscription.id, {
            name: name.trim(),
            icon,
            iconColor,
            category,
            billingCycle,
            dueDate: parseInt(dueDate) || 1,
            role,
            totalAmount: role === 'admin' ? total : 0,
            myShare: myshare,
            isSplit: role === 'admin' && isSplit,
            splitMembers: role === 'admin' && isSplit ? splitMembers : [],
            payTo: role === 'member' ? payTo : undefined,
            paymentSourceId: paymentSourceId || undefined,
            paymentMode,
        });

        onClose();
    };

    const handlePause = () => {
        Alert.alert(
            "Pause Subscription",
            "This will stop upcoming notifications but keep the history.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Pause", style: "destructive", onPress: async () => {
                        await pauseSubscription(subscription.id);
                        onClose();
                    }
                }
            ]
        );
    };

    const handleResume = async () => {
        await reactivateSubscription(subscription.id);
        onClose();
    };

    const handleArchive = () => {
        Alert.alert(
            "Archive Subscription",
            "This will move it to the archives. You can always restore it later.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive", style: "destructive", onPress: async () => {
                        await archiveSubscription(subscription.id);
                        onClose();
                    }
                }
            ]
        );
    };

    const isActive = subscription.status === 'active';
    const isPaused = subscription.status === 'paused';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                            <Text style={styles.title}>Edit Subscription</Text>
                            <TouchableOpacity onPress={handleSave}>
                                <Text style={styles.saveBtn}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Status Alert */}
                        {isPaused && (
                            <View style={styles.pausedBanner}>
                                <Icon name="pause-circle" size={20} color={COLORS.textSecondary} />
                                <Text style={styles.pausedText}>This subscription is currently paused.</Text>
                                <TouchableOpacity onPress={handleResume}>
                                    <Text style={styles.resumeText}>RESUME</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Name & Icon */}
                        <View style={styles.section}>
                            <View style={styles.inputRow}>
                                <TouchableOpacity style={[styles.iconPicker, { backgroundColor: iconColor + '20' }]}>
                                    <Icon name={icon as any} size={28} color={iconColor} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.nameInput}
                                    value={name}
                                    onChangeText={setName}
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
                                <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>I Pay the Bill</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleBtn, role === 'member' && styles.roleBtnActive]}
                                onPress={() => setRole('member')}
                            >
                                <Text style={[styles.roleText, role === 'member' && styles.roleTextActive]}>Someone Else Pays</Text>
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

                        {/* Payment Actions */}
                        {isActive && (
                            <View style={styles.section}>
                                <Text style={styles.label}>Cycle Status</Text>
                                {subscription.isPaid ? (
                                    <View style={styles.paidContainer}>
                                        <View style={styles.paidBadgeLarge}>
                                            <Icon name="check-circle" size={24} color={COLORS.primary} />
                                            <Text style={styles.paidTextLarge}>Marked as Paid</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.outlineBtn}
                                            onPress={async () => {
                                                await markAsUnpaid(subscription.id);
                                                onClose();
                                            }}
                                        >
                                            <Text style={styles.outlineBtnText}>Mark as Unpaid</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.payBtn}
                                        onPress={async () => {
                                            await markAsPaid(subscription.id);
                                            onClose();
                                        }}
                                    >
                                        <Icon name="payments" size={24} color={COLORS.surface} />
                                        <Text style={styles.payBtnText}>Mark as Paid</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Danger Zone */}
                        <View style={styles.dangerZone}>
                            {isActive ? (
                                <TouchableOpacity style={styles.dangerBtn} onPress={handlePause}>
                                    <Icon name="pause" size={20} color={COLORS.textSecondary} />
                                    <Text style={styles.dangerBtnText}>Pause Subscription</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleResume}>
                                    <Icon name="play-arrow" size={20} color={COLORS.surface} />
                                    <Text style={styles.primaryBtnText}>Resume Subscription</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={[styles.dangerBtn, { marginTop: SPACING.md }]} onPress={handleArchive}>
                                <Icon name="archive" size={20} color={COLORS.error} />
                                <Text style={[styles.dangerBtnText, { color: COLORS.error }]}>Archive Subscription</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 60 }} />
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
    cancelBtn: { padding: SPACING.xs },
    saveBtn: {
        color: COLORS.primary,
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },
    content: { padding: SPACING.lg },
    section: { marginBottom: SPACING.xl },

    // Banner
    pausedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pausedText: {
        flex: 1,
        marginLeft: SPACING.sm,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZE.sm,
    },
    resumeText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: FONT_SIZE.sm,
    },

    // Input
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    iconPicker: {
        width: 48, height: 48, borderRadius: BORDER_RADIUS.full,
        alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
    },
    nameInput: { flex: 1, fontSize: FONT_SIZE.xl, color: COLORS.text, fontWeight: '600' },
    iconScroll: { marginBottom: SPACING.md },
    colorScroll: { marginBottom: SPACING.xs },
    miniIcon: {
        width: 36, height: 36, borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
    },
    miniIconActive: { borderWidth: 2, borderColor: COLORS.primary },
    colorDot: { width: 24, height: 24, borderRadius: BORDER_RADIUS.full, marginRight: SPACING.md },
    colorDotActive: { borderWidth: 2, borderColor: COLORS.text },

    // Role
    roleContainer: {
        flexDirection: 'row', backgroundColor: COLORS.surfaceLight,
        padding: 4, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.xl,
    },
    roleBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
    roleBtnActive: {
        backgroundColor: COLORS.surface,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2, shadowRadius: 1, elevation: 2,
    },
    roleText: { color: COLORS.textMuted, fontWeight: '500' },
    roleTextActive: { color: COLORS.text, fontWeight: '600' },

    // Money
    label: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    moneyInputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs,
    },
    currencySymbol: { fontSize: FONT_SIZE.xxl, color: COLORS.textSecondary, marginRight: SPACING.sm },
    moneyInput: { flex: 1, fontSize: FONT_SIZE.xxl, color: COLORS.text, fontWeight: '700' },

    // Split
    splitSection: {
        marginTop: SPACING.md, backgroundColor: COLORS.cardDark,
        padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    subLabel: { color: COLORS.text, fontSize: FONT_SIZE.md },
    membersContainer: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    memberInfo: { flexDirection: 'row', alignItems: 'center' },
    memberName: { color: COLORS.text, marginLeft: SPACING.sm },
    memberRight: { flexDirection: 'row', alignItems: 'center' },
    memberAmount: { color: COLORS.text, marginRight: SPACING.md, fontWeight: '600' },
    addMemberRow: { flexDirection: 'row', marginTop: SPACING.sm },
    smallInput: {
        flex: 2, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.sm,
        paddingHorizontal: SPACING.sm, paddingVertical: 6, color: COLORS.text, marginRight: SPACING.sm,
    },
    amountSmall: { flex: 1 },
    addMemberBtn: {
        width: 36, height: 36, backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center',
    },
    splitSummary: { marginTop: SPACING.md, alignItems: 'flex-end' },
    splitSummaryText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },

    // Common
    input: {
        backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md, color: COLORS.text, fontSize: FONT_SIZE.md,
    },
    pillRow: { flexDirection: 'row' },
    pill: {
        paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
        borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm,
    },
    pillActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
    pillText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
    pillTextActive: { color: COLORS.primary, fontWeight: '600' },
    pillSmall: {
        paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: BORDER_RADIUS.full,
        borderWidth: 1, borderColor: COLORS.border, marginLeft: SPACING.sm,
    },
    pillTextSmall: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

    // Accounts
    accountScroll: { marginBottom: SPACING.md },
    accountCard: {
        width: 80, padding: SPACING.sm, backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md, marginRight: SPACING.sm, alignItems: 'center',
        borderWidth: 1, borderColor: 'transparent',
    },
    accountCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
    accountIcon: {
        width: 32, height: 32, borderRadius: BORDER_RADIUS.full,
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs,
    },
    accountName: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center' },
    modeRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },

    // Payment Actions
    paidContainer: {
        backgroundColor: COLORS.primaryMuted + '20',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
    },
    paidBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    paidTextLarge: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.primary,
        marginLeft: SPACING.sm,
    },
    payBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    payBtnText: {
        color: COLORS.surface,
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
    outlineBtn: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
    },
    outlineBtnText: {
        color: COLORS.textMuted,
        fontWeight: '600',
    },

    // Danger Zone
    dangerZone: {
        marginTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        paddingTop: SPACING.xl,
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
    },
    dangerBtnText: { color: COLORS.textSecondary, marginLeft: SPACING.sm, fontWeight: '600' },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
    },
    primaryBtnText: { color: COLORS.surface, marginLeft: SPACING.sm, fontWeight: '600' },
});
