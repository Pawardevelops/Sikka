/**
 * Sikka design-system controls (see design-system/components/*).
 * Button, IconButton, StepDots, Toggle, Segmented, Chip, CategoryTile,
 * HeroCard, ProgressBar, ScreenHeader, SectionLabel.
 */

import React, { ReactNode, useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    ViewStyle,
    StyleProp,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { EASE, POP_SPRING, popIn } from '../../motion';
import { Text } from '../Typography';
import { Icon, IconName } from '../Icon';
import { COLORS, SIKKA, SHADOWS, SPACING, BORDER_RADIUS, CATEGORY_PALETTE, MOTION, PaletteKey } from '../../constants/theme';


// ─── Button ───────────────────────────────────────────────────────────
/**
 * The one primary action on a screen: a night pill with a lime dot holding
 * the arrow / check. `soft` = white secondary; `lime` = positive action.
 */
export function Button({
    label,
    onPress,
    icon = 'arrow-forward',
    variant = 'night',
    disabled,
    loading,
    style,
}: {
    label: string;
    onPress?: () => void;
    icon?: IconName | null;
    variant?: 'night' | 'soft' | 'lime' | 'outline';
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    const scale = useSharedValue(1);
    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const pressIn = () => { scale.value = withTiming(0.97, { duration: MOTION.durFast, easing: EASE.out }); };
    const pressOut = () => { scale.value = withSpring(1, POP_SPRING); };
    const isNight = variant === 'night';
    const fg = isNight ? COLORS.onNight : COLORS.text;
    const bg = isNight ? COLORS.night : variant === 'lime' ? COLORS.brand : variant === 'soft' ? COLORS.surface : 'transparent';

    return (
        <Animated.View style={[scaleStyle, style]}>
            <Pressable
                onPress={onPress}
                disabled={disabled || loading}
                onPressIn={pressIn}
                onPressOut={pressOut}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!disabled }}
                style={[
                    styles.btn,
                    { backgroundColor: bg },
                    isNight && icon ? styles.btnWithDot : styles.btnCentered,
                    variant === 'soft' && SHADOWS.md,
                    variant === 'outline' && styles.btnOutline,
                    disabled && styles.btnDisabled,
                ]}
            >
                <Text style={[styles.btnLabel, { color: fg }]} numberOfLines={1}>{label}</Text>
                {loading ? (
                    <View style={styles.btnDot}><ActivityIndicator color={COLORS.onBrand} /></View>
                ) : isNight && icon ? (
                    <View style={styles.btnDot}><Icon name={icon} size={22} color={COLORS.onBrand} /></View>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}

// ─── IconButton ───────────────────────────────────────────────────────
export function IconButton({
    icon,
    onPress,
    label,
    variant = 'surface',
    size = 44,
    iconSize = 22,
    style,
}: {
    icon: IconName;
    onPress?: () => void;
    label: string;
    variant?: 'surface' | 'lime' | 'night' | 'ghost';
    size?: number;
    iconSize?: number;
    style?: StyleProp<ViewStyle>;
}) {
    const bg = variant === 'lime' ? COLORS.brand : variant === 'night' ? COLORS.night : variant === 'ghost' ? 'transparent' : COLORS.surface;
    const fg = variant === 'night' ? COLORS.brand : COLORS.text;
    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            activeOpacity={0.75}
            style={[
                { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
                variant === 'surface' && SHADOWS.sm,
                style,
            ]}
        >
            <Icon name={icon} size={iconSize} color={fg} />
        </TouchableOpacity>
    );
}

// ─── StepDots (onboarding progress) ───────────────────────────────────
export function StepDots({ total, current }: { total: number; current: number }) {
    return (
        <View style={styles.dots} accessibilityLabel={`Step ${current} of ${total}`}>
            {Array.from({ length: total }, (_, i) => {
                const step = i + 1;
                return (
                    <View
                        key={step}
                        style={[styles.dot, step === current && styles.dotNow, step <= current ? styles.dotDone : styles.dotTodo]}
                    />
                );
            })}
        </View>
    );
}

// ─── Toggle ───────────────────────────────────────────────────────────
export function Toggle({
    value,
    onValueChange,
    label,
    disabled,
}: {
    value: boolean;
    onValueChange: (v: boolean) => void;
    label: string;
    disabled?: boolean;
}) {
    const progress = useSharedValue(value ? 1 : 0);
    useEffect(() => {
        progress.value = withSpring(value ? 1 : 0, POP_SPRING);
    }, [value, progress]);
    const trackStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(progress.value, [0, 1], [SIKKA.line, SIKKA.night]),
    }));
    const knobStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(progress.value, [0, 1], [SIKKA.surface, SIKKA.lime]),
        transform: [{ translateX: progress.value * 22 }],
    }));

    return (
        <Pressable
            onPress={() => !disabled && onValueChange(!value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: value, disabled: !!disabled }}
            accessibilityLabel={label}
            hitSlop={8}
            style={disabled ? { opacity: 0.45 } : undefined}
        >
            <Animated.View style={[styles.toggle, trackStyle]}>
                <Animated.View style={[styles.toggleKnob, knobStyle]} />
            </Animated.View>
        </Pressable>
    );
}

