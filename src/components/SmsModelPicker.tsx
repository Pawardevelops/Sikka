/**
 * Settings → "Smarter SMS reading": pick, download and switch the on-device
 * model that reads bank SMS the built-in patterns don't recognise.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from './Typography';
import { Chip, ProgressBar, SectionLabel } from './ui';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { fadeIn, riseIn } from '../motion';
import {
    SMS_MODELS,
    isDownloaded,
    downloadModel,
    cancelDownload,
    deleteModel,
    getActiveModelId,
    setActiveModel,
} from '../services/sms/modelManager';
import { SmsModel } from '../services/sms/models';
import { processQueuedSms, countQueuedSms } from '../services/sms';
import { releaseModel } from '../services/sms/aiParser';
import { useTransactions } from '../context/TransactionsContext';
import { useOnboarding } from '../context/OnboardingContext';

type RowState = { downloaded: boolean; progress?: number; error?: string };

export function SmsModelPicker() {
    const { refreshTransactions } = useTransactions();
    const { data } = useOnboarding();
    const [rows, setRows] = useState<Record<string, RowState>>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [queued, setQueued] = useState(0);

    const load = useCallback(async () => {
        const entries = await Promise.all(SMS_MODELS.map(async (m) => [m.id, { downloaded: await isDownloaded(m) }] as const));
        setRows((prev) => {
            const next: Record<string, RowState> = {};
            entries.forEach(([id, s]) => { next[id] = prev[id]?.progress !== undefined ? prev[id] : s; });
            return next;
        });
        setActiveId(await getActiveModelId());
        setQueued(await countQueuedSms().catch(() => 0));
    }, []);

    useEffect(() => { void load(); }, [load]);

    const patch = (id: string, s: Partial<RowState>) =>
        setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { downloaded: false }), ...s } }));

    const use = async (m: SmsModel | null) => {
        await releaseModel();
        await setActiveModel(m?.id ?? null);
        setActiveId(m?.id ?? null);
        if (m) {
            // Read anything that's been waiting with the new model.
            const captured = await processQueuedSms(data.userName).catch(() => 0);
            if (captured > 0) await refreshTransactions();
            setQueued(await countQueuedSms().catch(() => 0));
        }
    };

    const download = async (m: SmsModel) => {
        patch(m.id, { progress: 0, error: undefined });
        try {
            await downloadModel(m, (p) => patch(m.id, { progress: p }));
            patch(m.id, { downloaded: true, progress: undefined });
            if (!activeId) await use(m);
        } catch (e: any) {
            patch(m.id, { progress: undefined, error: e?.message?.includes('cancel') ? undefined : 'Download failed. Check your connection and try again.' });
        }
    };

    const cancel = async (m: SmsModel) => {
        await cancelDownload(m);
        patch(m.id, { progress: undefined, downloaded: false });
    };

    const remove = async (m: SmsModel) => {
        if (activeId === m.id) await releaseModel();
        await deleteModel(m);
        patch(m.id, { downloaded: false });
        if (activeId === m.id) setActiveId(null);
    };

    return (
        <View style={styles.wrap}>
            <SectionLabel>Smarter SMS reading</SectionLabel>
            <Text style={styles.intro}>
                Sikka reads common bank formats on its own. Download a small model to also read banks it doesn't know.
                It runs on your phone; messages never leave it.
                {queued > 0 ? ` ${queued} ${queued === 1 ? 'message is' : 'messages are'} waiting to be read.` : ''}
            </Text>

            <Option
                title="Built-in only"
                body="No download. Reads HDFC, SBI, ICICI and simple UPI messages."
                active={!activeId}
                index={0}
                actions={!activeId ? <Chip label="In use" icon="check" tone="night" /> : <Chip label="Use" onPress={() => use(null)} />}
            />

            {SMS_MODELS.map((m, i) => {
                const s = rows[m.id] ?? { downloaded: false };
                const isActive = activeId === m.id && s.downloaded;
                const downloading = s.progress !== undefined;
                return (
                    <Option
                        key={m.id}
                        index={i + 1}
                        title={m.name}
                        badge={`${m.sizeMb} MB`}
                        body={m.tagline}
                        footnote={`${m.license} licence`}
                        active={isActive}
                        error={s.error}
                        progress={downloading ? s.progress : undefined}
                        actions={
                            downloading ? (
                                <Chip label="Cancel" icon="close" onPress={() => cancel(m)} />
                            ) : !s.downloaded ? (
                                <Chip label={`Download ${m.sizeMb} MB`} icon="download" palette="groceries" onPress={() => download(m)} />
                            ) : (
                                <>
                                    {isActive ? <Chip label="In use" icon="check" tone="night" /> : <Chip label="Use" onPress={() => use(m)} />}
                                    <Chip label="Remove" icon="delete-outline" tone="ground" onPress={() => remove(m)} />
                                </>
                            )
                        }
                    />
                );
            })}
            <Text style={styles.note}>Downloads come from Hugging Face. Use Wi-Fi for the larger ones.</Text>
        </View>
    );
}

function Option({
    title,
    badge,
    body,
    footnote,
    active,
    progress,
    error,
    actions,
    index,
}: {
    title: string;
    badge?: string;
    body: string;
    footnote?: string;
    active: boolean;
    progress?: number;
    error?: string;
    actions: React.ReactNode;
    index: number;
}) {
    return (
        <Animated.View entering={riseIn(index)} style={[styles.card, active && styles.cardActive]}>
            <View style={styles.head}>
                <Text style={styles.title}>{title}</Text>
                {badge && <Text style={styles.badge}>{badge}</Text>}
            </View>
            <Text style={styles.body}>{body}</Text>
            {footnote && <Text style={styles.footnote}>{footnote}</Text>}
            {progress !== undefined && (
                <Animated.View entering={fadeIn} style={styles.progress}>
                    <ProgressBar value={progress} label={`${title} download`} />
                    <Text style={styles.footnote}>{Math.round(progress * 100)}%</Text>
                </Animated.View>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>{actions}</View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.md, backgroundColor: COLORS.background },
    intro: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
    card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, gap: 6, ...SHADOWS.sm },
    cardActive: { borderWidth: 3, borderColor: COLORS.text },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    badge: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
    body: { fontSize: 14, lineHeight: 20, color: COLORS.text },
    footnote: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
    progress: { gap: 4, marginTop: 4 },
    error: { fontSize: 13, fontWeight: '700', color: COLORS.error },
    actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: 6, flexWrap: 'wrap' },
    note: { fontSize: 12, color: COLORS.textSecondary },
});
