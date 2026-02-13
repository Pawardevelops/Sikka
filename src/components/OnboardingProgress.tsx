/**
 * Sikka - Onboarding Progress Bar
 * Visual step indicator for onboarding flow
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { OnboardingStep } from '../types';
import { COLORS, SPACING } from '../constants/theme';

interface OnboardingProgressProps {
    currentStep: OnboardingStep;
    totalSteps?: number;
}

export function OnboardingProgress({ currentStep, totalSteps = 5 }: OnboardingProgressProps) {
    return (
        <View style={styles.container}>
            {Array.from({ length: totalSteps }, (_, i) => {
                const stepNumber = (i + 1) as OnboardingStep;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;

                return (
                    <View
                        key={stepNumber}
                        style={[
                            styles.segment,
                            isActive && styles.activeSegment,
                            isCompleted && styles.completedSegment,
                        ]}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.lg,
    },
    segment: {
        height: 4,
        flex: 1,
        maxWidth: 60,
        borderRadius: 2,
        backgroundColor: COLORS.border,
    },
    activeSegment: {
        backgroundColor: COLORS.primary,
    },
    completedSegment: {
        backgroundColor: COLORS.primary,
    },
});
