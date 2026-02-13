/**
 * Sikka - Security Setup Screen (Onboarding Step 5)
 * Biometric unlock and backup location
 */

import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
} from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { useSecurity } from '../../context/SecurityContext';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';

export function SecuritySetupScreen() {
    const { currentStep, data, updateData, goBack, completeOnboarding } = useOnboarding();
    const { hasBiometricHardware, biometricType, setBiometricEnabled } = useSecurity();

    const handleBiometricToggle = async (value: boolean) => {
        // During onboarding, set biometric directly without verification prompt
        await setBiometricEnabled(value);
        updateData({ biometricEnabled: value });
    };

    const handleSelectBackupFolder = () => {
        Alert.alert(
            'Select Backup Location',
            'Choose where to save your backup files',
            [
                { text: 'Google Drive', onPress: () => updateData({ backupLocation: 'Google Drive' }) },
                { text: 'SD Card', onPress: () => updateData({ backupLocation: 'SD Card' }) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSealTheVault = async () => {
        try {
            await completeOnboarding();
        } catch (error) {
            Alert.alert('Error', 'Failed to complete setup. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Security Setup</Text>
                <View style={styles.placeholder} />
            </View>

            <OnboardingProgress currentStep={currentStep} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Text style={styles.title}>Secure Your Ledger</Text>
                <Text style={styles.subtitle}>
                    Finalize your security settings. Since Sikka is offline-first,
                    you are in full control of your data.
                </Text>

                {/* Biometric Toggle */}
                <View style={styles.biometricCard}>
                    <View style={styles.biometricIcon}>
                        <Icon name="fingerprint" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.biometricContent}>
                        <Text style={styles.biometricTitle}>Biometric Unlock</Text>
                        <Text style={styles.biometricSubtitle}>
                            Use {biometricType !== 'None' ? biometricType : 'FaceID / TouchID'}
                        </Text>
                    </View>
                    <Switch
                        value={data.biometricEnabled}
                        onValueChange={handleBiometricToggle}
                        trackColor={{ false: COLORS.surfaceLight, true: COLORS.primaryMuted }}
                        thumbColor={data.biometricEnabled ? COLORS.primary : COLORS.textMuted}
                        disabled={!hasBiometricHardware}
                    />
                </View>

                {/* No-Cloud Warning */}
                <View style={styles.warningCard}>
                    <View style={styles.warningHeader}>
                        <Icon name="cloud-off" size={20} color="#F87171" />
                        <Text style={styles.warningTitle}>No-Cloud Warning</Text>
                    </View>
                    <Text style={styles.warningText}>
                        Your data is stored <Text style={styles.boldText}>only on this device</Text>.
                        We do not upload your financial records to any cloud server.
                        If you lose this phone without a backup, your data is gone forever.
                    </Text>
                    <View style={styles.recommendationBox}>
                        <Icon name="warning" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.recommendationText}>
                            Recommended: Setup regular local backups
                        </Text>
                    </View>
                </View>

                {/* Backup Location */}
                <Text style={styles.sectionLabel}>Backup Location</Text>
                <TouchableOpacity
                    style={styles.backupCard}
                    onPress={handleSelectBackupFolder}
                    activeOpacity={0.7}
                >
                    <View style={styles.backupIcon}>
                        <Icon name="folder" size={24} color={COLORS.textMuted} />
                    </View>
                    <View style={styles.backupContent}>
                        <Text style={styles.backupTitle}>
                            {data.backupLocation || 'Select Backup Folder'}
                        </Text>
                        <Text style={styles.backupSubtitle}>Google Drive / SD Card</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
                <Text style={styles.backupNote}>
                    We recommend selecting a folder that automatically syncs with
                    your personal cloud storage for safety.
                </Text>
            </ScrollView>

            {/* Seal the Vault Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.sealButton}
                    onPress={handleSealTheVault}
                    activeOpacity={0.8}
                >
                    <Icon name="lock" size={18} color={COLORS.background} />
                    <Text style={styles.sealButtonText}>Seal the Vault</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingTop: 60,
        paddingBottom: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 24,
        color: COLORS.text,
    },
    headerTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxxl,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxl,
        lineHeight: 22,
    },
    biometricCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    biometricIcon: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    biometricIconText: {
        fontSize: 24,
    },
    biometricContent: {
        flex: 1,
    },
    biometricTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    biometricSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    warningCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    warningIcon: {
        fontSize: 20,
    },
    warningTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: '#F87171',
    },
    warningText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.md,
    },
    boldText: {
        fontWeight: '600',
        color: COLORS.text,
    },
    recommendationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    recommendationIcon: {
        fontSize: 14,
    },
    recommendationText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    sectionLabel: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    backupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    backupIcon: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    backupIconText: {
        fontSize: 24,
    },
    backupContent: {
        flex: 1,
    },
    backupTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    backupSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    backupArrow: {
        fontSize: 24,
        color: COLORS.textMuted,
    },
    backupNote: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginTop: SPACING.md,
        lineHeight: 20,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
        paddingTop: SPACING.lg,
    },
    sealButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.xl,
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    sealIcon: {
        fontSize: 18,
    },
    sealButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.background,
    },
});
