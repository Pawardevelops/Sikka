/**
 * Sikka - Pick your AI model (Onboarding step 2 of 5, after "Use local AI")
 * Design: Sikka v3 canvas "04 Pick AI model".
 *
 * Reads the phone's RAM and free space, recommends the model that fits, and
 * starts the download in the background so setup can carry on. Bank formats the
 * built-in patterns know are read right away; the model joins when ready.
 * Also used from Settings (route "modelPick") to change the model.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import { getFreeDiskStorageAsync } from 'expo-file-system/legacy';
import { Text } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { useOnboarding, ONBOARDING_DOTS, dotFor } from '../../context/OnboardingContext';
import { usePrefs } from '../../context/PrefsContext';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE } from '../../constants/theme';
import { Button, IconButton, StepDots, Toggle } from '../../components/ui';
import { SMS_MODELS, recommendModel, modelFits, startBackgroundDownload } from '../../services/sms/modelManager';
import { SmsModel } from '../../services/sms/models';
import { downloadVoiceModel, VOICE_MODEL_MB } from '../../services/voice';

const gb = (bytes?: number | null) => (bytes ? Math.round(bytes / 1024 ** 3) : null);

export function ModelPickScreen({ fromSettings, onDone }: { fromSettings?: boolean; onDone?: () => void }) {
    const insets = useSafeAreaInsets();
    const onboarding = useOnboarding();
    const { prefs, update } = usePrefs();
    const [free, setFree] = useState<number | null>(null);
    const ram = Device.totalMemory ?? null;
    const best = useMemo(() => recommendModel(ram), [ram]);
    const [picked, setPicked] = useState<SmsModel>(best);
    const [voice, setVoice] = useState(prefs.voiceNotes);

    useEffect(() => {
        getFreeDiskStorageAsync().then(setFree).catch(() => setFree(null));
    }, []);

    const phone = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'This phone';
    const others = SMS_MODELS.filter((m) => m.id !== best.id);
    const enoughSpace = !free || free > picked.sizeMb * 1e6 * 1.2;

    const go = () => {
        startBackgroundDownload(picked);
        update({ aiMode: 'local', voiceNotes: voice });
        if (voice) void downloadVoiceModel();
        if (fromSettings) onDone?.();
        else onboarding.goToStep(5);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <View style={styles.header}>
                <IconButton
                    icon="chevron-left"
                    label="Back"
                    onPress={() => (fromSettings ? onDone?.() : onboarding.goToStep(3))}
                    iconSize={26}
                />
                {!fromSettings && (
                    <View style={{ flex: 1 }}><StepDots total={ONBOARDING_DOTS} current={dotFor(onboarding.currentStep)} /></View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 4 }}>
                    <Text style={styles.over}>WE CHECKED YOUR PHONE</Text>
                    <Text style={styles.title} accessibilityRole="header">{phone}</Text>
                </View>

                <View style={styles.specs}>
                    <Spec label="RAM" value={gb(ram) ? `${gb(ram)} GB` : '—'} palette="transport" />
                    <Spec label="FREE SPACE" value={gb(free) ? `${gb(free)} GB` : '—'} palette="groceries" />
                    <Spec label="RUNS ON" value="CPU" palette="fun" />
                </View>

                <Text style={styles.over}>BEST FOR YOUR PHONE</Text>
                <ModelCard model={best} best selected={picked.id === best.id} onPress={() => setPicked(best)} ram={ram} />

                <Text style={styles.over}>OTHER MODELS</Text>
                {others.map((m) => (
                    <ModelCard key={m.id} model={m} selected={picked.id === m.id} onPress={() => setPicked(m)} ram={ram} />
                ))}

                <View style={styles.voice}>
                    <View style={styles.voiceIcon}><Icon name="mic" size={22} color={CATEGORY_PALETTE.dining.fg} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.voiceTitle}>Also voice notes</Text>
                        <Text style={styles.voiceSub}>Hinglish speech model · ~{VOICE_MODEL_MB} MB · optional</Text>
                    </View>
                    <Toggle label="Also voice notes" value={voice} onValueChange={setVoice} />
                </View>

                <Text style={styles.note}>
                    Downloads in the background. Keep setting up. Rules read your SMS right away; the model joins when ready.
                </Text>
                {!enoughSpace && (
                    <Text style={styles.warn}>Not enough free space for {picked.name}. Pick a smaller one or free up space.</Text>
                )}
            </ScrollView>

            <Button label="Download & continue" icon="download" onPress={go} disabled={!enoughSpace} />
        </View>
    );
}

function Spec({ label, value, palette }: { label: string; value: string; palette: 'transport' | 'groceries' | 'fun' }) {
    const pair = CATEGORY_PALETTE[palette];
    return (
        <View style={[styles.spec, { backgroundColor: pair.bg }]} accessibilityLabel={`${label} ${value}`}>
            <Text style={[styles.specLabel, { color: pair.fg }]}>{label}</Text>
            <Text style={styles.specValue}>{value}</Text>
        </View>
    );
}

function ModelCard({ model, best, selected, onPress, ram }: { model: SmsModel; best?: boolean; selected: boolean; onPress: () => void; ram: number | null }) {
    const fits = modelFits(model, ram);
    const ramUse = Math.max(1, Math.round((model.sizeMb * 2.5) / 1000));
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.model, best && styles.modelBest, selected && styles.modelOn]}
        >
            <View style={styles.modelHead}>
                <Text style={[styles.modelName, best && { color: COLORS.onNight }]}>{model.name}</Text>
                <Text style={[styles.modelSize, best && { color: COLORS.brand }]}>~{model.sizeMb} MB</Text>
            </View>
            <Text style={[styles.modelBody, best && { color: '#E8E3D8' }]}>
                {best
                    ? `Uses about ${ramUse} GB${ram ? ` of your ${gb(ram)} GB RAM` : ' of RAM'}. ${model.tagline}`
                    : model.tagline}
            </Text>
            {!best && (
                <View style={[styles.fit, { backgroundColor: fits ? CATEGORY_PALETTE.groceries.bg : CATEGORY_PALETTE.shopping.bg }]}>
                    <Text style={[styles.fitText, { color: fits ? CATEGORY_PALETTE.groceries.fg : CATEGORY_PALETTE.shopping.fg }]}>
                        {fits ? 'Fits' : 'May be slow'}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: SPACING.md, paddingBottom: SPACING.lg },
    over: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary, marginTop: SPACING.xs },
    title: { fontSize: 30, lineHeight: 33, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },
    specs: { flexDirection: 'row', gap: SPACING.sm },
    spec: { flex: 1, borderRadius: 20, padding: 12, gap: 2 },
    specLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
    specValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },

    model: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, gap: 6, ...SHADOWS.sm },
    modelBest: { backgroundColor: COLORS.night },
    modelOn: { borderWidth: 3, borderColor: COLORS.brand, padding: SPACING.lg - 3 },
    modelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    modelName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    modelSize: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
    modelBody: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
    fit: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    fitText: { fontSize: 12, fontWeight: '800' },

    voice: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, marginTop: SPACING.sm, ...SHADOWS.sm },
    voiceIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: CATEGORY_PALETTE.dining.bg, alignItems: 'center', justifyContent: 'center' },
    voiceTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    voiceSub: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    note: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
    warn: { fontSize: 14, fontWeight: '800', color: COLORS.error },
});
