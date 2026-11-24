/**
 * Feedback patterns from the v3 review (canvas "Patterns" board):
 *  - Toast with Undo: destructive actions happen at once and can be taken back for 5 s.
 *  - ConfirmSheet: irreversible actions say what is lost; the dangerous ones need a typed word.
 *  - BottomSheet: shared sheet chrome.
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../Typography';
import { Icon, IconName } from '../Icon';
import { Button } from './controls';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { fadeIn, sheetIn, toastIn, toastOut } from '../../motion';

// ─── Toast ────────────────────────────────────────────────────────────
interface ToastOptions {
    message: string;
    /** e.g. { label: 'Undo', onPress } */
    action?: { label: string; onPress: () => void };
    /** ms; default 5000 */
    duration?: number;
    icon?: IconName;
}

interface ToastContextType {
    show: (opts: ToastOptions) => void;
    hide: () => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => undefined, hide: () => undefined });

export function ToastProvider({ children, bottomOffset = 110 }: { children: ReactNode; bottomOffset?: number }) {
    const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
    const [left, setLeft] = useState(0);
    const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const insets = useSafeAreaInsets();

    const hide = useCallback(() => {
        clearInterval(timer.current);
        setToast(null);
    }, []);

    const show = useCallback((opts: ToastOptions) => {
        clearInterval(timer.current);
        const duration = opts.duration ?? 5000;
        const id = Date.now();
        setToast({ ...opts, id });
        setLeft(Math.ceil(duration / 1000));
        const started = Date.now();
        timer.current = setInterval(() => {
            const remaining = duration - (Date.now() - started);
            if (remaining <= 0) {
                clearInterval(timer.current);
                setToast((t) => (t?.id === id ? null : t));
            } else {
                setLeft(Math.ceil(remaining / 1000));
            }
        }, 250);
    }, []);

    useEffect(() => () => clearInterval(timer.current), []);

    return (
        <ToastContext.Provider value={{ show, hide }}>
            {children}
            {toast && (
                <Animated.View
                    key={toast.id}
                    entering={toastIn}
                    exiting={toastOut}
                    pointerEvents="box-none"
                    style={[styles.toastWrap, { bottom: insets.bottom + bottomOffset }]}
                >
                    <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
                        {toast.icon && <Icon name={toast.icon} size={20} color={COLORS.brand} />}
                        <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
                        {toast.action && (
                            <TouchableOpacity
                                onPress={() => {
                                    toast.action?.onPress();
                                    hide();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`${toast.action.label}, ${left} seconds left`}
                                hitSlop={10}
                                style={styles.toastAction}
                            >
                                <Text style={styles.toastActionText}>{toast.action.label}</Text>
                                <Text style={styles.toastCount}>{left}s</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);

// ─── BottomSheet ──────────────────────────────────────────────────────
export function BottomSheet({
    visible,
    onClose,
    children,
    label,
}: {
    visible: boolean;
    onClose: () => void;
    children: ReactNode;
    label: string;
}) {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <Animated.View entering={fadeIn} style={styles.backdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
                    <Animated.View
                        entering={sheetIn}
                        accessibilityViewIsModal
                        accessibilityLabel={label}
                        style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
                    >
                        <View style={styles.grabber} />
                        {children}
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── ConfirmSheet ─────────────────────────────────────────────────────
export function ConfirmSheet({
    visible,
    title,
    body,
    warning,
    confirmLabel,
    cancelLabel = 'Cancel',
    typeToConfirm,
    destructive,
    secondary,
    onConfirm,
    onCancel,
}: {
    visible: boolean;
    title: string;
    body?: ReactNode;
    /** Bold red line, e.g. "This can't be undone." */
    warning?: string;
    confirmLabel: string;
    cancelLabel?: string;
    /** The user must type this word before the confirm button works. */
    typeToConfirm?: string;
    destructive?: boolean;
    /** A safer path offered first, e.g. "Back up to Google Drive first". */
    secondary?: { label: string; sub?: string; icon?: IconName; onPress: () => void };
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [typed, setTyped] = useState('');
    useEffect(() => { if (!visible) setTyped(''); }, [visible]);
    const ready = !typeToConfirm || typed.trim().toUpperCase() === typeToConfirm.toUpperCase();

    return (
        <BottomSheet visible={visible} onClose={onCancel} label={title}>
            <View style={styles.confirm} accessibilityRole="alert">
                {destructive && (
                    <View style={styles.dangerIcon}><Icon name="delete-forever" size={26} color={COLORS.error} /></View>
                )}
                <Text style={styles.confirmTitle} accessibilityRole="header">{title}</Text>
                {typeof body === 'string' ? <Text style={styles.confirmBody}>{body}</Text> : body}
                {warning && <Text style={styles.confirmWarning}>{warning}</Text>}

                {secondary && (
                    <TouchableOpacity style={styles.secondary} onPress={secondary.onPress} accessibilityRole="button" activeOpacity={0.85}>
                        <Icon name={secondary.icon ?? 'cloud-upload'} size={22} color={COLORS.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.secondaryLabel}>{secondary.label}</Text>
                            {secondary.sub && <Text style={styles.secondarySub}>{secondary.sub}</Text>}
                        </View>
                        <Icon name="chevron-right" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                )}

                {typeToConfirm && (
                    <View style={{ gap: 6 }}>
                        <Text style={styles.typeLabel}>TYPE {typeToConfirm.toUpperCase()} TO CONFIRM</Text>
                        <TextInput
                            value={typed}
                            onChangeText={setTyped}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            accessibilityLabel={`Type ${typeToConfirm} to confirm`}
                            style={styles.typeInput}
                        />
                    </View>
                )}

                <View style={styles.confirmActions}>
                    <TouchableOpacity
                        onPress={() => ready && onConfirm()}
                        disabled={!ready}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !ready }}
                        style={[styles.confirmBtn, destructive ? styles.confirmBtnDanger : styles.confirmBtnNight, !ready && { opacity: 0.4 }]}
                    >
                        <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
                    </TouchableOpacity>
                    <Button label={cancelLabel} variant="soft" icon={null} onPress={onCancel} />
                </View>
            </View>
        </BottomSheet>
    );
}

// ─── HelpButton ───────────────────────────────────────────────────────
export function HelpButton({ onPress }: { onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Help"
            hitSlop={8}
            style={styles.help}
        >
            <Text style={styles.helpText}>?</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    toastWrap: { position: 'absolute', left: SPACING.lg, right: SPACING.lg },
    toast: {
        minHeight: 56,
        borderRadius: 28,
        backgroundColor: COLORS.night,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: SPACING.xl,
        paddingRight: 8,
        gap: SPACING.md,
        ...SHADOWS.lg,
    },
    toastText: { flex: 1, color: COLORS.onNight, fontSize: 15, fontWeight: '700', paddingVertical: 12 },
    toastAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.brand,
        borderRadius: 20,
        height: 40,
        paddingHorizontal: 14,
    },
    toastActionText: { fontSize: 15, fontWeight: '800', color: COLORS.onBrand },
    toastCount: { fontSize: 12, fontWeight: '700', color: COLORS.onBrand },

    backdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        gap: SPACING.lg,
    },
    grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#D9D1C1' },

    confirm: { gap: SPACING.lg },
    dangerIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.errorMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmTitle: { fontSize: 26, lineHeight: 30, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
    confirmBody: { fontSize: 16, lineHeight: 23, color: COLORS.text },
    confirmWarning: { fontSize: 15, fontWeight: '800', color: COLORS.error },
    secondary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    secondaryLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    secondarySub: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    typeLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    typeInput: {
        height: 56,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 2,
        color: COLORS.text,
    },
    confirmActions: { gap: SPACING.sm },
    confirmBtn: { height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
    confirmBtnDanger: { backgroundColor: COLORS.error },
    confirmBtnNight: { backgroundColor: COLORS.night },
    confirmBtnText: { fontSize: 17, fontWeight: '800', color: COLORS.onNight },

    help: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    helpText: { fontSize: 20, fontWeight: '800', color: COLORS.text },
});
