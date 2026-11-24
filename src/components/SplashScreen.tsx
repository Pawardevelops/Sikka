/**
 * Sikka - Splash Screen Component
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { EASE, POP_SPRING } from '../motion';
import { Text } from './Typography';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, TYPE } from '../constants/theme';
import { Icon } from './Icon';
import { SikkaMark } from './brand/SikkaMark';

interface SplashScreenProps {
    onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
    const appear = useSharedValue(0);
    const progress = useSharedValue(0);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = () => { timer = setTimeout(onFinish, 300); };
        appear.value = withSpring(1, POP_SPRING);
        progress.value = withDelay(
            300,
            withTiming(1, { duration: 2500, easing: EASE.out }, (done) => {
                if (done) runOnJS(finish)();
            }),
        );
        return () => clearTimeout(timer);
    }, [appear, progress, onFinish]);

    const contentStyle = useAnimatedStyle(() => ({
        opacity: Math.min(1, appear.value),
        transform: [{ scale: 0.8 + 0.2 * appear.value }],
    }));
    const barStyle = useAnimatedStyle(() => ({ width: 120 * progress.value }));

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.gradientOverlay} />
            <Animated.View style={[styles.content, contentStyle]}>
                <SikkaMark size={116} />
                <Text style={styles.appName}>Sikka</Text>
            </Animated.View>
            <View style={styles.bottomSection}>
                <View style={styles.progressContainer}>
                    <Animated.View style={[styles.progressBar, barStyle]} />
                </View>
                <Text style={styles.tagline}>Track Expenses. Save More. Grow Wealth.</Text>
                <View style={styles.badge}>
                    <Icon name="lock" size={12} color={COLORS.textMuted} style={{ marginRight: SPACING.sm }} />
                    <Text style={styles.badgeText}>YOUR MONEY, YOUR CONTROL</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientOverlay: {
        position: 'absolute',
        top: '30%',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: COLORS.brand,
        opacity: 0.05,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        ...TYPE.titleXl,
        color: COLORS.text,
        marginTop: SPACING.xl,
    },
    bottomSection: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
    progressContainer: {
        width: 120,
        height: 4,
        backgroundColor: COLORS.surfaceSunk,
        borderRadius: 2,
        marginBottom: SPACING.xxxl,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.brand,
        borderRadius: 2,
    },
    tagline: {
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
        fontWeight: '400',
        marginBottom: SPACING.lg,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceSunk,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    badgeText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
        letterSpacing: 1,
    },
});

export default SplashScreen;
