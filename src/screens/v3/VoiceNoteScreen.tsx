/**
 * Voice note (canvas "09 Voice note"): say why you paid, in Hinglish, on the phone.
 * Words in the note can pick the category ("chai" → Dining) and add #people.
 * The text stays editable, so a misheard word is one tap to fix.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { Button, Chip } from '../../components/ui';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getPaletteKey } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { useTransactions, CATEGORY_LABELS } from '../../context/TransactionsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { usePrefs } from '../../context/PrefsContext';
import { TransactionCategory } from '../../types';
import { speech, VOICE_LOCALE, voiceModelState, categoryFromWords, tagsFromNote } from '../../services/voice';
import { PulseHalo } from '../../motion';
import { Frame } from './Frame';

export function VoiceNoteScreen({ txId }: { txId: string }) {
    const { closeScreen } = useNavigation();
    const { transactions, editTransaction } = useTransactions();
    const { formatAmount } = useCurrency();
    const { prefs } = usePrefs();
    const tx = transactions.find((t) => t.id === txId);
    const [text, setText] = useState(tx?.notes ?? '');
    const [listening, setListening] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [onDevice, setOnDevice] = useState(false);
    const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    useEffect(() => {
        voiceModelState().then((s) => setOnDevice(s === 'installed'));
        const m = speech();
        if (!m) return;
        const r = m.ExpoSpeechRecognitionModule;
        const subs = [
            r.addListener('result', (e) => {
                const t = e.results?.[0]?.transcript ?? '';
                if (t) setText(t);
            }),
            r.addListener('end', () => stopTimer()),
            r.addListener('error', (e) => {
                stopTimer();
                setError(e.error === 'no-speech' ? "Didn't catch that. Try again, or type it." : 'Voice is not available right now. Type the note instead.');
            }),
        ];
        return () => {
            subs.forEach((s) => s.remove());
            stopTimer();
            try { r.abort(); } catch { /* not running */ }
        };
    }, []);

    const stopTimer = () => {
        clearInterval(timer.current);
        setListening(false);
    };

    const listen = async () => {
        const m = speech();
        if (!m) {
            setError('Voice is not available on this device. Type the note instead.');
            return;
        }
        setError(null);
        const r = m.ExpoSpeechRecognitionModule;
        const perm = await r.requestPermissionsAsync();
        if (!perm.granted) {
            setError('Allow the microphone to speak a note. Or type it.');
            return;
        }
        setText('');
        setSeconds(0);
        setListening(true);
        timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        r.start({
            lang: VOICE_LOCALE,
            interimResults: true,
            continuous: false,
            requiresOnDeviceRecognition: Platform.OS === 'android' && onDevice,
            addsPunctuation: true,
        });
    };

    const stop = () => {
        try { speech()?.ExpoSpeechRecognitionModule.stop(); } catch { /* not running */ }
        stopTimer();
    };

    if (!tx) return <Frame title="Voice note"><Text>Payment not found.</Text></Frame>;

    const suggested = categoryFromWords(text, prefs.voiceWords) as TransactionCategory | undefined;
    const category = (tx.category === 'other' && suggested) || tx.category;
    const tags = tagsFromNote(text);

    const save = async () => {
        await editTransaction(tx.id, {
            notes: text.trim(),
            tags: Array.from(new Set([...(tx.tags ?? []), ...tags])),
            ...(category !== tx.category ? { category } : {}),
        });
        closeScreen();
    };

    return (
        <Frame
            title="Voice note"
            bottom={
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    <Button label="Retry" variant="soft" icon={null} onPress={listen} style={{ flex: 1 }} />
                    <Button label="Save" icon="check" onPress={save} disabled={!text.trim()} style={{ flex: 1.4 }} />
                </View>
            }
        >
            <View style={styles.tx}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.txName}>{tx.merchant}</Text>
                    <Text style={styles.txMeta}>
                        {new Date(tx.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                </View>
                <Text style={styles.txAmount}>{formatAmount(Math.abs(tx.amount), true)}</Text>
            </View>

            <View style={styles.micWrap}>
                {listening && <PulseHalo size={132} color={CATEGORY_PALETTE.dining.bg} />}
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={listening ? 'Stop listening' : 'Speak a note'}
                    onPress={listening ? stop : listen}
                    activeOpacity={0.85}
                    style={[styles.mic, listening && { backgroundColor: COLORS.night }]}
                >
                    <Icon name={listening ? 'stop' : 'mic'} size={44} color={listening ? COLORS.brand : COLORS.onBrand} />
                </TouchableOpacity>
                <Text style={styles.status} accessibilityLiveRegion="polite">
                    {listening ? `Listening · 0:${String(seconds).padStart(2, '0')}` : 'Tap to speak'}
                </Text>
                <Text style={styles.engine}>Hinglish · {onDevice ? 'on device' : 'phone speech engine'}</Text>
            </View>

            <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder='e.g. "coffee with Rahul, client wala discussion"'
                accessibilityLabel="Note"
                style={styles.note}
            />
            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.chips}>
                <Chip label={CATEGORY_LABELS[category] ?? category} palette={getPaletteKey(category)} icon={suggested && suggested === category && tx.category === 'other' ? 'auto-awesome' : undefined} />
                {tags.map((t) => <Chip key={t} label={`#${t}`} tone="ground" />)}
            </View>
        </Frame>
    );
}

const styles = StyleSheet.create({
    tx: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, ...SHADOWS.sm },
    txName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    txMeta: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    txAmount: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    micWrap: { alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
    mic: { width: 112, height: 112, borderRadius: 56, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
    status: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: SPACING.sm },
    engine: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    note: { minHeight: 96, backgroundColor: COLORS.surface, borderRadius: 22, padding: SPACING.lg, fontSize: 18, lineHeight: 25, fontWeight: '700', color: COLORS.text, textAlignVertical: 'top' },
    error: { fontSize: 14, fontWeight: '800', color: COLORS.error },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
