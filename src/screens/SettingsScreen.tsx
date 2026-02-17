/**
 * Sikka - Settings Screen
 * App settings including profile, currency, security, and preferences
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Switch,
    TextInput,
} from 'react-native';

import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { useSecurity } from '../context/SecurityContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useNavigation } from '../context/NavigationContext';
import { useBackup } from '../hooks/useBackup';
import { ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';
import { CustomModal, ModalAction, ModalType } from '../components/CustomModal';

import { wipeDatabase } from '../database';
import { useAppLifecycle } from '../context/AppLifecycleContext';

export function SettingsScreen() {
    const { currency, setCurrency } = useCurrency();
    const {
        biometricEnabled,
        toggleBiometric,
        hasBiometricHardware,
        biometricType
    } = useSecurity();
    const { data: onboardingData, updateData, resetPreferences } = useOnboarding();
    const [isToggling, setIsToggling] = useState(false);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState(onboardingData.userName);
    const safeTop = useSafeTop();
    const navigation = useNavigation();
    const { resetApp } = useAppLifecycle();

    // Modal State
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

    const handleNotificationSettings = () => {
        showModal(
            "Notification Access",
            "To change notification access, please go to your device settings > Apps > Special App Access > Notification Access > Sikka.",
            [{ text: "OK", onPress: () => setModalVisible(false), style: 'primary' }],
            'info'
        );
    };

    const handleBiometricToggle = async () => {
        if (isToggling) return;

        if (!hasBiometricHardware) {
            showModal(
                'Not Available',
                'Your device does not support biometric authentication.',
                [{ text: 'OK', onPress: () => setModalVisible(false), style: 'primary' }],
                'warning'
            );
            return;
        }

        if (biometricType === 'Not Set Up') {
            showModal(
                'Not Enrolled',
                'Please set up fingerprint or face recognition in your device settings first.',
                [{ text: 'OK', onPress: () => setModalVisible(false), style: 'primary' }],
                'warning'
            );
            return;
        }

        setIsToggling(true);
        const success = await toggleBiometric();
        setIsToggling(false);

        if (!success && !biometricEnabled) {
            showModal(
                'Authentication Failed',
                'Could not enable biometric lock. Please try again.',
                [{ text: 'OK', onPress: () => setModalVisible(false), style: 'primary' }],
                'error'
            );
        }
    };

    const handleSaveName = () => {
        updateData({ userName: tempName });
        setEditingName(false);
    };

    const handleHideBalancesToggle = (value: boolean) => {
        updateData({ hideBalances: value });
    };

    const handleNumberSystemChange = () => {
        const newSystem = onboardingData.numberSystem === 'lakhs' ? 'millions' : 'lakhs';
        updateData({ numberSystem: newSystem });
    };

    const handleResetPreferences = () => {
        showModal(
            'Reset Preferences',
            'This will reset settings like currency, balance visibility, and biometrics. Your data will NOT be deleted.',
            [
                { text: 'Cancel', onPress: () => setModalVisible(false), style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await resetPreferences();
                        setModalVisible(false);
                        // Brief delay for modal animation
                        setTimeout(() => {
                            showModal('Success', 'Preferences have been reset.', [{ text: 'OK', onPress: () => setModalVisible(false), style: 'primary' }], 'success');
                        }, 300);
                    }
                }
            ],
            'warning'
        );
    };

    const handleNuclearDelete = () => {
        showModal(
            'Nuclear Delete',
            '⚠️ ARE YOU SURE? ⚠️\n\nThis will PERMANENTLY DELETE ALL your transactions, accounts, and settings. This action CANNOT be undone.',
            [
                { text: 'Cancel', onPress: () => setModalVisible(false), style: 'cancel' },
                {
                    text: 'DELETE EVERYTHING',
                    style: 'destructive',
                    onPress: () => {
                        setModalVisible(false);
                        setTimeout(() => {
                            showModal(
                                'Final Confirmation',
                                'Type "DELETE" to confirm (just kidding, press Confirm to wipe).',
                                [
                                    { text: 'Cancel', onPress: () => setModalVisible(false), style: 'cancel' },
                                    {
                                        text: 'Confirm Wipe',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                setModalVisible(false);
                                                await wipeDatabase();
                                                resetApp(); // Remount app to clear all state
                                            } catch (error) {
                                                setModalVisible(false);
                                                console.error('Wipe failed:', error);
                                                setTimeout(() => {
                                                    showModal('Error', 'Failed to wipe data.', [{ text: 'OK', onPress: () => setModalVisible(false) }], 'error');
                                                }, 300);
                                            }
                                        }
                                    }
                                ],
                                'error'
                            );
                        }, 300);
                    }
                }
            ],
            'error'
        );
    };

    const getUserInitials = () => {
        if (!onboardingData.userName) return <Icon name="person" size={24} color={COLORS.background} />;
        const names = onboardingData.userName.trim().split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return onboardingData.userName[0].toUpperCase();
    };

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop }]}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.screenTitle}>Settings</Text>

            {/* Profile Section */}
            <View style={styles.profileCard}>
                <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>{getUserInitials()}</Text>
                </View>
                <View style={styles.profileInfo}>
                    {editingName ? (
                        <View style={styles.editNameContainer}>
                            <TextInput
                                style={styles.nameInput}
                                value={tempName}
                                onChangeText={setTempName}
                                placeholder="Your name"
                                placeholderTextColor={COLORS.textMuted}
                                autoFocus
                            />
                            <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName}>
                                <Text style={styles.saveNameBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setEditingName(true)}>
                            <Text style={styles.profileName}>
                                {onboardingData.userName || 'Set your name'}
                            </Text>
                            <Text style={styles.profileSubtitle}>Tap to edit profile</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Security Section */}
            <Text style={styles.sectionTitle}>SECURITY</Text>
            <View style={styles.settingsCard}>
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Icon name="lock" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Fingerprint Lock</Text>
                            <Text style={styles.settingSubtitle}>
                                {hasBiometricHardware
                                    ? `${biometricType} available`
                                    : 'Not available on this device'}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={biometricEnabled}
                        onValueChange={handleBiometricToggle}
                        disabled={!hasBiometricHardware || biometricType === 'Not Set Up' || isToggling}
                        trackColor={{
                            false: COLORS.border,
                            true: COLORS.primaryMuted
                        }}
                        thumbColor={biometricEnabled ? COLORS.primary : COLORS.textMuted}
                    />
                </View>
                <View style={[styles.settingRow, styles.lastRow]}>
                    <View style={styles.settingInfo}>
                        <Icon name="visibility" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Hide Balances</Text>
                            <Text style={styles.settingSubtitle}>Mask amounts with ****</Text>
                        </View>
                    </View>
                    <Switch
                        value={onboardingData.hideBalances}
                        onValueChange={handleHideBalancesToggle}
                        trackColor={{
                            false: COLORS.border,
                            true: COLORS.primaryMuted
                        }}
                        thumbColor={onboardingData.hideBalances ? COLORS.primary : COLORS.textMuted}
                    />
                </View>
            </View>

            {/* Regional Settings */}
            <Text style={styles.sectionTitle}>REGIONAL</Text>
            <View style={styles.settingsCard}>
                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                >
                    <View style={styles.settingInfo}>
                        <Icon name="attach-money" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Currency</Text>
                            <Text style={styles.settingSubtitle}>{currency.name} ({currency.symbol})</Text>
                        </View>
                    </View>
                    <Icon name={showCurrencyPicker ? "arrow-drop-up" : "arrow-drop-down"} size={24} color={COLORS.textMuted} />
                </TouchableOpacity>

                {showCurrencyPicker && (
                    <View style={styles.currencyPicker}>
                        {CURRENCIES.map((curr) => (
                            <TouchableOpacity
                                key={curr.code}
                                style={[
                                    styles.currencyOption,
                                    currency.code === curr.code && styles.currencyOptionActive,
                                ]}
                                onPress={() => {
                                    setCurrency(curr);
                                    setShowCurrencyPicker(false);
                                }}
                            >
                                <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                                <View style={styles.currencyTextContainer}>
                                    <Text style={styles.currencyCode}>{curr.code}</Text>
                                    <Text style={styles.currencyName}>{curr.name}</Text>
                                </View>
                                {currency.code === curr.code && (
                                    <Icon name="check" size={20} color={COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TouchableOpacity style={[styles.settingRow, styles.lastRow]} onPress={handleNumberSystemChange}>
                    <View style={styles.settingInfo}>
                        <Icon name="format-list-numbered" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Number Format</Text>
                            <Text style={styles.settingSubtitle}>
                                {onboardingData.numberSystem === 'lakhs' ? '1,00,000 (Lakhs)' : '100,000 (Millions)'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.togglePill}>
                        <Text style={[
                            styles.togglePillText,
                            onboardingData.numberSystem === 'lakhs' && styles.togglePillTextActive
                        ]}>L</Text>
                        <Text style={[
                            styles.togglePillText,
                            onboardingData.numberSystem === 'millions' && styles.togglePillTextActive
                        ]}>M</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Automation */}
            <Text style={styles.sectionTitle}>AUTOMATION</Text>
            <View style={styles.settingsCard}>
                <TouchableOpacity style={[styles.settingRow, styles.lastRow]} onPress={handleNotificationSettings}>
                    <View style={styles.settingInfo}>
                        <Icon name="notifications-active" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Auto-Track Transactions</Text>
                            <Text style={styles.settingSubtitle}>
                                {onboardingData.notificationPermissionGranted
                                    ? 'Active'
                                    : 'Read bank SMS/Notifications'}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={onboardingData.notificationPermissionGranted}
                        onValueChange={handleNotificationSettings}
                        trackColor={{
                            false: COLORS.border,
                            true: COLORS.primaryMuted
                        }}
                        thumbColor={onboardingData.notificationPermissionGranted ? COLORS.primary : COLORS.textMuted}
                    />
                </TouchableOpacity>
            </View>

            {/* Data & Backup */}
            <Text style={styles.sectionTitle}>DATA & BACKUP</Text>
            <BackupSection />

            {/* About Section */}
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.settingsCard}>
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Icon name="info" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.settingLabel}>Version</Text>
                    </View>
                    <Text style={styles.settingValue}>1.0.0</Text>
                </View>
                <TouchableOpacity style={styles.settingRow} onPress={() => navigation.openAboutUs()}>
                    <View style={styles.settingInfo}>
                        <Icon name="info-outline" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.settingLabel}>About Us</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.settingRow, styles.lastRow]} onPress={() => navigation.openPrivacyPolicy()}>
                    <View style={styles.settingInfo}>
                        <Icon name="policy" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.settingLabel}>Privacy Policy</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Danger Zone */}
            <Text style={styles.sectionTitle}>DANGER ZONE</Text>
            <View style={styles.settingsCard}>
                <TouchableOpacity
                    style={[styles.settingRow, styles.dangerRow]}
                    onPress={handleResetPreferences}
                >
                    <View style={styles.settingInfo}>
                        <Icon name="restore" size={24} color={COLORS.secondary} style={{ marginRight: SPACING.md }} />
                        <Text style={[styles.dangerLabel, { color: COLORS.secondary }]}>Reset App Preferences</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.settingRow, styles.dangerRow, styles.lastRow]}
                    onPress={handleNuclearDelete}
                >
                    <View style={styles.settingInfo}>
                        <Icon name="delete-forever" size={24} color={COLORS.error} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.dangerLabel}>NUCLEAR DELETE (Wipe Data)</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacer} />

            {/* Custom Modal */}
            <CustomModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                icon={modalConfig.icon}
                type={modalConfig.type}
                actions={modalConfig.actions}
                onClose={() => setModalVisible(false)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
    screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xl },

    // Profile Card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xxl,
    },
    profileAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    profileAvatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.background,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '600',
        color: COLORS.text,
    },
    profileSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    editNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameInput: {
        flex: 1,
        fontSize: FONT_SIZE.lg,
        color: COLORS.text,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.primary,
        paddingVertical: SPACING.xs,
    },
    saveNameBtn: {
        marginLeft: SPACING.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
    },
    saveNameBtnText: {
        color: COLORS.background,
        fontWeight: '600',
    },

    // Section
    sectionTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: SPACING.md,
        marginTop: SPACING.sm,
    },

    // Settings Card
    settingsCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.xl,
        overflow: 'hidden',
    },

    // Setting Row
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingIcon: { fontSize: 20, marginRight: SPACING.md },
    settingLabel: { fontSize: FONT_SIZE.md, fontWeight: '500', color: COLORS.text },
    settingSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
    settingArrow: { fontSize: FONT_SIZE.lg, color: COLORS.textMuted },
    settingValue: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
    lastRow: { borderBottomWidth: 0 },

    // Currency Picker
    currencyPicker: {
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    currencyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    currencyOptionActive: {
        backgroundColor: COLORS.primaryMuted,
    },
    currencySymbol: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: COLORS.primary,
        width: 36,
        textAlign: 'center',
        marginRight: SPACING.md,
    },
    currencyTextContainer: {
        flex: 1,
    },
    currencyCode: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
    currencyName: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
    checkmark: { fontSize: 18, color: COLORS.primary, fontWeight: '700' },

    // Toggle Pill
    togglePill: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: 4,
    },
    togglePillText: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
        borderRadius: BORDER_RADIUS.sm,
    },
    togglePillTextActive: {
        backgroundColor: COLORS.primary,
        color: COLORS.background,
    },

    // Danger Zone
    dangerRow: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    dangerLabel: {
        fontSize: FONT_SIZE.md,
        fontWeight: '500',
        color: '#EF4444',
    },

    bottomSpacer: {
        height: 100,
    },
});

