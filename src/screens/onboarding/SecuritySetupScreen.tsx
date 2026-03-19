/**
 * Sikka - Security Setup Screen (Onboarding Step 3)
 * Biometric unlock and backup location
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { useSecurity } from '../../context/SecurityContext';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { useBackup } from '../../hooks/useBackup';
import { CustomModal, ModalAction, ModalType } from '../../components/CustomModal';

export function SecuritySetupScreen() {
    const { currentStep, data, updateData, goBack, completeOnboarding } = useOnboarding();
    const { hasBiometricHardware, biometricType, setBiometricEnabled } = useSecurity();

    // Modal State for Backup
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title: string;
        message: string;
        icon?: string;
        type?: ModalType;
        actions: ModalAction[];
    }>({
        title: '',
        message: '',
        actions: [],
    });

    const showModal = (
        title: string,
        message: string,
        actions: ModalAction[],
        type: ModalType = 'default',
        icon?: string
    ) => {
        setModalConfig({ title, message, actions, type, icon });
        setModalVisible(true);
    };

    const {
        isSyncing,
        user,
        autoBackupEnabled,
        toggleDriveBackup,
    } = useBackup({ showModal });

    const handleBiometricToggle = async (value: boolean) => {
        // During onboarding, set biometric directly without verification prompt
        await setBiometricEnabled(value);
        updateData({ biometricEnabled: value });
    };

    const handleImportPress = () => {
        Alert.alert('Import Backup', 'This feature is currently in development. Stay tuned!');
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

                {/* Account Sync Section */}
                <Text style={styles.sectionLabel}>Account Sync</Text>
                
                {/* Google Drive Card */}
                <View style={styles.syncCard}>
                    <View style={styles.syncIconContainer}>
                        <Icon name="cloud-upload" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.syncContent}>
                        <Text style={styles.syncTitle}>Google Drive Sync</Text>
                        <Text style={styles.syncSubtitle} numberOfLines={1}>
                            {user ? `Connected: ${user.user.name}` : 'Continuously backup your data'}
                        </Text>
                    </View>
                    {isSyncing ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Switch
                            value={autoBackupEnabled}
                            onValueChange={toggleDriveBackup}
                            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primaryMuted }}
                            thumbColor={autoBackupEnabled ? COLORS.primary : COLORS.textMuted}
                        />
                    )}
                </View>

                {/* Import Data Card */}
                <TouchableOpacity 
                    style={styles.syncCard} 
                    onPress={handleImportPress}
                    activeOpacity={0.7}
                >
                    <View style={[styles.syncIconContainer, { backgroundColor: COLORS.surfaceLight }]}>
                        <Icon name="file-download" size={24} color={COLORS.textMuted} />
                    </View>
                    <View style={styles.syncContent}>
                        <Text style={styles.syncTitle}>Import Existing Data</Text>
                        <Text style={styles.syncSubtitle}>Coming Soon</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>

                <View style={{ height: SPACING.xl }} />

                {/* No-Cloud Warning */}
                <View style={styles.warningCard}>
                    <View style={styles.warningHeader}>
                        <Icon name="cloud-off" size={20} color="#F87171" />
                        <Text style={styles.warningTitle}>Offline-First Policy</Text>
                    </View>
                    <Text style={styles.warningText}>
                        Your financial records are stored <Text style={styles.boldText}>only on this device</Text>.
                        We do not store your data on our servers.
                    </Text>
                    <View style={styles.recommendationBox}>
                        <Icon name="verified-user" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.recommendationText}>
                            Sync enables cross-device tracking safely
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <CustomModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                icon={modalConfig.icon}
                type={modalConfig.type}
                actions={modalConfig.actions}
                onClose={() => setModalVisible(false)}
            />

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
    syncCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    syncIconContainer: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    syncContent: {
        flex: 1,
    },
    syncTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    syncSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
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
    sealButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.background,
    },
});
