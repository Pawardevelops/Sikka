/**
 * Sikka motion kit — micro, soft-settle, clean.
 *
 * Rules (Emil Kowalski's design-engineering standards, see the animate-expo skill):
 *  - Only animate what has a purpose: feedback, state change, preventing a jump.
 *    Tab switches and screens you see many times a day don't animate in.
 *  - Strong ease-out for anything entering or leaving; ease-in-out for things that
 *    move on screen; never ease-in.
 *  - UI motion stays under 300 ms; sheets ~300 ms on the iOS sheet curve.
 *  - Springs only where a finger lets go, and they settle without bounce.
 *  - Nothing grows from scale 0; entrances start at 0.92–0.97 with opacity.
 *  - transform and opacity only; every animation honours Reduce motion.
 */

import React, { ReactNode, useEffect } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    FadeOutDown,
    ReduceMotion,
    SlideInDown,
    SlideOutDown,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { MOTION } from '../constants/theme';

// ─── Curves (tokens → Reanimated) ─────────────────────────────────────
export const EASE = {
    /** Strong ease-out: entering, leaving, press feedback. */
    out: Easing.bezier(...MOTION.easeOut),
    /** Strong ease-in-out: something moving across the screen (toggle knob, pill). */
    inOut: Easing.bezier(...MOTION.easeInOut),
    /** iOS sheet curve. */
    sheet: Easing.bezier(...MOTION.easeSheet),
} as const;

/** Soft settle, no overshoot. Default for anything that settles into place. */
export const SETTLE = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;
/** After a drag: carries the finger's velocity, a touch of give, still no visible bounce. */
export const SNAP_BACK = { duration: 400, dampingRatio: 0.85, reduceMotion: ReduceMotion.System } as const;

const STAGGER_MS = 40;
const RM = ReduceMotion.System;

// ─── Layout-animation presets ─────────────────────────────────────────
/** Rise 8px + fade, 240 ms ease-out. For content that arrives once (first visit, onboarding). */
export const riseIn = (index = 0) =>
    FadeInDown.withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
        .duration(MOTION.durBase)
        .easing(EASE.out)
        .delay(index * STAGGER_MS)
        .reduceMotion(RM);

/** Badges, chips, a check: fade + 0.92 → 1, 200 ms ease-out. Never from scale 0. */
export const popIn = (index = 0) => () => {
    'worklet';
    const t = { duration: 200, easing: EASE.out, reduceMotion: RM };
    return {
        initialValues: { opacity: 0, transform: [{ scale: 0.92 }] },
        animations: {
            opacity: withDelay(index * STAGGER_MS, withTiming(1, t)),
            transform: [{ scale: withDelay(index * STAGGER_MS, withTiming(1, t)) }],
        },
    };
};

/** Centered modal card: fade + 0.96 → 1 (modals scale from the centre). */
export const modalIn = () => {
    'worklet';
    const t = { duration: 220, easing: EASE.out, reduceMotion: RM };
    return {
        initialValues: { opacity: 0, transform: [{ scale: 0.96 }] },
        animations: { opacity: withTiming(1, t), transform: [{ scale: withTiming(1, t) }] },
    };
};

export const fadeIn = FadeIn.duration(200).easing(EASE.out).reduceMotion(RM);
export const fadeOut = FadeOut.duration(160).easing(EASE.out).reduceMotion(RM);
export const sheetIn = SlideInDown.duration(300).easing(EASE.sheet).reduceMotion(RM);
export const sheetOut = SlideOutDown.duration(220).easing(EASE.out).reduceMotion(RM);
/** A pushed screen: 180 ms fade + 8px. Tab switches use nothing. */
export const screenIn = FadeInDown.withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
    .duration(180)
    .easing(EASE.out)
    .reduceMotion(RM);

/** Toasts: rise 12px + fade in, leave the same way ~20% faster. */
export const toastIn = FadeInDown.withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
    .duration(220)
    .easing(EASE.out)
    .reduceMotion(RM);
export const toastOut = FadeOutDown.duration(180).easing(EASE.out).reduceMotion(RM);

/**
 * Chart bars growing from the baseline (give the view `transformOrigin: 'bottom'`).
 * Starts at 0.1, not 0, and only plays on a first visit.
 */
export const growY = (index = 0) => () => {
    'worklet';
    return {
        initialValues: { opacity: 0, transform: [{ scaleY: 0.1 }] },
        animations: {
            opacity: withDelay(index * 30, withTiming(1, { duration: 160, easing: EASE.out, reduceMotion: RM })),
            transform: [{ scaleY: withDelay(index * 30, withTiming(1, { duration: 280, easing: EASE.out, reduceMotion: RM })) }],
        },
    };
};

// ─── First visit ──────────────────────────────────────────────────────
const seen = new Set<string>();
/**
 * True only the first time a screen mounts in this app session. Home is seen
 * tens of times a day; its sections rise in once, then they're just there.
 */
export function useFirstVisit(key: string): boolean {
    const [first] = React.useState(() => !seen.has(key));
    useEffect(() => { seen.add(key); }, [key]);
    return first;
}

