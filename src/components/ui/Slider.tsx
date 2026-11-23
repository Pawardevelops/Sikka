/**
 * Sikka slider — night fill on a light track with a white knob (Profile spend limit).
 * Dependency-free: PanResponder + layout width. Keyboard/a11y: adjustable role
 * with increment / decrement actions.
 */

import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, LayoutChangeEvent, AccessibilityActionEvent } from 'react-native';
import { COLORS } from '../../constants/theme';

interface SliderProps {
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    label: string;
    trackColor?: string;
    fillColor?: string;
    formatValue?: (v: number) => string;
}

export function Slider({
    value,
    min,
    max,
    step,
    onChange,
    label,
    trackColor = '#FFF6D1',
    fillColor = COLORS.night,
    formatValue = String,
}: SliderProps) {
    const [width, setWidth] = useState(0);
    const widthRef = useRef(0);
    const startX = useRef(0);
    const valueRef = useRef(value);
    valueRef.current = value;

    const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
    const toX = (v: number) => ((v - min) / (max - min)) * widthRef.current;
    const fromX = (x: number) => clamp(min + (x / Math.max(1, widthRef.current)) * (max - min));

    const responder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                startX.current = e.nativeEvent.locationX;
                onChange(fromX(startX.current));
            },
            onPanResponderMove: (_, g) => onChange(fromX(startX.current + g.dx)),
            onPanResponderTerminationRequest: () => false,
        }),
    ).current;

    const onLayout = (e: LayoutChangeEvent) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
    };

    const onAction = (e: AccessibilityActionEvent) => {
        if (e.nativeEvent.actionName === 'increment') onChange(clamp(valueRef.current + step));
        if (e.nativeEvent.actionName === 'decrement') onChange(clamp(valueRef.current - step));
    };

    const pct = (value - min) / (max - min);
    return (
        <View
            style={styles.hit}
            onLayout={onLayout}
            {...responder.panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityValue={{ text: formatValue(value) }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAction}
        >
            <View style={[styles.track, { backgroundColor: trackColor }]} pointerEvents="none">
                <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fillColor }]} />
            </View>
            {width > 0 && <View pointerEvents="none" style={[styles.knob, { left: toX(value) - 14 }]} />}
        </View>
    );
}

const styles = StyleSheet.create({
    hit: { height: 32, justifyContent: 'center' },
    track: { height: 10, borderRadius: 5, overflow: 'hidden' },
    fill: { height: 10, borderRadius: 5 },
    knob: {
        position: 'absolute',
        top: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 3,
        borderColor: COLORS.night,
    },
});
