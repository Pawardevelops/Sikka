/**
 * Sync result — new in v3 (canvas "12c Sync result").
 * After "Sync SMS with AI": what was read, what's new, what was already there,
 * and the messages Sikka couldn't read, each one tap from "Teach this message".
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/ui';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { unreadBankSms, coverageThisMonth } from '../../services/sms';
import { Frame, frameStyles } from './Frame';

const fmt = (ms: number) =>
    new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function SyncResultScreen({ from, to, captured, already, unread }: { from: number; to: number; scanned: number; captured: number; already: number; unread: number }) {
    const { openScreen, closeScreen } = useNavigation();
    const [unreadList, setUnreadList] = useState<{ id: string; body: string; sender: string }[]>([]);
    const [coverage, setCoverage] = useState<{ read: number; total: number; pct: number } | null>(null);
    const read = captured + already;
    const total = read + unread;
    const toNow = Date.now() - to < 120_000;

    useEffect(() => {
        unreadBankSms(from - 1).then((m) => setUnreadList(m.filter((x) => x.body).slice(0, 3).map((x) => ({ id: x.id, body: x.body, sender: x.sender }))));
        coverageThisMonth().then(setCoverage).catch(() => undefined);
    }, [from]);

    return (
        <Frame
            title="Sync done"
            big
            sub={`${fmt(from)} → ${toNow ? 'now' : fmt(to)}`}
            bottom={<Button label={captured ? `Review ${captured} new` : 'Done'} onPress={closeScreen} icon={captured ? 'arrow-forward' : 'check'} />}
        >
            <View style={styles.hero} accessibilityLabel={`${read} of ${total} SMS read`}>
                <Text style={styles.heroValue}>{read} of {total}</Text>
                <Text style={styles.heroLabel}>bank SMS read</Text>
                <View style={styles.track}>
                    <View style={[styles.fill, { width: `${total ? (read / total) * 100 : 100}%` }]} />
                </View>
            </View>

            <View style={styles.stats}>
                <Stat value={captured} label="new payments" palette="groceries" />
                <Stat value={already} label="already added" palette="transport" />
                <Stat value={unread} label="couldn't read" palette="dining" />
            </View>

            {captured > 0 && (
                <View style={styles.note}>
                    <Icon name="inbox" size={20} color={CATEGORY_PALETTE.groceries.fg} />
                    <Text style={styles.noteText}>{captured} new {captured === 1 ? 'payment is' : 'payments are'} in Review</Text>
                </View>
            )}

            {unreadList.length > 0 && (
                <View style={{ gap: SPACING.sm }}>
                    <Text style={frameStyles.over}>COULDN'T READ · TEACH IT ONCE</Text>
                    {unreadList.map((m) => (
                        <View key={m.id} style={styles.sms}>
                            <Text style={styles.smsFrom}>{m.sender}</Text>
                            <Text style={styles.smsBody}>{m.body}</Text>
                            <Text style={frameStyles.muted}>
                                New bank format. Tap the amount and the shop once, and Sikka reads every SMS like it.
                            </Text>
                            <TouchableOpacity
                                style={styles.teach}
                                onPress={() => openScreen({ name: 'teach', messageId: m.id })}
                                accessibilityRole="button"
                                activeOpacity={0.85}
                            >
                                <Text style={styles.teachText}>Teach this message</Text>
                                <Icon name="chevron-right" size={20} color={COLORS.onNight} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {coverage && coverage.total > 0 && (
                <Text style={frameStyles.muted}>
                    Coverage this month: {coverage.pct}% of bank SMS read ({coverage.read} of {coverage.total}).
                </Text>
            )}
        </Frame>
    );
}

function Stat({ value, label, palette }: { value: number; label: string; palette: 'groceries' | 'transport' | 'dining' }) {
    const pair = CATEGORY_PALETTE[palette];
    return (
        <View style={[styles.stat, { backgroundColor: pair.bg }]}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={[styles.statLabel, { color: pair.fg }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    hero: { backgroundColor: COLORS.night, borderRadius: 30, padding: SPACING.xl, gap: 6 },
    heroValue: { fontSize: 40, lineHeight: 44, fontWeight: '800', color: COLORS.onNight, letterSpacing: -1 },
    heroLabel: { fontSize: 15, fontWeight: '700', color: '#D9D3C7' },
    track: { height: 10, borderRadius: 5, backgroundColor: '#3A362E', overflow: 'hidden', marginTop: SPACING.sm },
    fill: { height: 10, borderRadius: 5, backgroundColor: COLORS.brand },
    stats: { flexDirection: 'row', gap: SPACING.sm },
    stat: { flex: 1, borderRadius: 22, padding: 14, gap: 2 },
    statValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    statLabel: { fontSize: 13, fontWeight: '800' },
    note: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: CATEGORY_PALETTE.groceries.bg, borderRadius: 18, padding: 14 },
    noteText: { flex: 1, fontSize: 15, fontWeight: '800', color: CATEGORY_PALETTE.groceries.fg },
    sms: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.lg, gap: SPACING.sm, ...SHADOWS.sm },
    smsFrom: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.4 },
    smsBody: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: COLORS.text },
    teach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.night, borderRadius: 22, height: 48, paddingHorizontal: SPACING.lg },
    teachText: { fontSize: 15, fontWeight: '800', color: COLORS.onNight },
});
