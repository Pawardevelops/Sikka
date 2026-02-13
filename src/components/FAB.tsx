/**
 * Sikka - Floating Action Button Component
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

interface FABProps {
    onPress?: () => void;
}

export function FAB({ onPress }: FABProps) {
    return (
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={onPress}>
            <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 90,
        alignSelf: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.glow,
    },
    fabIcon: {
        fontSize: 32,
        color: COLORS.background,
        fontWeight: '300',
        marginTop: -2,
    },
});

export default FAB;
