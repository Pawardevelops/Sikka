/**
 * "Check recent SMS" → pick a date range, then scan.
 * Bottom sheet with quick ranges and a custom From / To (whole days).
 */
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { Icon } from './Icon';
import { Button, Chip, SectionLabel } from './ui';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { fadeIn, sheetIn } from '../motion';

const DAY = 86_400_000;
const dayStart = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const dayEnd = (t: number) => dayStart(t) + DAY - 1;

type PresetId = 'last24' | 'today' | 'yesterday' | 'week' | 'custom';

const PRESETS: { id: Exclude<PresetId, 'custom'>; label: string; range: () => [number, number] }[] = [
    { id: 'last24', label: 'Last 24 hours', range: () => [Date.now() - DAY, Date.now()] },
    { id: 'today', label: 'Today', range: () => [dayStart(Date.now()), Date.now()] },
    { id: 'yesterday', label: 'Yesterday', range: () => [dayStart(Date.now() - DAY), dayEnd(Date.now() - DAY)] },
    { id: 'week', label: 'Last 7 days', range: () => [dayStart(Date.now() - 6 * DAY), Date.now()] },
];

const fmt = (t: number) => new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function ScanRangeSheet({
    visible,
    onClose,
    onScan,
}: {
    visible: boolean;
    onClose: () => void;
    onScan: (from: number, to: number) => void;
}) {
    const insets = useSafeAreaInsets();
    const [preset, setPreset] = useState<PresetId>('last24');
    const [[from, to], setRange] = useState<[number, number]>(PRESETS[0].range());
    const [editing, setEditing] = useState<'from' | 'to' | null>(null);

    // Fresh "now" each time the sheet opens.
    useEffect(() => {
        if (!visible) return;
        setPreset('last24');
        setRange(PRESETS[0].range());
        setEditing(null);
    }, [visible]);

    const pickPreset = (p: (typeof PRESETS)[number]) => {
        setPreset(p.id);
        setRange(p.range());
    };

    const onPicked = (_e: unknown, picked?: Date) => {
        const which = editing;
        setEditing(null);
        if (!picked || !which) return;
        setPreset('custom');
        const t = picked.getTime();
        if (which === 'from') {
            const f = dayStart(t);
            setRange([f, Math.max(to, Math.min(dayEnd(f), Date.now()))]);
        } else {
            const e = Math.min(dayEnd(t), Date.now());
            setRange([Math.min(from, dayStart(t)), e]);
        }
    };

    const days = Math.max(1, Math.round((to - from) / DAY));
    const isRolling = preset === 'last24';

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <Animated.View entering={fadeIn} style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
                <Animated.View entering={sheetIn} style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
                    <View style={styles.grabber} />
                    <Text style={styles.title} accessibilityRole="header">Check SMS for payments</Text>
                    <Text style={styles.body}>Sikka reads bank SMS from this period and adds any payments it missed. Ones already added are skipped.</Text>

                    <SectionLabel>Quick pick</SectionLabel>
                    <View style={styles.chips}>
                        {PRESETS.map((p) => (
                            <Chip
                                key={p.id}
                                label={p.label}
                                tone={preset === p.id ? 'night' : 'ground'}
                                selected={preset === p.id}
                                onPress={() => pickPreset(p)}
                            />
                        ))}
                    </View>

                    <SectionLabel>Or choose dates</SectionLabel>
                    <View style={styles.dates}>
                        <DateField label="From" value={isRolling ? `${fmt(from)}, ${fmtTime(from)}` : fmt(from)} onPress={() => setEditing('from')} />
                        <Icon name="arrow-forward" size={20} color={COLORS.textSecondary} />
                        <DateField label="To" value={isRolling ? 'Now' : fmt(to)} onPress={() => setEditing('to')} />
                    </View>

                    <Button
                        label={isRolling ? 'Check last 24 hours' : `Check ${days} ${days === 1 ? 'day' : 'days'}`}
                        icon="search"
                        onPress={() => onScan(from, to)}
                    />

                    {editing && (
                        <DateTimePicker
                            value={new Date(editing === 'from' ? from : to)}
                            mode="date"
                            maximumDate={new Date()}
                            minimumDate={editing === 'to' ? new Date(dayStart(from)) : undefined}
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={onPicked}
                        />
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

function DateField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={styles.field}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}. Change date`}
        >
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: BORDER_RADIUS.xxl,
        borderTopRightRadius: BORDER_RADIUS.xxl,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        gap: SPACING.md,
    },
    grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.border, marginBottom: SPACING.xs },
    title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    body: { fontSize: 15, lineHeight: 21, color: COLORS.textSecondary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    dates: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    field: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingVertical: 12, paddingHorizontal: 14, ...SHADOWS.sm },
    fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary, textTransform: 'uppercase' },
    fieldValue: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 2 },
});