// ─── Segmented control ────────────────────────────────────────────────
export function Segmented<T extends string>({
    options,
    value,
    onChange,
    label,
    tone = 'surface',
    style,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    label: string;
    /** surface: white track · sunk: cream track · pills: separate white pills */
    tone?: 'surface' | 'sunk' | 'pills';
    style?: StyleProp<ViewStyle>;
}) {
    const pills = tone === 'pills';
    return (
        <View
            accessibilityRole="radiogroup"
            accessibilityLabel={label}
            style={[
                styles.seg,
                pills ? styles.segPills : tone === 'sunk' ? { backgroundColor: COLORS.background } : [{ backgroundColor: COLORS.surface }, SHADOWS.sm],
                style,
            ]}
        >
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <TouchableOpacity
                        key={o.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        onPress={() => onChange(o.value)}
                        activeOpacity={0.8}
                        style={[styles.segBtn, pills && styles.segPill, on && styles.segBtnOn]}
                    >
                        <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>{o.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ─── Chip ─────────────────────────────────────────────────────────────
export function Chip({
    label,
    selected,
    onPress,
    palette,
    icon,
    tone,
    style,
}: {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    palette?: PaletteKey;
    icon?: IconName;
    tone?: 'night' | 'surface' | 'ground';
    style?: StyleProp<ViewStyle>;
}) {
    const pair = palette ? CATEGORY_PALETTE[palette] : null;
    const bg = tone === 'night' ? COLORS.night : tone === 'ground' ? COLORS.background : pair ? pair.bg : COLORS.surface;
    const fg = tone === 'night' ? COLORS.onNight : pair ? pair.fg : COLORS.text;
    const Wrapper: any = onPress ? TouchableOpacity : View;
    return (
        <Wrapper
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityState={onPress ? { selected: !!selected } : undefined}
            style={[styles.chip, { backgroundColor: bg }, selected && styles.chipOn, style]}
        >
            {icon && <Icon name={icon} size={16} color={fg} />}
            <Text style={[styles.chipText, { color: fg }]} numberOfLines={1}>{label}</Text>
        </Wrapper>
    );
}

// ─── CategoryTile ─────────────────────────────────────────────────────
export function CategoryTile({
    label,
    icon,
    palette,
    selected,
    onPress,
    height = 84,
    style,
}: {
    label: string;
    icon: IconName;
    palette: PaletteKey | 'night';
    selected?: boolean;
    onPress?: () => void;
    height?: number;
    style?: StyleProp<ViewStyle>;
}) {
    const night = palette === 'night';
    const pair = night ? { bg: COLORS.night, fg: COLORS.onNight } : CATEGORY_PALETTE[palette];
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ checked: !!selected }}
            accessibilityLabel={label}
            style={[styles.tile, { backgroundColor: pair.bg, height }, selected && styles.tileOn, style]}
        >
            <View style={[styles.tileIcon, night && { backgroundColor: COLORS.brand }]}>
                <Icon name={icon} size={20} color={night ? COLORS.onBrand : pair.fg} />
            </View>
            <Text style={[styles.tileLabel, { color: night ? COLORS.onNight : pair.fg }]} numberOfLines={1}>{label}</Text>
            {selected && (
                <Animated.View entering={popIn()} style={styles.tileCheck}><Icon name="check" size={13} color={COLORS.brand} /></Animated.View>
            )}
        </TouchableOpacity>
    );
}

// ─── HeroCard ─────────────────────────────────────────────────────────
/** One big pastel / lime / night block per screen, with one soft corner circle. */
export function HeroCard({
    children,
    palette = 'lime',
    style,
    circle = true,
}: {
    children: ReactNode;
    palette?: PaletteKey | 'lime' | 'night';
    style?: StyleProp<ViewStyle>;
    circle?: boolean;
}) {
    const bg = palette === 'lime' ? COLORS.brand : palette === 'night' ? COLORS.night : CATEGORY_PALETTE[palette].bg;
    return (
        <View style={[styles.hero, { backgroundColor: bg }, style]}>
            {circle && (
                <View
                    pointerEvents="none"
                    style={[styles.heroCircle, palette === 'night' && { backgroundColor: '#2E2B24' }]}
                />
            )}
            {children}
        </View>
    );
}

// ─── ProgressBar ──────────────────────────────────────────────────────
export function ProgressBar({
    value,
    color = COLORS.brand,
    track = COLORS.surfaceSunk,
    height = 10,
    label,
}: {
    value: number; // 0..1
    color?: string;
    track?: string;
    height?: number;
    label?: string;
}) {
    const pct = Math.max(0, Math.min(1, value));
    const fill = useSharedValue(0);
    useEffect(() => {
        fill.value = withTiming(pct, { duration: MOTION.durSlow, easing: EASE.out });
    }, [pct, fill]);
    const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
    return (
        <View
            accessibilityRole="progressbar"
            accessibilityLabel={label}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
            style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}
        >
            <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, fillStyle]} />
        </View>
    );
}