function BackupSection() {
    const {
        isSyncing,
        lastBackup,
        user,
        autoBackupEnabled,
        toggleDriveBackup,
        manualBackup,
        restoreBackup
    } = useBackup();

    return (
        <View style={styles.settingsCard}>
            {/* Auto Backup Toggle */}
            <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                    <Icon name="cloud-queue" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                    <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Google Drive Backup</Text>
                        <Text style={styles.settingSubtitle}>
                            {user ? `Signed in as ${user.user.name}` : 'Sign in to sync data'}
                        </Text>
                    </View>
                </View>
                {isSyncing ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                    <Switch
                        value={autoBackupEnabled}
                        onValueChange={toggleDriveBackup}
                        trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                        thumbColor={autoBackupEnabled ? COLORS.primary : COLORS.textMuted}
                    />
                )}
            </View>

            {/* Manual Actions (Only if signed in) */}
            {autoBackupEnabled && (
                <>
                    <TouchableOpacity style={styles.settingRow} onPress={manualBackup} disabled={isSyncing}>
                        <View style={styles.settingInfo}>
                            <Icon name="backup" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Backup Now</Text>
                                <Text style={styles.settingSubtitle}>
                                    Last backup: {lastBackup || 'Never'}
                                </Text>
                            </View>
                        </View>
                        <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.settingRow, styles.lastRow]} onPress={restoreBackup} disabled={isSyncing}>
                        <View style={styles.settingInfo}>
                            <Icon name="settings-backup-restore" size={24} color={COLORS.error} style={{ marginRight: SPACING.md }} />
                            <View style={styles.settingTextContainer}>
                                <Text style={[styles.settingLabel, { color: COLORS.error }]}>Restore Data</Text>
                                <Text style={styles.settingSubtitle}>Overwrite local data</Text>
                            </View>
                        </View>
                        <Icon name="warning" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

export default SettingsScreen;
