
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { fadeIn, modalIn } from '../motion';
import { Text } from './Typography';
import { Icon, IconName } from './Icon';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';


const cardIn = modalIn;

export type ModalType = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface ModalAction {
    text: string;
    onPress: () => void | Promise<void>;
    style?: 'default' | 'cancel' | 'destructive' | 'primary';
    loading?: boolean;
}

interface CustomModalProps {
    visible: boolean;
    title: string;
    message?: string;
    icon?: IconName;
    type?: ModalType;
    actions: ModalAction[];
    onClose?: () => void;
    children?: React.ReactNode;
}

export function CustomModal({
    visible,
    title,
    message,
    icon,
    type = 'default',
    actions,
    onClose,
    children,
}: CustomModalProps) {
    if (!visible) return null;

    const getIconColor = () => {
        switch (type) {
            case 'success': return COLORS.success;
            case 'error': return COLORS.error;
            case 'warning': return COLORS.warning;
            case 'info': return COLORS.info;
            default: return COLORS.primary;
        }
    };

    const getIconName = (): IconName => {
        if (icon) return icon;
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'info';
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View entering={fadeIn} style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
                <Animated.View entering={cardIn} style={styles.container}>
                            {/* Header Icon */}
                            <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
                                <Icon
                                    name={getIconName()}
                                    size={32}
                                    color={getIconColor()}
                                />
                            </View>

                            {/* Content */}
                            <Text style={styles.title}>{title}</Text>
                            {message && <Text style={styles.message}>{message}</Text>}
                            {children}

                            {/* Actions */}
                            <View style={[
                                styles.actionsContainer,
                                actions.length > 2 && styles.actionsVertical // Stack if > 2 actions
                            ]}>
                                {actions.map((action) => {
                                    const isPrimary = action.style === 'primary';
                                    const isDestructive = action.style === 'destructive';
                                    const isCancel = action.style === 'cancel';

                                    return (
                                        <TouchableOpacity
                                            key={action.text}
                                            style={[
                                                styles.button,
                                                actions.length > 2 && styles.buttonFull,
                                                isPrimary && { backgroundColor: COLORS.brand },
                                                isDestructive && { backgroundColor: `${COLORS.error}20` },
                                                isCancel && { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
                                            ]}
                                            onPress={action.onPress}
                                        >
                                            <Text style={[
                                                styles.buttonText,
                                                isPrimary && { color: COLORS.surface },
                                                isDestructive && { color: COLORS.error },
                                                isCancel && { color: COLORS.textMuted },
                                            ]}>
                                                {action.text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    message: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 22,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: SPACING.md,
    },
    actionsVertical: {
        flexDirection: 'column',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonFull: {
        width: '100%',
    },
    buttonText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
});
