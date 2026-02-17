
import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
} from 'react-native';
import { Icon } from './Icon';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';

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
    icon?: string;
    type?: ModalType;
    actions: ModalAction[];
    onClose?: () => void;
    children?: React.ReactNode;
}

const { width } = Dimensions.get('window');

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
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.95));

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

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

    const getIconName = () => {
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
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.container,
                                { transform: [{ scale: scaleAnim }] },
                            ]}
                        >
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
                                {actions.map((action, index) => {
                                    const isPrimary = action.style === 'primary';
                                    const isDestructive = action.style === 'destructive';
                                    const isCancel = action.style === 'cancel';

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.button,
                                                actions.length > 2 && styles.buttonFull,
                                                isPrimary && { backgroundColor: COLORS.primary },
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
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
