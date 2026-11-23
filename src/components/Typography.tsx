/**
 * Sikka typography primitives.
 *
 * Drop-in replacements for React Native's <Text> and <TextInput> that apply the
 * design-system typefaces automatically:
 *   - Bricolage Grotesque (display) for money and titles — any text >= 20px
 *   - Urbanist (sans) for everything else
 *
 * Custom fonts on Android need a separate family per weight, so we resolve the
 * style's fontWeight to the matching registered family and reset fontWeight.
 * An explicit fontFamily in a style always wins.
 */

import React, { forwardRef } from 'react';
import Animated from 'react-native-reanimated';
import {
    Text as RNText,
    TextInput as RNTextInput,
    TextProps,
    TextInputProps,
    StyleSheet,
    TextStyle,
    StyleProp,
} from 'react-native';
import { FONT_FAMILY } from '../constants/theme';

type Weight = '400' | '500' | '600' | '700' | '800';

const DISPLAY_MIN_SIZE = 20;

function normalizeWeight(w: TextStyle['fontWeight'], fallback: Weight): Weight {
    if (w === undefined || w === null) return fallback;
    if (w === 'normal') return '400';
    if (w === 'bold') return '700';
    const n = typeof w === 'number' ? w : parseInt(String(w), 10);
    if (Number.isNaN(n)) return fallback;
    if (n >= 800) return '800';
    if (n >= 700) return '700';
    if (n >= 600) return '600';
    if (n >= 500) return '500';
    return '400';
}

export function resolveFontStyle(style: StyleProp<TextStyle>, defaultSize = 14): TextStyle | undefined {
    const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
    if (flat.fontFamily) return undefined; // caller chose a family explicitly
    const size = flat.fontSize ?? defaultSize;
    const isDisplay = size >= DISPLAY_MIN_SIZE;
    const weight = normalizeWeight(flat.fontWeight, isDisplay ? '800' : '500');
    const family = isDisplay ? FONT_FAMILY.display[weight] : FONT_FAMILY.sans[weight];
    return { fontFamily: family, fontWeight: 'normal' };
}

export const Text = forwardRef<RNText, TextProps>(function SikkaText({ style, ...rest }, ref) {
    const fontStyle = resolveFontStyle(style);
    return <RNText ref={ref} {...rest} style={fontStyle ? [style, fontStyle] : style} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function SikkaTextInput(
    { style, placeholderTextColor, ...rest },
    ref,
) {
    const fontStyle = resolveFontStyle(style as StyleProp<TextStyle>, 16);
    return (
        <RNTextInput
            ref={ref}
            placeholderTextColor={placeholderTextColor ?? '#8C8577'}
            {...rest}
            style={fontStyle ? [style, fontStyle] : style}
        />
    );
});

/** Reanimated variant of the Sikka <Text> (use instead of Animated.Text). */
export const AnimatedText = Animated.createAnimatedComponent(Text);

export type { TextProps, TextInputProps };
