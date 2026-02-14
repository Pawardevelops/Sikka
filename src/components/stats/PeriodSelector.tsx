import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { Period } from '../../hooks/useCategoryStats';

interface PeriodSelectorProps {
    period: Period;
    onChange: (period: Period) => void;
}

export function PeriodSelector({ period, onChange }: PeriodSelectorProps) {
    return (
        <View style={styles.container}>
            {(['Week', 'Month', 'Year'] as Period[]).map((p) => (
                <TouchableOpacity
                    key={p}
                    style={[styles.btn, period === p && styles.btnActive]}
                    onPress={() => onChange(p)}
                >
                    <Text style={[styles.text, period === p && styles.textActive]}>
                        {p}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.xs,
        marginBottom: SPACING.lg,
    },
    btn: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.sm,
    },
    btnActive: {
        backgroundColor: COLORS.primary,
    },
    text: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    textActive: {
        color: COLORS.background,
    },
});
