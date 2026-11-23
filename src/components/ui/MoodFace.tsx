/**
 * Sikka mood faces — "How did it feel?" (design-system/components/MoodFace).
 * Joy (lime) · Essential (sky) · Impulse (butter) · Regret (pink) · Growth (lilac).
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '../Typography';
import { COLORS, CATEGORY_PALETTE, SIKKA } from '../../constants/theme';

export const MOODS = [
    { id: 'joy', label: 'Joy', fill: CATEGORY_PALETTE.groceries.bg },
    { id: 'essential', label: 'Essential', fill: CATEGORY_PALETTE.transport.bg },
    { id: 'impulse', label: 'Impulse', fill: CATEGORY_PALETTE.bills.bg },
    { id: 'regret', label: 'Regret', fill: CATEGORY_PALETTE.shopping.bg },
    { id: 'growth', label: 'Growth', fill: CATEGORY_PALETTE.fun.bg },
] as const;

export type MoodId = (typeof MOODS)[number]['id'];

export function MoodFace({ mood, size = 52 }: { mood: string; size?: number }) {
    const m = MOODS.find((x) => x.id === mood) ?? MOODS[0];
    const ink = SIKKA.ink;
    return (
        <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel={m.label}>
            <Circle cx={16} cy={16} r={15} fill={m.fill} />
            {mood === 'impulse' ? (
                <>
                    <Circle cx={11.5} cy={12.5} r={2.4} fill={ink} />
                    <Circle cx={20.5} cy={12.5} r={2.4} fill={ink} />
                    <Circle cx={16} cy={21} r={3} fill="none" stroke={ink} strokeWidth={2} />
                </>
            ) : mood === 'growth' ? (
                <>
                    <Path d="M9.5 13q2-2 4 0M18.5 13q2-2 4 0" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
                    <Path d="M11 19q5 4.5 10 0" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
                </>
            ) : (
                <>
                    <Circle cx={11.5} cy={mood === 'regret' ? 13.5 : 13} r={1.8} fill={ink} />
                    <Circle cx={20.5} cy={mood === 'regret' ? 13.5 : 13} r={1.8} fill={ink} />
                    {mood === 'essential' && <Path d="M11 20h10" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />}
                    {mood === 'regret' && <Path d="M10.5 22q5.5-5 11 0" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />}
                    {mood === 'joy' && <Path d="M10 18.5q6 6 12 0" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />}
                </>
            )}
        </Svg>
    );
}

/** Row of five mood faces; single choice (tap again to clear). */
export function MoodPicker({ value, onChange }: { value?: string; onChange: (id: string | undefined) => void }) {
    return (
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="How did it feel?">
            {MOODS.map((m) => {
                const on = value === m.id;
                return (
                    <TouchableOpacity
                        key={m.id}
                        onPress={() => onChange(on ? undefined : m.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={m.label}
                        activeOpacity={0.8}
                        style={styles.item}
                    >
                        <View style={[styles.face, on && styles.faceOn]}>
                            <MoodFace mood={m.id} size={52} />
                        </View>
                        <Text style={[styles.label, on && { color: COLORS.text }]}>{m.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    item: { alignItems: 'center', gap: 6 },
    face: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
    faceOn: { borderWidth: 4, borderColor: COLORS.night, transform: [{ scale: 1.06 }] },
    label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
});
