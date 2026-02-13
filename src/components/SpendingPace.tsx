/**
 * Sikka - Spending Pace Component
 * Semi-circular gauge showing daily spending pace
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SpendingPaceData } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';

interface SpendingPaceProps {
    data: SpendingPaceData;
}

export function SpendingPace({ data }: SpendingPaceProps) {
    const { formatCurrency } = useSettings();

    const statusConfig = {
        on_track: { label: 'On Track', color: COLORS.primary },
        over_budget: { label: 'Over Budget', color: COLORS.error },
        under_budget: { label: 'Under Budget', color: COLORS.info },
    };

    const config = statusConfig[data.status];

    // Calculate the arc progress (0 to 1)
    const progress = Math.min(data.currentPace / data.dailyBudget, 1.2);

    // SVG arc parameters
    const size = 140;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;

    // Arc from 180° to 360° (bottom half)
    const startAngle = 180;
    const endAngle = 360;
    const sweepAngle = (endAngle - startAngle) * Math.min(progress, 1);

    const polarToCartesian = (angle: number) => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: center + radius * Math.cos(rad),
            y: center + radius * Math.sin(rad),
        };
    };

    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(startAngle + sweepAngle);
    const largeArcFlag = sweepAngle > 180 ? 1 : 0;

    const arcPath = sweepAngle > 0
        ? `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
        : '';

    const backgroundPath = `M ${polarToCartesian(startAngle).x} ${polarToCartesian(startAngle).y} A ${radius} ${radius} 0 1 1 ${polarToCartesian(endAngle).x} ${polarToCartesian(endAngle).y}`;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Spending Pace</Text>
                <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
                    <Text style={styles.statusText}>{config.label}</Text>
                </View>
            </View>

            <View style={styles.gaugeContainer}>
                <Svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
                    {/* Background arc */}
                    <Path
                        d={backgroundPath}
                        stroke={COLORS.surfaceLight}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                    />
                    {/* Progress arc */}
                    {arcPath && (
                        <Path
                            d={arcPath}
                            stroke={config.color}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                        />
                    )}
                </Svg>

                <View style={styles.gaugeContent}>
                    <Text style={styles.paceValue}>{formatCurrency(data.currentPace)}</Text>
                    <Text style={styles.paceLabel}>/ DAY</Text>
                </View>
            </View>

            <Text style={styles.message}>
                Safe to spend {formatCurrency(data.dailyBudget)} a day for the next {data.daysRemaining} days
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.text,
    },
    statusBadge: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    statusText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.background,
    },
    gaugeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    gaugeContent: {
        position: 'absolute',
        bottom: 0,
        alignItems: 'center',
    },
    paceValue: {
        fontSize: FONT_SIZE.xxxl,
        fontWeight: '700',
        color: COLORS.text,
    },
    paceLabel: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginTop: -4,
    },
    message: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});

export default SpendingPace;