// ─── Components ───────────────────────────────────────────────────────
/** Wrap a card/row to have it rise in. `skip` renders it in place. */
export function Rise({
    index = 0,
    style,
    children,
    skip,
}: {
    index?: number;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
    skip?: boolean;
}) {
    return (
        <Animated.View entering={skip ? undefined : riseIn(index)} style={style}>
            {children}
        </Animated.View>
    );
}

/** Pressable that dips to 0.97 on press-in (120 ms) and returns on release (160 ms). */
export function PressableScale({
    children,
    style,
    pressedScale = 0.97,
    ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; pressedScale?: number; children: ReactNode }) {
    const scale = useSharedValue(1);
    const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
        <Animated.View style={[animated, style]}>
            <Pressable
                {...rest}
                pressRetentionOffset={16}
                onPressIn={(e) => {
                    scale.value = withTiming(pressedScale, { duration: 120, easing: EASE.out, reduceMotion: RM });
                    rest.onPressIn?.(e);
                }}
                onPressOut={(e) => {
                    scale.value = withTiming(1, { duration: 160, easing: EASE.out, reduceMotion: RM });
                    rest.onPressOut?.(e);
                }}
            >
                {children}
            </Pressable>
        </Animated.View>
    );
}

/** Gentle bob for Sikku on rare screens (All clear). Off with Reduce motion. */
export function Float({ children, distance = 6, style }: { children: ReactNode; distance?: number; style?: StyleProp<ViewStyle> }) {
    const reduced = useReducedMotion();
    const y = useSharedValue(0);
    useEffect(() => {
        if (reduced) return;
        y.value = withRepeat(withTiming(-distance, { duration: 1800, easing: EASE.inOut }), -1, true);
    }, [reduced, distance, y]);
    const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
    return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/** A halo that breathes while something is listening (voice note). State, not decoration. */
export function PulseHalo({ size, color, style }: { size: number; color: string; style?: StyleProp<ViewStyle> }) {
    const reduced = useReducedMotion();
    const p = useSharedValue(0);
    useEffect(() => {
        if (reduced) return;
        p.value = withRepeat(withTiming(1, { duration: 1400, easing: EASE.out }), -1, false);
    }, [reduced, p]);
    const animated = useAnimatedStyle(() => ({
        opacity: 0.45 * (1 - p.value),
        transform: [{ scale: 1 + 0.25 * p.value }],
    }));
    return (
        <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, animated, style]}
        />
    );
}

// ─── Haptics: one per commit, always with a visual ────────────────────
type HapticsModule = typeof import('expo-haptics');
let haptics: HapticsModule | null | undefined;
function H(): HapticsModule | null {
    if (haptics !== undefined) return haptics;
    if (Platform.OS === 'web') return (haptics = null);
    try {
        haptics = require('expo-haptics') as HapticsModule;
    } catch {
        haptics = null;
    }
    return haptics;
}
export const haptic = {
    /** A value ticked: toggle, segmented control, category picked. */
    select: () => { void H()?.selectionAsync().catch(() => undefined); },
    /** A card committed (approve / not mine), a sheet snapped home. */
    commit: () => { const h = H(); void h?.impactAsync(h.ImpactFeedbackStyle.Light).catch(() => undefined); },
    /** Something finished well: deck cleared, rule learned. */
    success: () => { const h = H(); void h?.notificationAsync(h.NotificationFeedbackType.Success).catch(() => undefined); },
};

// ─── Lottie (assets/motion) ───────────────────────────────────────────
const LOTTIE = {
    'sikku-bounce': require('../../assets/motion/sikku-bounce.json'),
    'listening-pulse': require('../../assets/motion/listening-pulse.json'),
    'success-check': require('../../assets/motion/success-check.json'),
    'confetti-burst': require('../../assets/motion/confetti-burst.json'),
    'coin-drop': require('../../assets/motion/coin-drop.json'),
    'card-swipe-approve': require('../../assets/motion/card-swipe-approve.json'),
    'streak-flame': require('../../assets/motion/streak-flame.json'),
    'loading-coins': require('../../assets/motion/loading-coins.json'),
} as const;

export type LottieName = keyof typeof LOTTIE;

/** Loops per MOTION.md; everything else plays once. */
const LOOPING: ReadonlySet<LottieName> = new Set(['sikku-bounce', 'listening-pulse', 'streak-flame', 'loading-coins']);

/** Plays one of the design-system Lottie files. With Reduce motion it shows the last frame, still. */
export function Lottie({
    name,
    size = 200,
    loop,
    style,
    onFinish,
}: {
    name: LottieName;
    size?: number;
    loop?: boolean;
    style?: StyleProp<ViewStyle>;
    onFinish?: () => void;
}) {
    const reduced = useReducedMotion();
    const shouldLoop = loop ?? LOOPING.has(name);
    return (
        <LottieView
            source={LOTTIE[name]}
            autoPlay={!reduced}
            loop={!reduced && shouldLoop}
            progress={reduced ? 1 : undefined}
            onAnimationFinish={onFinish ? () => onFinish() : undefined}
            style={[{ width: size, height: size }, style]}
        />
    );
}

export { Animated, useReducedMotion };
