/**
 * Sikka - Biometric Lock Screen
 * Full-screen lock requiring fingerprint authentication
 */

import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';
import { useSecurity } from '../context/SecurityContext';
import { Icon } from './Icon';

export function BiometricLockScreen() {
    const { authenticate, biometricType } = useSecurity();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for fingerprint icon
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        // Auto-trigger authentication
        const timer = setTimeout(() => {
            handleAuthenticate();
        }, 500);

        return () => {
            pulse.stop();
            clearTimeout(timer);
        };
    }, []);

    const handleAuthenticate = async () => {
        await authenticate();
    };

    return (
        <View style={styles.container}>
            <Animated.View style={[
                styles.content,
                {
                    opacity: opacityAnim,
                    transform: [{ scale: scaleAnim }],
                }
            ]}>
                {/* App Logo */}
                <View style={styles.logoContainer}>
                    <Icon name="account-balance-wallet" size={64} color={COLORS.primary} />
                    <Text style={[styles.appName, { marginTop: SPACING.md }]}>Sikka</Text>
                </View>

                {/* Lock Message */}
                <Text style={styles.title}>App Locked</Text>
                <Text style={styles.subtitle}>
                    Use {biometricType} to unlock
                </Text>

                {/* Fingerprint Button */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        style={styles.fingerprintBtn}
                        onPress={handleAuthenticate}
                        activeOpacity={0.8}
                    >
                        <Icon name="fingerprint" size={48} color={COLORS.primary} />
                    </TouchableOpacity>
                </Animated.View>

                <Text style={styles.hint}>Tap to authenticate</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xxl * 2,
    },
    logo: {
        fontSize: 64,
        marginBottom: SPACING.md,
    },
    appName: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
    },
    title: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxl * 2,
        textAlign: 'center',
    },
    fingerprintBtn: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    fingerprintIcon: {
        fontSize: 48,
    },
    hint: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginTop: SPACING.xl,
    },
});

export default BiometricLockScreen;
