/**
 * Sikka - Splash Screen Component
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { Icon } from './Icon';

interface SplashScreenProps {
    onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 2500,
            delay: 300,
            useNativeDriver: false,
        }).start(() => {
            setTimeout(onFinish, 300);
        });
    }, []);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 120],
    });

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.gradientOverlay} />
            <Animated.View
                style={[
                    styles.content,
                    { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                ]}
            >
                <View style={styles.logoBox}>
                    <Icon name="currency-rupee" size={48} color={COLORS.primary} />
                </View>
                <Text style={styles.appName}>S I K K A</Text>
            </Animated.View>
            <View style={styles.bottomSection}>
                <View style={styles.progressContainer}>
                    <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
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
        backgroundColor: '#0A0F14',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientOverlay: {
        position: 'absolute',
        top: '30%',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: COLORS.primary,
        opacity: 0.05,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoBox: {
        width: 100,
        height: 100,
        borderRadius: BORDER_RADIUS.xxl,
        backgroundColor: '#1A2530',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        marginBottom: SPACING.xxl,
    },
    logoIcon: {
        fontSize: 48,
        color: COLORS.primary,
        fontWeight: '600',
    },
    appName: {
        fontSize: FONT_SIZE.xxxl,
        fontWeight: '300',
        color: COLORS.text,
        letterSpacing: 8,
    },
    bottomSection: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
    progressContainer: {
        width: 120,
        height: 4,
        backgroundColor: '#1A2530',
        borderRadius: 2,
        marginBottom: SPACING.xxxl,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
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
        backgroundColor: '#1A2530',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: '#2A3540',
    },
    lockIcon: {
        fontSize: FONT_SIZE.sm,
        marginRight: SPACING.sm,
    },
    badgeText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
        letterSpacing: 1,
    },
});

export default SplashScreen;
