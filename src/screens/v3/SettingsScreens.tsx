/**
 * Settings detail screens (v3 canvas section 04):
 *   Auto-capture settings · Voice notes · Backup & restore
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, PermissionsAndroid, Platform, Linking } from 'react-native';
import { Text, TextInput } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { Button, Chip, Segmented, Toggle, ProgressBar } from '../../components/ui';
import { CustomModal, ModalAction, ModalType } from '../../components/CustomModal';
import { SmsModelPicker } from '../../components/SmsModelPicker';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getPaletteKey } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { usePrefs, RemindMode } from '../../context/PrefsContext';
import { useTransactions, CATEGORY_LABELS } from '../../context/TransactionsContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { useBackup } from '../../hooks/useBackup';
import { coverageThisMonth, unreadBankSms } from '../../services/sms';
import { KNOWN_BANKS, bankName } from '../../services/sms/extract';
import { loadLearnedFormats } from '../../services/sms/learned';
import { scheduleNightlyReview } from '../../services/notify';
import { voiceModelState, downloadVoiceModel, VoiceModelState, VOICE_MODEL_MB } from '../../services/voice';
import { TransactionCategory } from '../../types';
import { Frame, frameStyles } from './Frame';

// ─── Auto-capture settings ────────────────────────────────────────────
export function CaptureSettingsScreen() {
    const { openScreen } = useNavigation();
    const { prefs, update } = usePrefs();
    const { transactions } = useTransactions();
    const [coverage, setCoverage] = useState<{ read: number; total: number; pct: number } | null>(null);
    const [toTeach, setToTeach] = useState(0);
    const [taught, setTaught] = useState<string[]>([]);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const caught = transactions.filter((t) => !t.isDeleted && t.smsBody && t.timestamp >= monthStart).length;

    useEffect(() => {
        coverageThisMonth().then(setCoverage).catch(() => undefined);
        unreadBankSms().then((m) => setToTeach(m.length)).catch(() => undefined);
        loadLearnedFormats().then((l) => setTaught(Array.from(new Set(l.map((f) => bankName(f.sender))))));
    }, []);

    const setSms = async (on: boolean) => {
        if (!on) {
            update({ aiMode: 'none' });
            return;
        }
        if (Platform.OS === 'android') {
            const r = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, PermissionsAndroid.PERMISSIONS.READ_SMS]);
            if (Object.values(r).some((x) => x === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) Linking.openSettings();
            if (!Object.values(r).every((x) => x === PermissionsAndroid.RESULTS.GRANTED)) return;
        }
        update({ aiMode: 'local' });
    };

    const setRemind = (remindMode: RemindMode) => {
        update({ remindMode });
        void scheduleNightlyReview({ ...prefs, remindMode });
    };

    return (
        <Frame title="Auto-capture" big>
            <View style={styles.tiles}>
                <Tile value={String(caught)} label="caught this month" palette="groceries" />
                <Tile value={coverage && coverage.total ? `${coverage.pct}%` : '—'} label="of bank SMS read" palette="transport" />
                <TouchableOpacity style={{ flex: 1 }} onPress={() => openScreen({ name: 'teach' })} accessibilityRole="button" disabled={!toTeach}>
                    <Tile value={String(toTeach)} label="need teaching" palette="dining" />
                </TouchableOpacity>
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>SOURCES</Text>
                <View style={styles.group}>
                    <SwitchRow title="Bank SMS" sub="Read on this phone by Sikka and your AI model" value={prefs.aiMode !== 'none'} onChange={setSms} />
                    <SwitchRow
                        title={`Quiet under ₹${prefs.quietUnder}`}
                        sub="Small payments wait for the nightly review"
                        value={prefs.quietSmall}
                        onChange={(quietSmall) => update({ quietSmall })}
                        last
                    />
                </View>
                <Text style={frameStyles.muted}>Sikka reads bank SMS only. UPI app notifications (GPay, PhonePe) are not read for now.</Text>
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>WHEN TO REMIND ME TO REVIEW</Text>
                <Segmented
                    label="When to remind me to review"
                    options={[
                        { value: 'now', label: 'Right away' },
                        { value: 'night', label: 'At night' },
                        { value: 'app', label: 'Only in app' },
                    ]}
                    value={prefs.remindMode}
                    onChange={setRemind}
                />
                <Text style={frameStyles.muted}>
                    {prefs.remindMode === 'now'
                        ? 'An alert for each payment, with quick category buttons.'
                        : prefs.remindMode === 'night'
                            ? `One reminder at ${prefs.nightlyAt} for everything waiting.`
                            : 'No alerts. Payments wait in Review.'}
                </Text>
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>BANKS SIKKA UNDERSTANDS</Text>
                <View style={styles.chips}>
                    {KNOWN_BANKS.map((b) => <Chip key={b} label={b} tone="surface" />)}
                    {taught.length > 0 && <Chip label={`+ ${taught.length} taught by you`} palette="groceries" />}
                </View>
            </View>

            <SmsModelPicker />
        </Frame>
    );
}

function Tile({ value, label, palette }: { value: string; label: string; palette: 'groceries' | 'transport' | 'dining' }) {
    const pair = CATEGORY_PALETTE[palette];
    return (
        <View style={[styles.tile, { backgroundColor: pair.bg }]}>
            <Text style={styles.tileValue}>{value}</Text>
            <Text style={[styles.tileLabel, { color: pair.fg }]}>{label}</Text>
        </View>
    );
}

function SwitchRow({ title, sub, value, onChange, last }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
    return (
        <View style={[styles.switchRow, !last && styles.line]}>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{title}</Text>
                {!!sub && <Text style={frameStyles.muted}>{sub}</Text>}
            </View>
            <Toggle label={title} value={value} onValueChange={onChange} />
        </View>
    );
}

// ─── Voice notes ──────────────────────────────────────────────────────
export function VoiceSettingsScreen() {
    const { prefs, update } = usePrefs();
    const [state, setState] = useState<VoiceModelState | 'asking'>('missing');
    const [adding, setAdding] = useState<string | null>(null);
    const [word, setWord] = useState('');

    useEffect(() => { voiceModelState().then(setState); }, []);

    const download = async () => {
        setState('asking');
        await downloadVoiceModel();
        setState(await voiceModelState());
    };

    const addWord = (cat: string) => {
        const w = word.trim().toLowerCase();
        if (!w) return setAdding(null);
        update({ voiceWords: { ...prefs.voiceWords, [cat]: Array.from(new Set([...(prefs.voiceWords[cat] ?? []), w])) } });
        setWord('');
        setAdding(null);
    };
    const removeWord = (cat: string, w: string) =>
        update({ voiceWords: { ...prefs.voiceWords, [cat]: (prefs.voiceWords[cat] ?? []).filter((x) => x !== w) } });

    const cats = Array.from(new Set([...Object.keys(prefs.voiceWords), 'dining', 'transport', 'groceries']));

    return (
        <Frame title="Voice notes" big>
            <View style={styles.group}>
                <SwitchRow title="Voice notes" sub="Say why you paid, on the payment" value={prefs.voiceNotes} onChange={(voiceNotes) => update({ voiceNotes })} last />
            </View>

            <View style={[styles.model, state === 'installed' && { backgroundColor: CATEGORY_PALETTE.groceries.bg }]}>
                <Text style={frameStyles.over}>
                    {state === 'installed' ? 'READY ON THIS PHONE' : state === 'unsupported' ? 'NOT ON THIS PHONE' : state === 'asking' ? 'DOWNLOADING ON WI-FI' : 'NOT DOWNLOADED'}
                </Text>
                <Text style={styles.modelName}>Hinglish model</Text>
                {state === 'asking' && <ProgressBar value={0.5} label="Voice model download" />}
                <Text style={frameStyles.muted}>
                    {state === 'installed'
                        ? 'Speech is turned into text on the phone, even offline.'
                        : state === 'unsupported'
                            ? "This phone's speech engine can't work offline. Voice notes use it online, or type the note."
                            : `About ${VOICE_MODEL_MB} MB from Android. The built-in engine works till then.`}
                </Text>
                {state === 'missing' && <Chip label={`Download ~${VOICE_MODEL_MB} MB`} icon="download" tone="night" onPress={download} />}
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>WRITE NOTES IN</Text>
                <View style={styles.scripts} accessibilityRole="radiogroup" accessibilityLabel="Write notes in">
                    {([['roman', 'khana', 'Roman'], ['devanagari', 'खाना', 'Devanagari']] as const).map(([v, sample, label]) => {
                        const on = prefs.voiceScript === v;
                        return (
                            <TouchableOpacity key={v} onPress={() => update({ voiceScript: v })} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.script, on && styles.scriptOn]}>
                                <Text style={styles.scriptSample}>{sample}</Text>
                                <Text style={frameStyles.muted}>{label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={{ gap: SPACING.sm }}>
                <Text style={frameStyles.over}>WORDS THAT PICK A CATEGORY</Text>
                {cats.map((cat) => (
                    <View key={cat} style={styles.words}>
                        <View style={styles.chips}>
                            {(prefs.voiceWords[cat] ?? []).map((w) => (
                                <Chip key={w} label={w} tone="ground" onPress={() => removeWord(cat, w)} />
                            ))}
                            {adding === cat ? (
                                <TextInput
                                    value={word}
                                    onChangeText={setWord}
                                    onSubmitEditing={() => addWord(cat)}
                                    onBlur={() => addWord(cat)}
                                    autoFocus
                                    placeholder="word"
                                    style={styles.wordInput}
                                    accessibilityLabel={`New word for ${CATEGORY_LABELS[cat as TransactionCategory] ?? cat}`}
                                />
                            ) : (
                                <Chip label="+ Add a word" tone="surface" onPress={() => setAdding(cat)} />
                            )}
                        </View>
                        <Chip label={`→ ${CATEGORY_LABELS[cat as TransactionCategory] ?? cat}`} palette={getPaletteKey(cat)} />
                    </View>
                ))}
                <Text style={frameStyles.muted}>Tap a word to remove it.</Text>
            </View>
        </Frame>
    );
}

// ─── Backup & restore ─────────────────────────────────────────────────
export function BackupScreen() {
    const { transactions } = useTransactions();
    const { data } = useOnboarding();
    const [modal, setModal] = useState<{ title: string; message: string; type?: ModalType; actions: ModalAction[] } | null>(null);
    const showModal = (title: string, message: string, actions: ModalAction[], type: ModalType = 'default') =>
        setModal({ title, message, type, actions: actions.map((a) => ({ ...a, onPress: () => { setModal(null); a.onPress?.(); } })) });
    const { user, lastBackup, autoBackupEnabled, toggleDriveBackup, manualBackup, restoreBackup, exportLocalBackup, isSyncing } = useBackup({ showModal });
    const payments = transactions.filter((t) => !t.isDeleted).length;
    const onDrive = !!user && autoBackupEnabled;

    return (
        <Frame
            title="Backup"
            big
            bottom={<Button label="Back up now" icon="cloud-upload" onPress={() => (onDrive ? manualBackup() : exportLocalBackup())} loading={isSyncing} />}
        >
            <View style={[styles.status, onDrive && { backgroundColor: CATEGORY_PALETTE.groceries.bg }]}>
                <Icon name={onDrive ? 'cloud-done' : 'smartphone'} size={28} color={onDrive ? CATEGORY_PALETTE.groceries.fg : CATEGORY_PALETTE.shopping.fg} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>{onDrive ? 'On Google Drive' : 'On this phone only'}</Text>
                    <Text style={frameStyles.muted}>
                        {lastBackup ? `Last backup ${lastBackup}.` : 'No backup yet.'} {onDrive ? '' : 'Lost phone = lost data.'}
                    </Text>
                </View>
            </View>

            {!onDrive && (
                <View style={styles.drive}>
                    <Text style={styles.driveTitle}>Add Google Drive</Text>
                    <Text style={frameStyles.body}>Encrypted on the phone first. Sikka only sees its own app folder.</Text>
                    <Button label="Connect Google Drive" icon="add-to-drive" onPress={() => toggleDriveBackup(true)} loading={isSyncing} />
                    <Text style={frameStyles.muted}>Optional · needs internet only while uploading · {payments.toLocaleString('en-IN')} payments</Text>
                </View>
            )}

            {onDrive && (
                <View style={styles.group}>
                    <SwitchRow title="Auto backup" sub="At night, on Wi-Fi, while charging" value={!!data.autoBackupEnabled} onChange={(v) => toggleDriveBackup(v)} last />
                </View>
            )}

            <Text style={frameStyles.muted}>Your backup is encrypted. Keep your Google account safe; it's the way back in.</Text>

            <View style={styles.actions}>
                <ActionTile icon="cloud-download" label="Restore" onPress={restoreBackup} disabled={!user} />
                <ActionTile icon="ios-share" label="Export" onPress={exportLocalBackup} />
            </View>

            <CustomModal
                visible={!!modal}
                title={modal?.title ?? ''}
                message={modal?.message ?? ''}
                type={modal?.type}
                actions={modal?.actions ?? []}
                onClose={() => setModal(null)}
            />
        </Frame>
    );
}

function ActionTile({ icon, label, onPress, disabled }: { icon: any; label: string; onPress: () => void; disabled?: boolean }) {
    return (
        <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" style={[styles.action, disabled && { opacity: 0.45 }]} activeOpacity={0.85}>
            <Icon name={icon} size={24} color={COLORS.text} />
            <Text style={styles.actionText}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tiles: { flexDirection: 'row', gap: SPACING.sm },
    tile: { flex: 1, borderRadius: 22, padding: 14, gap: 2, minHeight: 92 },
    tileValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    tileLabel: { fontSize: 13, fontWeight: '800' },
    group: { backgroundColor: COLORS.surface, borderRadius: 26, paddingHorizontal: SPACING.lg, ...SHADOWS.sm },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 14 },
    line: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
    rowTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, flex: 1 },
    model: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, gap: SPACING.sm, ...SHADOWS.sm },
    modelName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    scripts: { flexDirection: 'row', gap: SPACING.sm },
    script: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg, alignItems: 'center', gap: 2 },
    scriptOn: { borderWidth: 3, borderColor: COLORS.night, padding: SPACING.lg - 3 },
    scriptSample: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    words: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: 22, padding: 12 },
    wordInput: { height: 38, minWidth: 90, borderRadius: 19, backgroundColor: COLORS.background, paddingHorizontal: 12, fontSize: 14, fontWeight: '700', color: COLORS.text },
    status: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: CATEGORY_PALETTE.shopping.bg, borderRadius: 26, padding: SPACING.lg },
    statusTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    drive: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, gap: SPACING.md, ...SHADOWS.sm },
    driveTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    actions: { flexDirection: 'row', gap: SPACING.sm },
    action: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg, alignItems: 'center', gap: 6, ...SHADOWS.sm },
    actionText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
});
