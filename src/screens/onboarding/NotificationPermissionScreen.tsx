/**
 * Sikka - Notification Permission Screen (Onboarding Step 4)
 * Requests notification listener permission for auto-tracking
 */

import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Platform,
    Alert,
    AppState
} from 'react-native';
// @ts-ignore
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';

export function NotificationPermissionScreen() {
    const { currentStep, updateData, goNext } = useOnboarding();
    const [permissionStatus, setPermissionStatus] = useState('denied');

    useEffect(() => {
        checkPermission();
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                checkPermission();
            }
        });

        return () => subscription.remove();
    }, []);

    const checkPermission = async () => {
        if (Platform.OS === 'android') {
            const status = await RNAndroidNotificationListener.getPermissionStatus();
            setPermissionStatus(status);
            if (status === 'granted') {
                updateData({ notificationPermissionGranted: true });
            }
        }
    };

    const handleGrantPermission = async () => {
        if (Platform.OS === 'android') {
            if (permissionStatus === 'denied') {
                Alert.alert(
                    "Enable Auto-Tracking",
                    "To track expenses automatically, Sikka needs to see bank notifications. Please find 'Sikka' in the next screen and enable it.",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Open Settings",
                            onPress: async () => {
                                RNAndroidNotificationListener.requestPermission();
                            }
                        }
                    ]
                );
            } else {
                // Already granted, just go next
                updateData({ notificationPermissionGranted: true });
                goNext();
            }
        } else {
            Alert.alert(
                'Not Available',
                'Automatic tracking involves reading notifications which is only available on Android. You can manually add transactions.',
                [{ text: 'Continue', onPress: () => goNext() }]
            );
        }
    };

    const handleSkip = () => {
        updateData({ notificationPermissionGranted: false });
        goNext();
    };

    return (
        <View style={styles.container}>
            <OnboardingProgress currentStep={currentStep} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Image */}
                <View style={styles.heroContainer}>
                    <View style={styles.heroBackground}>
                        <View style={styles.iconContainer}>
                            <Icon name="notifications-active" size={60} color={COLORS.primary} />
                            <View style={styles.badge}>
                                <Icon name="bolt" size={24} color={COLORS.background} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Title & Description */}
                <Text style={styles.title}>Automatic Tracking</Text>
                <Text style={styles.description}>
                    Sikka can automatically track your expenses by listening to legitimate bank notifications.
                </Text>

                {/* Privacy Note */}
                <View style={styles.privacyCard}>
                    <Icon name="security" size={24} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
                    <Text style={styles.privacyTitle}>100% Private & Secure</Text>
                    <Text style={styles.privacyText}>
                        We only process notifications from verified bank apps. Your data is processed locally on your device and never sent to any server.
                    </Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                        <Icon name="check-circle" size={20} color={COLORS.success} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.featureText}>Instant expense recording</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Icon name="check-circle" size={20} color={COLORS.success} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.featureText}>Smart categorization</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Icon name="check-circle" size={20} color={COLORS.success} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.featureText}>Works offline</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.grantButton, permissionStatus === 'granted' && styles.grantButtonSuccess]}
                    onPress={handleGrantPermission}
                    activeOpacity={0.8}
                >
                    <Text style={styles.grantButtonText}>
                        {permissionStatus === 'granted' ? 'Continue' : 'Enable Auto-Tracking'}
                    </Text>
                    {permissionStatus === 'granted' && <Icon name="arrow-forward" size={20} color={COLORS.background} style={{ marginLeft: SPACING.sm }} />}
                </TouchableOpacity>

                {permissionStatus !== 'granted' && (
                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipButtonText}>I'll track manually</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
    },
    heroContainer: {
        alignItems: 'center',
        marginVertical: SPACING.xxl,
    },
    heroBackground: {
        width: 160,
        height: 160,
        backgroundColor: 'rgba(34, 197, 94, 0.1)', // Primary color with low opacity
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: COLORS.warning,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.background,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    description: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    privacyCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    privacyTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    privacyText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    featuresList: {
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    featureText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
        fontWeight: '500',
    },
    footer: {
        padding: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    grantButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.xl,
        paddingVertical: SPACING.lg,
        marginBottom: SPACING.md,
    },
    grantButtonSuccess: {
        backgroundColor: COLORS.success,
    },
    grantButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.background,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    skipButtonText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
});
