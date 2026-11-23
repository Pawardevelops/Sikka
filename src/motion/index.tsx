/**
 * Sikka motion kit — design-system/MOTION.md implemented on Reanimated.
 *
 * Everything here reads its timing from MOTION tokens and honours the system
 * "reduce motion" setting (ReduceMotion.System), so screens never hand-roll
 * durations or easings.
 */

import React, { ReactNode, useEffect } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    ReduceMotion,
    SlideInDown,
    SlideOutDown,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
    ZoomIn,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { MOTION } from '../constants/theme';

// ─── Easings (tokens → Reanimated) ────────────────────────────────────
export const EASE = {
    out: Easing.bezier(...MOTION.easeOut),
    spring: Easing.bezier(...MOTION.easeSpring),
    in: Easing.bezier(...MOTION.easeIn),
    inOut: Easing.inOut(Easing.sin),
} as const;

/** Spring used for "pop when picked": quick, a little overshoot. */
export const POP_SPRING = { damping: 14, stiffness: 260, mass: 0.7 } as const;

const STAGGER_MS = 60;

// ─── Layout-animation presets ─────────────────────────────────────────
/** `sk-rise`: rise 16px + fade, dur-slow, ease-out, 60ms stagger by index. */
export const riseIn = (index = 0) =>
    FadeInDown.withInitialValues({ opacity: 0, transform: [{ translateY: 16 }] })
        .duration(MOTION.durSlow)
        .easing(EASE.out)
        .delay(index * STAGGER_MS)
        .reduceMotion(ReduceMotion.System);

/** `sk-pop`: badges, chips, the check badge. */
export const popIn = (index = 0) =>
    ZoomIn.duration(MOTION.durBase)
        .easing(EASE.spring)
        .delay(index * STAGGER_MS)
        .reduceMotion(ReduceMotion.System);

export const fadeIn = FadeIn.duration(MOTION.durBase).easing(EASE.out).reduceMotion(ReduceMotion.System);
export const fadeOut = FadeOut.duration(MOTION.durFast).easing(EASE.in).reduceMotion(ReduceMotion.System);
export const sheetIn = SlideInDown.duration(MOTION.durBase).easing(EASE.out).reduceMotion(ReduceMotion.System);
export const sheetOut = SlideOutDown.duration(MOTION.durFast).easing(EASE.in).reduceMotion(ReduceMotion.System);

/**
 * `sk-grow-y`: chart bars growing from the baseline. Give the view
 * `transformOrigin: 'bottom'`.
 */
export const growY = (index = 0) => () => {
    'worklet';
    return {
        initialValues: { transform: [{ scaleY: 0 }] },
        animations: {
            transform: [
                {
                    scaleY: withDelay(
                        index * 40,
                        withTiming(1, { duration: MOTION.durSlow, easing: EASE.out, reduceMotion: ReduceMotion.System }),
                    ),
                },
            ],
        },
    };
};

// ─── Components ───────────────────────────────────────────────────────
/** Wrap a card/row to have it arrive with `sk-rise`. */
export function Rise({
    index = 0,
    style,
    children,
}: {
    index?: number;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
}) {
    return (
        <Animated.View entering={riseIn(index)} style={style}>
            {children}
        </Animated.View>
    );
}

/** Pressable that shrinks slightly while held (dur-fast). */
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
                onPressIn={(e) => {
                    scale.value = withTiming(pressedScale, { duration: MOTION.durFast, easing: EASE.out });
                    rest.onPressIn?.(e);
                }}
                onPressOut={(e) => {
                    scale.value = withSpring(1, POP_SPRING);
                    rest.onPressOut?.(e);
                }}
            >
                {children}
            </Pressable>
        </Animated.View>
    );
}

/** `sk-float`: gentle bob for Sikku / hero illustrations. */
export function Float({ children, distance = 8, style }: { children: ReactNode; distance?: number; style?: StyleProp<ViewStyle> }) {
    const reduced = useReducedMotion();
    const y = useSharedValue(0);
    useEffect(() => {
        if (reduced) return;
        y.value = withRepeat(withTiming(-distance, { duration: 1500, easing: EASE.inOut }), -1, true);
    }, [reduced, distance, y]);
    const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
    return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/** `sk-pulse`: a halo that breathes outward. Place absolutely behind a button. */
export function PulseHalo({ size, color, style }: { size: number; color: string; style?: StyleProp<ViewStyle> }) {
    const reduced = useReducedMotion();
    const p = useSharedValue(0);
    useEffect(() => {
        if (reduced) return;
        p.value = withRepeat(withTiming(1, { duration: 1600, easing: EASE.out }), -1, false);
    }, [reduced, p]);
    const animated = useAnimatedStyle(() => ({
        opacity: 0.5 * (1 - p.value),
        transform: [{ scale: 1 + 0.35 * p.value }],
    }));
    return (
        <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, animated, style]}
        />
    );
}

/** `sk-wiggle`: an occasional nudge (every `every` ms) on something waiting. */
export function Wiggle({ children, every = 3000, style }: { children: ReactNode; every?: number; style?: StyleProp<ViewStyle> }) {
    const reduced = useReducedMotion();
    const r = useSharedValue(0);
    useEffect(() => {
        if (reduced) return;
        const step = { duration: 70, easing: EASE.inOut };
        r.value = withRepeat(
            withDelay(every, withSequence(withTiming(-6, step), withTiming(6, step), withTiming(-3, step), withTiming(0, step))),
            -1,
            false,
        );
    }, [reduced, every, r]);
    const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
    return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

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

/**
 * Plays one of the design-system Lottie files. With reduced motion it renders
 * the last frame, still.
 */
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
