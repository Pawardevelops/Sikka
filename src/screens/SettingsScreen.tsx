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
    ActivityIndicator
} from 'react-native';

import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { useSecurity } from '../context/SecurityContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useNavigation } from '../context/NavigationContext';
import { useBackup } from '../hooks/useBackup';
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
        if (!onboardingData.userName) return <Icon name="person" size={28} color={COLORS.background} />;
        const names = onboardingData.userName.trim().split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return onboardingData.userName[0].toUpperCase();
    };

    return (
        <ScrollView
            style={[styles.scrollView, { backgroundColor: COLORS.background }]}
            contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop }]}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.screenTitle}>Settings</Text>

            {/* Profile Section */}
            <TouchableOpacity 
                style={styles.profileCard} 
                onPress={() => setEditingName(true)}
                activeOpacity={0.7}
            >
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
                        <>
                            <Text style={styles.profileName}>
                                {onboardingData.userName || 'Set your name'}
                            </Text>
                            <Text style={styles.profileSubtitle}>Tap to edit profile</Text>
                        </>
                    )}
                </View>
                {!editingName && <Icon name="qr-code" size={24} color={COLORS.primary} />}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Accounts/Regional */}
            <SettingItem 
                icon="attach-money" 
                title="Currency" 
                subtitle={`${currency.name} (${currency.symbol})`} 
                onPress={() => setShowCurrencyPicker(!showCurrencyPicker)} 
                hideBorder={showCurrencyPicker}
            />
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

            <SettingItem 
                icon="format-list-numbered" 
                title="Number Format" 
                subtitle={onboardingData.numberSystem === 'lakhs' ? '1,00,000 (Lakhs)' : '100,000 (Millions)'} 
                onPress={handleNumberSystemChange}
                rightElement={
                    <View style={styles.togglePill}>
                        <Text style={[styles.togglePillText, onboardingData.numberSystem === 'lakhs' && styles.togglePillTextActive]}>L</Text>
                        <Text style={[styles.togglePillText, onboardingData.numberSystem === 'millions' && styles.togglePillTextActive]}>M</Text>
                    </View>
                }
                hideBorder
            />

            <View style={styles.divider} />

            {/* Privacy & Security */}
            <SettingItem 
                icon="lock" 
                title="Fingerprint Lock" 
                subtitle={hasBiometricHardware ? `${biometricType} available` : 'Not available on this device'} 
                onPress={handleBiometricToggle}
                rightElement={
                    <Switch
                        value={biometricEnabled}
                        onValueChange={handleBiometricToggle}
                        disabled={!hasBiometricHardware || biometricType === 'Not Set Up' || isToggling}
                        trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                        thumbColor={biometricEnabled ? COLORS.primary : COLORS.textMuted}
                    />
                }
            />

            <SettingItem 
                icon="visibility-off" 
                title="Hide Balances" 
                subtitle="Mask amounts with **** on home screen" 
                onPress={() => handleHideBalancesToggle(!onboardingData.hideBalances)}
                rightElement={
                    <Switch
                        value={onboardingData.hideBalances}
                        onValueChange={handleHideBalancesToggle}
                        trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                        thumbColor={onboardingData.hideBalances ? COLORS.primary : COLORS.textMuted}
                    />
                }
                hideBorder
            />

            <View style={styles.divider} />

            {/* Notifications / Auto Track */}
            <SettingItem 
                icon="notifications" 
                title="Auto-Track SMS" 
                subtitle={onboardingData.notificationPermissionGranted ? 'Active' : 'Allow reading bank SMS to auto-add'} 
                onPress={handleNotificationSettings}
                rightElement={
                    <Switch
                        value={onboardingData.notificationPermissionGranted}
                        onValueChange={handleNotificationSettings}
                        trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                        thumbColor={onboardingData.notificationPermissionGranted ? COLORS.primary : COLORS.textMuted}
                    />
                }
                hideBorder
            />

            <View style={styles.divider} />

            {/* Backup */}
            <BackupSection showModal={showModal} />

            <View style={styles.divider} />

            {/* Help / About */}
            <SettingItem 
                icon="info-outline" 
                title="About Us" 
                subtitle="Version 1.0.0" 
                onPress={() => navigation.openAboutUs()}
            />
            <SettingItem 
                icon="gavel" 
                title="Privacy Policy" 
                subtitle="Read our policies" 
                onPress={() => navigation.openPrivacyPolicy()}
                hideBorder
            />

            <View style={styles.divider} />

            {/* Danger Zone */}
            <SettingItem 
                icon="restore" 
                title="Reset App Preferences" 
                subtitle="Restore default settings without losing data" 
                onPress={handleResetPreferences}
                iconColor={COLORS.secondary}
                titleColor={COLORS.secondary}
            />
            <SettingItem 
                icon="delete-outline" 
                title="Delete Account" 
                subtitle="Permanently erase all your data" 
                onPress={handleNuclearDelete}
                iconColor={COLORS.error}
                titleColor={COLORS.error}
                hideBorder
            />

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