// ─── ScreenHeader ─────────────────────────────────────────────────────
/** Round back button · optional middle content · optional right action. */
export function ScreenHeader({
    onBack,
    middle,
    right,
    title,
}: {
    onBack?: () => void;
    middle?: ReactNode;
    right?: ReactNode;
    title?: string;
}) {
    return (
        <View style={styles.header}>
            {onBack ? <IconButton icon="chevron-left" label="Back" onPress={onBack} iconSize={26} /> : null}
            <View style={styles.headerMiddle}>
                {title ? <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text> : middle}
            </View>
            {right}
        </View>
    );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: any }) {
    return <Text style={[styles.overline, style]}>{children}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    btn: {
        height: 62,
        borderRadius: 31,
        flexDirection: 'row',
        alignItems: 'center',
    },
    btnWithDot: { justifyContent: 'space-between', paddingLeft: SPACING.xxl, paddingRight: 8 },
    btnCentered: { justifyContent: 'center', paddingHorizontal: SPACING.xxl },
    btnOutline: { borderWidth: 2, borderColor: COLORS.night },
    btnDisabled: { opacity: 0.4 },
    btnLabel: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
    btnDot: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.brand,
        alignItems: 'center',
        justifyContent: 'center',
    },

    dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotNow: { width: 28 },
    dotDone: { backgroundColor: COLORS.night },
    dotTodo: { backgroundColor: '#D9D1C1' },

    toggle: { width: 54, height: 32, borderRadius: 16, padding: 3 },
    toggleKnob: { width: 26, height: 26, borderRadius: 13 },

    seg: { flexDirection: 'row', padding: 4, borderRadius: BORDER_RADIUS.full, gap: 4 },
    segBtn: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    segBtnOn: { backgroundColor: COLORS.night },
    segPills: { padding: 0, gap: SPACING.sm },
    segPill: { height: 48, borderRadius: 24, backgroundColor: COLORS.surface, ...SHADOWS.sm },
    segText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    segTextOn: { color: COLORS.onNight, fontWeight: '800' },

    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 38,
        paddingHorizontal: 14,
        borderRadius: BORDER_RADIUS.full,
        alignSelf: 'flex-start',
    },
    chipOn: { borderWidth: 3, borderColor: COLORS.text },
    chipText: { fontSize: 14, fontWeight: '800' },

    tile: {
        flex: 1,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    tileOn: { borderWidth: 3, borderColor: COLORS.text },
    tileIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileLabel: { fontSize: 13, fontWeight: '800' },
    tileCheck: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.night,
        alignItems: 'center',
        justifyContent: 'center',
    },

    hero: { borderRadius: BORDER_RADIUS.xxl, padding: SPACING.xl, overflow: 'hidden' },
    heroCircle: {
        position: 'absolute',
        right: -30,
        top: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },

    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
    headerMiddle: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },

    overline: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8, color: COLORS.textSecondary, textTransform: 'uppercase' },
});
