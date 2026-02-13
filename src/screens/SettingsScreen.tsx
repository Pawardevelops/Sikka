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
    Alert,
    TextInput,
    Platform,
} from 'react-native';
// @ts-ignore
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { useSecurity } from '../context/SecurityContext';
import { useOnboarding } from '../context/OnboardingContext';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';

export function SettingsScreen() {
    const { currency, setCurrency } = useCurrency();
    const {
        biometricEnabled,
        toggleBiometric,
        hasBiometricHardware,
        biometricType
    } = useSecurity();
    const { data: onboardingData, updateData, resetOnboarding } = useOnboarding();
    const [isToggling, setIsToggling] = useState(false);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState(onboardingData.userName);
    const safeTop = useSafeTop();

    const handleNotificationSettings = () => {
        Alert.alert(
            "Notification Access",
            "To change notification access, please go to your device settings > Apps > Special App Access > Notification Access > Sikka.",
            [{ text: "OK" }]
        );
    };
    const handleBiometricToggle = async () => {
        if (isToggling) return;

        if (!hasBiometricHardware) {
            Alert.alert(
                'Not Available',
                'Your device does not support biometric authentication.',
                [{ text: 'OK' }]
            );
            return;
        }

        if (biometricType === 'Not Set Up') {
            Alert.alert(
                'Not Enrolled',
                'Please set up fingerprint or face recognition in your device settings first.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsToggling(true);
        const success = await toggleBiometric();
        setIsToggling(false);

        if (!success && !biometricEnabled) {
            Alert.alert(
                'Authentication Failed',
                'Could not enable biometric lock. Please try again.',
                [{ text: 'OK' }]
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

    const handleResetOnboarding = () => {
        Alert.alert(
            'Reset App',
            'This will reset all your preferences and show the onboarding flow again. Your accounts and transactions will NOT be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await resetOnboarding();
                    }
                }
            ]
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
            <View style={styles.settingsCard}>
                <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Icon name="file-upload" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.settingLabel}>Export Data</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Icon name="file-download" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.settingLabel}>Import Data</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.settingRow, styles.lastRow]}>
                    <View style={styles.settingInfo}>
                        <Icon name="cloud-upload" size={24} color={COLORS.text} style={{ marginRight: SPACING.md }} />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Backup Location</Text>
                            <Text style={styles.settingSubtitle}>
                                {onboardingData.backupLocation || 'Not configured'}
                            </Text>
                        </View>
                    </View>
                    <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>

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
                <TouchableOpacity style={[styles.settingRow, styles.lastRow]}>
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
                    style={[styles.settingRow, styles.dangerRow, styles.lastRow]}
                    onPress={handleResetOnboarding}
                >
                    <View style={styles.settingInfo}>
                        <Icon name="restore" size={24} color={COLORS.error} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.dangerLabel}>Reset App Preferences</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacer} />
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

export default SettingsScreen;
