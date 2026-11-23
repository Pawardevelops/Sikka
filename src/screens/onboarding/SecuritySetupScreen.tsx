/**
 * Sikka - Seal the vault (Onboarding 4 of 4)
 * Design: design-system/screens/Security-v2.html
 * Fingerprint unlock + optional encrypted Drive backup.
 */

import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Typography';
import { useOnboarding, ONBOARDING_STEPS } from '../../context/OnboardingContext';
import { useSecurity } from '../../context/SecurityContext';
import { Icon, IconName } from '../../components/Icon';
import { COLORS, SPACING, CATEGORY_PALETTE } from '../../constants/theme';
import { useBackup } from '../../hooks/useBackup';
import { CustomModal, ModalAction, ModalType } from '../../components/CustomModal';
import { Button, IconButton, StepDots, Toggle } from '../../components/ui';

export function SecuritySetupScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, data, updateData, goBack, completeOnboarding } = useOnboarding();
    const { hasBiometricHardware, biometricType, setBiometricEnabled } = useSecurity();
    const [sealing, setSealing] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title: string;
        message: string;
        icon?: IconName;
        type?: ModalType;
        actions: ModalAction[];
    }>({ title: '', message: '', actions: [] });

    const showModal = (title: string, message: string, actions: ModalAction[], type: ModalType = 'default', icon?: IconName) => {
        setModalConfig({ title, message, actions, type, icon });
        setModalVisible(true);
    };

    const { isSyncing, user, autoBackupEnabled, toggleDriveBackup } = useBackup({ showModal });

    const handleBiometricToggle = async (value: boolean) => {
        await setBiometricEnabled(value);
        updateData({ biometricEnabled: value });
    };

    const handleSeal = async () => {
        setSealing(true);
        try {
            await completeOnboarding();
        } catch {
            Alert.alert('Could not finish setup', 'Please try again.');
            setSealing(false);
        }
    };

    const unlockName = biometricType && biometricType !== 'None' && biometricType !== 'Not Set Up' ? biometricType : 'Fingerprint';

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" label="Back" onPress={goBack} iconSize={26} />
                <View style={{ flex: 1 }}><StepDots total={ONBOARDING_STEPS} current={currentStep} /></View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Night hero with rings and the lime fingerprint */}
                <View style={styles.vault} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                    <View style={[styles.ring, { width: 280, height: 280, borderColor: '#2E2B24' }]} />
                    <View style={[styles.ring, { width: 200, height: 200, borderColor: '#3A362E' }]} />
                    <View style={[styles.speck, { left: 24, top: 24, width: 34, height: 34, backgroundColor: CATEGORY_PALETTE.dining.bg }]} />
                    <View style={[styles.speck, { right: 30, bottom: 26, width: 22, height: 22, backgroundColor: CATEGORY_PALETTE.fun.bg }]} />
                    <View style={styles.vaultCoin}><Icon name="fingerprint" size={56} color={COLORS.onBrand} /></View>
                </View>

                <View>
                    <Text style={styles.title} accessibilityRole="header">Seal the vault</Text>
                    <Text style={styles.body}>Your ledger lives only on this phone. Lock it.</Text>
                </View>

                <View style={[styles.row, { backgroundColor: CATEGORY_PALETTE.groceries.bg }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{unlockName} unlock</Text>
                        <Text style={[styles.rowMeta, { color: CATEGORY_PALETTE.groceries.fg }]}>
                            {hasBiometricHardware ? 'Every time Sikka opens' : 'Not available on this device'}
                        </Text>
                    </View>
                    <Toggle
                        label={`${unlockName} unlock`}
                        value={data.biometricEnabled}
                        onValueChange={handleBiometricToggle}
                        disabled={!hasBiometricHardware}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.row, { backgroundColor: CATEGORY_PALETTE.transport.bg }]}
                    onPress={() => toggleDriveBackup(!autoBackupEnabled)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Encrypted Drive backup"
                >
                    <View style={styles.rowIcon}><Icon name="cloud-queue" size={22} color={CATEGORY_PALETTE.transport.fg} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>Encrypted Drive backup</Text>
                        <Text style={[styles.rowMeta, { color: CATEGORY_PALETTE.transport.fg }]} numberOfLines={1}>
                            {user ? `On · ${user.user.email ?? user.user.name}` : 'Optional · only you hold the key'}
                        </Text>
                    </View>
                    {isSyncing ? (
                        <ActivityIndicator color={COLORS.text} />
                    ) : (
                        <View style={styles.pill}><Text style={styles.pillText}>{autoBackupEnabled ? 'On' : 'Set up'}</Text></View>
                    )}
                </TouchableOpacity>
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

            <Button label="Seal the vault" icon="lock" onPress={handleSeal} loading={sealing} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: 14, paddingBottom: SPACING.lg },

    vault: { height: 210, borderRadius: 34, backgroundColor: COLORS.night, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', borderRadius: 999, borderWidth: 2 },
    speck: { position: 'absolute', borderRadius: 999 },
    vaultCoin: { width: 104, height: 104, borderRadius: 52, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },

    title: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },
    body: { fontSize: 15, color: COLORS.textSecondary, marginTop: 6 },

    row: { borderRadius: 26, paddingVertical: 14, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    rowIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    rowMeta: { fontSize: 13, fontWeight: '600' },
    pill: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
    pillText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
});
