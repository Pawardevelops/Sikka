/**
 * Sikka - Add Account Modal
 * Modal form to add a new account
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
import { AccountType } from '../types';
import { ACCOUNT_ICONS, ACCOUNT_TYPES } from '../context/AccountsContext';

interface AddAccountModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (account: { name: string; type: AccountType; icon: string; balance: number; color: string }) => void;
}

export function AddAccountModal({ visible, onClose, onAdd }: AddAccountModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>('bank');
    const [icon, setIcon] = useState('account-balance');
    const [balance, setBalance] = useState('');

    const handleAdd = () => {
        if (!name.trim()) return;

        onAdd({
            name: name.trim(),
            type,
            icon,
            balance: parseFloat(balance) || 0,
            color: COLORS.primary,
        });

        // Reset form
        setName('');
        setType('bank');
        setIcon('account-balance');
        setBalance('');
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
                        <Text style={styles.modalTitle}>Add Account</Text>
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
                            placeholder="e.g. SBI Savings"
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
                                    onPress={() => setType(t.value)}
                                >
                                    <Text style={[styles.typeText, type === t.value && styles.typeTextActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Balance Input */}
                        <Text style={styles.label}>INITIAL BALANCE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textMuted}
                            value={balance}
                            onChangeText={setBalance}
                            keyboardType="numeric"
                        />
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
    iconText: {
        fontSize: 24,
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
});

export default AddAccountModal;
