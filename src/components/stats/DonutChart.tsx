import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { COLORS } from '../../constants/theme';
import { CategoryStat } from '../../types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartProps {
    data: CategoryStat[];
    size?: number;
    strokeWidth?: number;
}

export function DonutChart({
    data,
    size = 200,
    strokeWidth = 20
}: DonutChartProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // We need to calculate the start angle for each segment
    // Total is 100% since we pre-calculate percentages in hook
    let currentAngle = -90; // Start from top

    // Colors palette if not provided in data
    const PALETTE = [
        COLORS.primary,
        COLORS.secondary,
        COLORS.accent,
        COLORS.warning,
        COLORS.error,
        COLORS.info,
        COLORS.success,
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1'
    ];

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                <G rotation={0} origin={`${center}, ${center}`}>
                    {data.map((item, index) => {
                        const strokeDashoffset = circumference - (circumference * item.percent) / 100;
                        const angle = currentAngle;
                        const color = PALETTE[index % PALETTE.length];

                        // Update start angle for next segment
                        currentAngle += (item.percent / 100) * 360;

                        return (
                            <AnimatedCircle
                                key={item.name}
                                cx={center}
                                cy={center}
                                r={radius}
                                stroke={color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                rotation={angle}
                                origin={`${center}, ${center}`}
                                fill="transparent"
                            />
                        );
                    })}
                    {/* Background Circle if empty */}
                    {data.length === 0 && (
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={COLORS.surfaceLight}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                    )}
                </G>
            </Svg>
            <View style={styles.centerText}>
                {/* Optional: Add total amount or text in center */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerText: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
