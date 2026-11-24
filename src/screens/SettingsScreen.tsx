/**
 * Sikka - Settings (v3 canvas "22 Settings")
 * Help "?" in the header; Capture (auto-capture coverage, voice notes, Sikku is
 * learning, nightly review); Privacy; Data (backup, Google Drive, erase with a
 * confirm sheet that offers a backup first).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, TextInput } from '../components/Typography';
import { Icon, IconName } from '../components/Icon';
import { Toggle, HelpButton, ConfirmSheet, BottomSheet, Button } from '../components/ui';
import { CustomModal, ModalAction, ModalType } from '../components/CustomModal';
import { useSecurity } from '../context/SecurityContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useNavigation } from '../context/NavigationContext';
import { usePrefs } from '../context/PrefsContext';
import { useTransactions } from '../context/TransactionsContext';
import { useAccounts } from '../context/AccountsContext';
import { useAppLifecycle } from '../context/AppLifecycleContext';
import { useBackup } from '../hooks/useBackup';
import { useRules } from '../hooks/useRules';
import { useSafeTop } from '../components/SafeScreen';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE } from '../constants/theme';
import { wipeDatabase } from '../database';
import { coverageThisMonth } from '../services/sms';
import { SMS_MODELS, deleteModel } from '../services/sms/modelManager';
import { releaseModel } from '../services/sms/aiParser';
import { scheduleNightlyReview } from '../services/notify';

const timeLabel = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export function SettingsScreen() {
    const { biometricEnabled, toggleBiometric, hasBiometricHardware, biometricType } = useSecurity();
    const { data: onboardingData, updateData } = useOnboarding();
    const { prefs, update } = usePrefs();
    const { transactions } = useTransactions();
    const { activeAccounts } = useAccounts();
    const rules = useRules();
    const { openScreen, openPrivacyPolicy, openAboutUs } = useNavigation();
    const { resetApp } = useAppLifecycle();
    const safeTop = useSafeTop();

    const [modal, setModal] = useState<{ title: string; message: string; type?: ModalType; icon?: IconName; actions: ModalAction[] } | null>(null);
    const showModal = (title: string, message: string, actions: ModalAction[], type: ModalType = 'default', icon?: IconName) =>
        setModal({ title, message, actions, type, icon });
    const { user, autoBackupEnabled, toggleDriveBackup, isSyncing, manualBackup } = useBackup({ showModal });

    const [coverage, setCoverage] = useState<number | null>(null);
    const [editingName, setEditingName] = useState(false);
    const [name, setName] = useState(onboardingData.userName);
    const [timeOpen, setTimeOpen] = useState(false);
    const [erase, setErase] = useState(false);
    const [help, setHelp] = useState(false);

    useEffect(() => {
        coverageThisMonth().then((c) => setCoverage(c.total ? c.pct : null)).catch(() => undefined);
    }, [transactions.length]);

    const autoFiled = transactions.filter((t) => t.autoFiled && !t.isDeleted).length;
    const right = autoFiled ? Math.max(0, Math.round(((autoFiled - prefs.fixes.length) / autoFiled) * 100)) : null;
    const payments = transactions.filter((t) => !t.isDeleted).length;
    const initial = (onboardingData.userName.trim()[0] || 'S').toUpperCase();

    const onBiometric = async () => {
        if (!hasBiometricHardware || biometricType === 'Not Set Up') {
            showModal(
                'Fingerprint not set up',
                'Set up a fingerprint or face unlock in your phone settings first.',
                [{ text: 'OK', onPress: () => setModal(null), style: 'primary' }],
                'warning',
            );
            return;
        }
        await toggleBiometric();
    };

    const eraseAll = useCallback(async () => {
        setErase(false);
        try {
            await releaseModel();
            for (const m of SMS_MODELS) await deleteModel(m).catch(() => undefined);
            await AsyncStorage.clear();
            await wipeDatabase();
            resetApp();
        } catch (e) {
            console.error('Erase failed', e);
            showModal('Could not erase', 'Something stopped the erase. Restart Sikka and try again.', [{ text: 'OK', onPress: () => setModal(null), style: 'primary' }], 'error');
        }
    }, [resetApp]);

    return (
        <ScrollView style={{ backgroundColor: COLORS.background }} contentContainerStyle={[styles.scroll, { paddingTop: safeTop + SPACING.sm }]} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">Settings</Text>
                <HelpButton onPress={() => setHelp(true)} />
            </View>

            <TouchableOpacity style={styles.profile} onPress={() => setEditingName(true)} accessibilityRole="button" accessibilityLabel="Edit your name" activeOpacity={0.85}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
                <View style={{ flex: 1 }}>
                    {editingName ? (
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            onBlur={() => { updateData({ userName: name.trim() }); setEditingName(false); }}
                            onSubmitEditing={() => { updateData({ userName: name.trim() }); setEditingName(false); }}
                            style={styles.nameInput}
                            accessibilityLabel="Your name"
                        />
                    ) : (
                        <Text style={styles.name}>{onboardingData.userName || 'Your name'}</Text>
                    )}
                    <Text style={styles.meta}>{prefs.streak.count}-day review streak</Text>
                </View>
                <Icon name="edit" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Section label="CAPTURE">
                <Row
                    icon="sms"
                    palette="groceries"
                    title="Auto-capture"
                    value={prefs.aiMode === 'none' ? 'Off' : coverage !== null ? `${coverage}% read` : 'On'}
                    onPress={() => openScreen({ name: 'captureSettings' })}
                />
                <Row icon="mic" palette="dining" title="Voice notes" value={prefs.voiceNotes ? 'Hinglish' : 'Off'} onPress={() => openScreen({ name: 'voiceSettings' })} />
                <Row
                    icon="school"
                    palette="fun"
                    title="Sikku is learning"
                    value={right !== null ? `${right}% right` : `${rules.length} rules`}
                    onPress={() => openScreen({ name: 'modelHealth' })}
                />
                <Row
                    icon="nightlight"
                    palette="transport"
                    title="Nightly review"
                    value={prefs.remindMode === 'app' ? 'Off' : timeLabel(prefs.nightlyAt)}
                    onPress={() => setTimeOpen(true)}
                    last
                />
            </Section>

            <Section label="PRIVACY">
                <Row
                    icon="fingerprint"
                    palette="groceries"
                    title="Fingerprint lock"
                    right={<Toggle label="Fingerprint lock" value={biometricEnabled} onValueChange={onBiometric} />}
                />
                <Row
                    icon="visibility-off"
                    palette="fun"
                    title="Hide balances"
                    right={<Toggle label="Hide balances" value={!!onboardingData.hideBalances} onValueChange={(v) => updateData({ hideBalances: v })} />}
                    last
                />
            </Section>

            <Section label="DATA">
                <Row
                    icon="backup"
                    palette="bills"
                    title="Backup & restore"
                    value={autoBackupEnabled ? 'Google Drive' : 'Phone only'}
                    onPress={() => openScreen({ name: 'backup' })}
                />
                {!user && (
                    <Row
                        icon="add-to-drive"
                        palette="transport"
                        title="Google Drive"
                        sub="Not connected · keep a copy off the phone"
                        right={
                            <TouchableOpacity onPress={() => toggleDriveBackup(true)} style={styles.connect} accessibilityRole="button" disabled={isSyncing}>
                                <Text style={styles.connectText}>{isSyncing ? '…' : 'Connect'}</Text>
                            </TouchableOpacity>
                        }
                    />
                )}
                <TouchableOpacity style={styles.erase} onPress={() => setErase(true)} accessibilityRole="button" accessibilityLabel="Erase all data on this phone. Asks to confirm.">
                    <Icon name="delete-forever" size={22} color={COLORS.error} />
                    <Text style={styles.eraseText}>Erase all data on this phone</Text>
                </TouchableOpacity>
            </Section>

            <Section label="ABOUT">
                <Row icon="policy" palette="bills" title="Privacy policy" onPress={openPrivacyPolicy} />
                <Row icon="info-outline" palette="transport" title="About Sikka" onPress={openAboutUs} last />
            </Section>

            {timeOpen && Platform.OS !== 'web' && (
                <DateTimePicker
                    mode="time"
                    value={(() => { const [h, m] = prefs.nightlyAt.split(':').map(Number); return new Date(2000, 0, 1, h, m); })()}
                    onChange={(e, d) => {
                        setTimeOpen(false);
                        if (e.type === 'set' && d) {
                            const nightlyAt = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            update({ nightlyAt });
                            void scheduleNightlyReview({ ...prefs, nightlyAt });
                        }
                    }}
                />
            )}

            <ConfirmSheet
                visible={erase}
                destructive
                title="Erase everything on this phone?"
                body={`${payments.toLocaleString('en-IN')} payments, ${activeAccounts.length} accounts, ${rules.length} rules and the AI model will be deleted.`}
                warning={autoBackupEnabled ? "This can't be undone." : "Your last backup is on this phone only, so it goes too. This can't be undone."}
                secondary={
                    autoBackupEnabled
                        ? { label: 'Back up now first', sub: 'Recommended · takes a few seconds', icon: 'cloud-upload', onPress: () => manualBackup() }
                        : { label: 'Back up to Google Drive first', sub: 'Recommended · takes about 20 s', icon: 'cloud-upload', onPress: () => { setErase(false); openScreen({ name: 'backup' }); } }
                }
                typeToConfirm="ERASE"
                confirmLabel="Erase all data"
                cancelLabel="Keep my data"
                onConfirm={eraseAll}
                onCancel={() => setErase(false)}
            />

            <BottomSheet visible={help} onClose={() => setHelp(false)} label="Help">
                <Text style={styles.helpTitle}>How Sikka works</Text>
                <HelpItem q="Where is my data?" a="Only on this phone, unless you turn on Google Drive backup. Backups are encrypted before they leave." />
                <HelpItem q="What does the AI read?" a="Only bank SMS with an amount. Personal messages and OTPs are skipped. The AI runs on the phone." />
                <HelpItem q="What is auto-filing?" a="When you name a sender once, the next similar SMS is filed for you. Change how sure Sikka must be in Sikku is learning." />
                <HelpItem q="A payment is missing" a="Open Review and tap Sync SMS with AI. If Sikka couldn't read a bank's SMS, teach it once." />
                <Button label="Got it" icon="check" onPress={() => setHelp(false)} />
            </BottomSheet>

            <CustomModal
                visible={!!modal}
                title={modal?.title ?? ''}
                message={modal?.message ?? ''}
                icon={modal?.icon}
                type={modal?.type}
                actions={modal?.actions ?? []}
                onClose={() => setModal(null)}
            />
        </ScrollView>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={{ gap: SPACING.sm }}>
            <Text style={styles.section}>{label}</Text>
            <View style={styles.group}>{children}</View>
        </View>
    );
}

function Row({
    icon, palette, title, sub, value, onPress, right, last,
}: {
    icon: IconName; palette: keyof typeof CATEGORY_PALETTE; title: string; sub?: string; value?: string; onPress?: () => void; right?: React.ReactNode; last?: boolean;
}) {
    const pair = CATEGORY_PALETTE[palette];
    const Wrap: any = onPress ? TouchableOpacity : View;
    return (
        <Wrap onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} activeOpacity={0.8} style={[styles.row, !last && styles.rowLine]}>
            <View style={[styles.rowIcon, { backgroundColor: pair.bg }]}><Icon name={icon} size={20} color={pair.fg} /></View>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{title}</Text>
                {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
            </View>
            {!!value && <Text style={styles.rowValue}>{value}</Text>}
            {right}
            {onPress && !right && <Icon name="chevron-right" size={22} color={COLORS.textSecondary} />}
        </Wrap>
    );
}

function HelpItem({ q, a }: { q: string; a: string }) {
    return (
        <View style={{ gap: 2 }}>
            <Text style={styles.helpQ}>{q}</Text>
            <Text style={styles.helpA}>{a}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 140, gap: SPACING.xl },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },
    profile: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, ...SHADOWS.sm },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.brand, borderWidth: 3, borderColor: COLORS.night, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 24, fontWeight: '800', color: COLORS.onBrand },
    name: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    nameInput: { fontSize: 20, fontWeight: '800', color: COLORS.text, paddingVertical: 0 },
    meta: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
    section: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    group: { backgroundColor: COLORS.surface, borderRadius: 26, paddingHorizontal: SPACING.lg, ...SHADOWS.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 64, paddingVertical: 10 },
    rowLine: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
    rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    rowSub: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    rowValue: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
    connect: { backgroundColor: COLORS.night, borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
    connectText: { fontSize: 14, fontWeight: '800', color: COLORS.onNight },
    erase: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 60 },
    eraseText: { fontSize: 16, fontWeight: '800', color: COLORS.error },
    helpTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    helpQ: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    helpA: { fontSize: 15, lineHeight: 21, color: COLORS.textSecondary },
});
