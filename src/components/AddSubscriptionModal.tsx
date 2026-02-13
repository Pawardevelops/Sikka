/**
 * Sikka - Add Subscription Modal
 * Bottom drawer modal to add a new subscription
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
    Platform,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { Icon } from './Icon';
import { SUBSCRIPTION_ICONS, SUBSCRIPTION_COLORS } from '../context/SubscriptionsContext';

interface AddSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (subscription: {
        name: string;
        icon: string;
        iconColor: string;
        amount: number;
        dueDate: number;
        billingCycle: 'monthly' | 'yearly';
        category: string;
    }) => void;
}

export function AddSubscriptionModal({ visible, onClose, onAdd }: AddSubscriptionModalProps) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('1');
    const [icon, setIcon] = useState('movie');
    const [iconColor, setIconColor] = useState(SUBSCRIPTION_COLORS[0]);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const handleAdd = () => {
        if (!name.trim() || !amount.trim()) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return;

        onAdd({
            name: name.trim(),
            icon,
            iconColor,
            amount: numAmount,
            dueDate: parseInt(dueDate) || 1,
            billingCycle,
            category: 'general',
        });

        // Reset form
        setName('');
        setAmount('');
        setDueDate('1');
        setIcon('movie');
        setIconColor(SUBSCRIPTION_COLORS[0]);
        setBillingCycle('monthly');
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
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                {/* Tap outside to close */}
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
                        <Text style={styles.modalTitle}>Add Subscription</Text>
                        <TouchableOpacity
                            style={[styles.saveBtnContainer, !name.trim() && styles.saveBtnDisabled]}
                            onPress={handleAdd}
                            activeOpacity={0.7}
                            disabled={!name.trim()}
                        >
                            <Icon name="check" size={18} color={name.trim() ? COLORS.background : COLORS.textMuted} />
                            <Text style={[styles.saveBtn, !name.trim() && styles.saveBtnTextDisabled]}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Icon & Color Selector */}
                        <Text style={styles.label}>ICON</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                            {SUBSCRIPTION_ICONS.map((ic) => (
                                <TouchableOpacity
                                    key={ic}
                                    style={[styles.iconBtn, icon === ic && { backgroundColor: iconColor + '30', borderWidth: 2, borderColor: iconColor }]}
                                    onPress={() => setIcon(ic)}
                                >
                                    <Icon name={ic as any} size={22} color={icon === ic ? iconColor : COLORS.text} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>COLOR</Text>
                        <View style={styles.colorRow}>
                            {SUBSCRIPTION_COLORS.map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.colorCircle, { backgroundColor: c }, iconColor === c && styles.colorCircleActive]}
                                    onPress={() => setIconColor(c)}
                                />
                            ))}
                        </View>

                        {/* Name Input */}
                        <Text style={styles.label}>SUBSCRIPTION NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Netflix Premium"
                            placeholderTextColor={COLORS.textMuted}
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Amount Input */}
                        <Text style={styles.label}>AMOUNT</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textMuted}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />

                        {/* Due Date Input */}
                        <Text style={styles.label}>DUE DATE (DAY OF MONTH)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1"
                            placeholderTextColor={COLORS.textMuted}
                            value={dueDate}
                            onChangeText={setDueDate}
                            keyboardType="numeric"
                        />

                        {/* Billing Cycle */}
                        <Text style={styles.label}>BILLING CYCLE</Text>
                        <View style={styles.cycleRow}>
                            <TouchableOpacity
                                style={[styles.cycleBtn, billingCycle === 'monthly' && styles.cycleBtnActive]}
                                onPress={() => setBillingCycle('monthly')}
                            >
                                <Text style={[styles.cycleText, billingCycle === 'monthly' && styles.cycleTextActive]}>
                                    Monthly
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cycleBtn, billingCycle === 'yearly' && styles.cycleBtnActive]}
                                onPress={() => setBillingCycle('yearly')}
                            >
                                <Text style={[styles.cycleText, billingCycle === 'yearly' && styles.cycleTextActive]}>
                                    Yearly
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

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
        maxHeight: '85%',
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
        width: 46,
        height: 46,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    colorCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    colorCircleActive: {
        borderWidth: 3,
        borderColor: COLORS.text,
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        fontSize: FONT_SIZE.lg,
        color: COLORS.text,
    },
    cycleRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    cycleBtn: {
        flex: 1,
        backgroundColor: COLORS.surfaceLight,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    cycleBtnActive: {
        backgroundColor: COLORS.primary,
    },
    cycleText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    cycleTextActive: {
        color: COLORS.background,
        fontWeight: '600',
    },
});

export default AddSubscriptionModal;