// Helpers for WhatsApp style layout
interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    iconColor?: string;
    titleColor?: string;
    hideBorder?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, rightElement, iconColor, titleColor, hideBorder }: SettingItemProps) {
    const Component = onPress ? TouchableOpacity : View;
    return (
        <Component style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
                <Icon name={icon} size={28} color={iconColor || COLORS.textMuted} />
            </View>
            <View style={[styles.settingContent, !hideBorder && styles.settingBorder]}>
                <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, titleColor && { color: titleColor }]}>{title}</Text>
                    {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
                </View>
                {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
            </View>
        </Component>
    );
}

function BackupSection({ showModal }: { showModal: (title: string, message: string, actions: ModalAction[], type?: ModalType, icon?: string) => void }) {
    const {
        isSyncing,
        lastBackup,
        user,
        autoBackupEnabled,
        toggleDriveBackup,
        manualBackup,
        restoreBackup,
        exportLocalBackup
    } = useBackup({ showModal });

    return (
        <>
            <SettingItem 
                icon="save-alt" 
                title="Export Local Backup" 
                subtitle="Download your data to a file" 
                onPress={exportLocalBackup}
            />

            <SettingItem 
                icon="cloud-upload" 
                title="Google Drive Backup" 
                subtitle={user ? `Signed in as ${user.user.name}` : 'Sign in to safely backup data'} 
                onPress={() => {
                    // Don't toggle if syncing, otherwise do standard toggle
                    if (!isSyncing) toggleDriveBackup(!autoBackupEnabled);
                }}
                rightElement={
                    isSyncing ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Switch
                            value={autoBackupEnabled}
                            onValueChange={toggleDriveBackup}
                            trackColor={{ false: COLORS.border, true: COLORS.primaryMuted }}
                            thumbColor={autoBackupEnabled ? COLORS.primary : COLORS.textMuted}
                        />
                    )
                }
                hideBorder={!autoBackupEnabled}
            />

            {autoBackupEnabled && (
                <>
                    <SettingItem 
                        icon="backup" 
                        title="Backup Now" 
                        subtitle={`Last backup: ${lastBackup || 'Never'}`} 
                        onPress={() => manualBackup(false)} 
                        iconColor={COLORS.primary}
                    />

                    <SettingItem 
                        icon="settings-backup-restore" 
                        title="Restore Data from Backup" 
                        subtitle="Overwrite local data with Google Drive version" 
                        onPress={restoreBackup}
                        iconColor={COLORS.error}
                        hideBorder
                    />
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: COLORS.surface },
    scrollContent: { paddingBottom: 40 },
    screenTitle: { fontSize: 32, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md, paddingHorizontal: SPACING.xl },

    // Profile Card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.surface,
    },
    profileAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    profileAvatarText: {
        fontSize: 28,
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
        marginBottom: 4,
    },
    profileSubtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
    },
    editNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: SPACING.md,
    },
    nameInput: {
        flex: 1,
        fontSize: FONT_SIZE.xl,
        color: COLORS.text,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingVertical: SPACING.xs,
        fontWeight: '600'
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

    // Dividers
    divider: {
        height: 10,
        backgroundColor: COLORS.background, // Creates the distinct section gap like WhatsApp
        width: '100%',
    },

    // Setting Row
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
    },
    iconContainer: {
        width: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.lg,
        paddingRight: SPACING.xl,
    },
    settingBorder: {
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
    },
    settingTextContainer: {
        flex: 1,
        paddingRight: SPACING.md,
    },
    settingLabel: { fontSize: FONT_SIZE.lg, color: COLORS.text, marginBottom: 2 },
    settingSubtitle: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
    rightElement: {
        minWidth: 40,
        alignItems: 'flex-end',
    },

    // Currency Picker
    currencyPicker: {
        backgroundColor: COLORS.surface,
        paddingLeft: 72, // Align with text
    },
    currencyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingRight: SPACING.xl,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
    },
    currencyOptionActive: {
        backgroundColor: COLORS.primaryMuted,
    },
    currencySymbol: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.text,
        width: 32,
    },
    currencyTextContainer: {
        flex: 1,
    },
    currencyCode: { fontSize: FONT_SIZE.md, color: COLORS.text },
    currencyName: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },

    // Toggle Pill
    togglePill: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
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

    bottomSpacer: {
        height: 100,
        backgroundColor: COLORS.background,
    },
});

export default SettingsScreen;
