/**
 * Sikka amount keypad — 3×4 white keys in the display face (Add a payment).
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../Typography';
import { Icon } from '../Icon';
import { COLORS, SHADOWS } from '../../constants/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

/** Applies one key press to an amount string (max 2 decimals, 9 integer digits). */
export function applyKey(current: string, key: string): string {
    if (key === 'del') return current.slice(0, -1);
    if (key === '.') return current.includes('.') ? current : (current || '0') + '.';
    const [int, dec] = current.split('.');
    if (dec !== undefined && dec.length >= 2) return current;
    if (dec === undefined && int.length >= 9) return current;
    if (current === '0') return key;
    return current + key;
}

export function Keypad({ onKey }: { onKey: (key: string) => void }) {
    return (
        <View style={styles.grid}>
            {KEYS.map((k) => (
                <TouchableOpacity
                    key={k}
                    onPress={() => onKey(k)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={k === 'del' ? 'Delete digit' : k === '.' ? 'Decimal point' : k}
                    style={[styles.key, k === '.' || k === 'del' ? styles.keyQuiet : SHADOWS.sm]}
                >
                    {k === 'del' ? (
                        <Icon name="backspace" size={22} color={COLORS.text} />
                    ) : (
                        <Text style={styles.keyText}>{k}</Text>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    key: {
        width: '31.5%',
        flexGrow: 1,
        height: 52,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyQuiet: { backgroundColor: 'transparent' },
    keyText: { fontSize: 24, fontWeight: '700', color: COLORS.text },
});
