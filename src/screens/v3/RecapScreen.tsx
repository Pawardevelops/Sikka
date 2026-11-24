/**
 * Monthly recap — new in v3 (canvas "18b Recap").
 * Month end used to have numbers but no insight. This closes the month:
 * spent vs limit, where it went, what you marked "Regret", one thing to cut,
 * and the next month's limit.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { Button, BottomSheet, useToast } from '../../components/ui';
import { MoodFace } from '../../components/ui/MoodFace';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';
import { useTransactions, CATEGORY_LABELS } from '../../context/TransactionsContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { TransactionCategory } from '../../types';
import { Frame, frameStyles } from './Frame';

const monthName = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'long' });

export function RecapScreen({ month, year }: { month?: number; year?: number }) {
    const { goToTab, closeScreen } = useNavigation();
    const { activeTransactions } = useTransactions();
    const { data, updateData } = useOnboarding();
    const { formatAmount } = useCurrency();
    const { activeSubscriptions } = useSubscriptions();
    const toast = useToast();
    const now = new Date();
    const m = month ?? (now.getMonth() + 11) % 12;
    const y = year ?? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    const limit = data.monthlySpendLimit ?? 30000;
    const [limitOpen, setLimitOpen] = useState(false);
    const [nextLimit, setNextLimit] = useState(String(limit));

    const r = useMemo(() => {
        const inMonth = (t: number, yy: number, mm: number) => {
            const d = new Date(t);
            return d.getFullYear() === yy && d.getMonth() === mm;
        };
        const spends = activeTransactions.filter((t) => t.amount < 0 && t.category !== 'transfer' && t.status !== 'pending');
        const cur = spends.filter((t) => inMonth(t.timestamp, y, m));
        const pm = (m + 11) % 12;
        const py = m === 0 ? y - 1 : y;
        const prev = spends.filter((t) => inMonth(t.timestamp, py, pm));
        const total = cur.reduce((s, t) => s + Math.abs(t.amount), 0);
        const prevTotal = prev.reduce((s, t) => s + Math.abs(t.amount), 0);
        const byCat: Record<string, number> = {};
        cur.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + Math.abs(t.amount); });
        const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const top = cats.slice(0, 4);
        const other = cats.slice(4).reduce((s, [, v]) => s + v, 0);
        const regret = cur.filter((t) => t.sentimentIds?.includes('regret'));
        const regretTotal = regret.reduce((s, t) => s + Math.abs(t.amount), 0);
        const lateNight = regret.filter((t) => { const h = new Date(t.timestamp).getHours(); return h >= 22 || h < 4; }).length;
        const regretBy: Record<string, number> = {};
        regret.forEach((t) => { regretBy[t.merchant] = (regretBy[t.merchant] || 0) + 1; });
        const regretTop = Object.entries(regretBy).sort((a, b) => b[1] - a[1])[0];
        return { total, prevTotal, top, other, regret, regretTotal, lateNight, regretTop };
    }, [activeTransactions, m, y]);

    const left = limit - r.total;
    const change = r.prevTotal ? Math.round(((r.total - r.prevTotal) / r.prevTotal) * 100) : null;
    const max = Math.max(1, ...r.top.map(([, v]) => v), r.other);
    const cut = [...activeSubscriptions].sort((a, b) => b.amount - a.amount)[0];
    const next = monthName(now.getFullYear(), now.getMonth());

    const saveLimit = () => {
        const n = parseInt(nextLimit.replace(/[^0-9]/g, ''), 10);
        if (Number.isFinite(n) && n >= 1000) {
            updateData({ monthlySpendLimit: n });
            toast.show({ message: `${next} limit set to ${formatAmount(n, true)}`, icon: 'flag' });
            setLimitOpen(false);
            closeScreen();
        }
    };

    return (
        <Frame title={`${monthName(y, m)} recap`} big bottom={<Button label={`Set ${next} limit`} icon="flag" onPress={() => setLimitOpen(true)} />}>
            <View style={styles.hero}>
                <Text style={styles.heroOver}>SPENT IN {monthName(y, m).toUpperCase()}</Text>
                <Text style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>{formatAmount(r.total, true)}</Text>
                <Text style={styles.heroSub}>
                    of {formatAmount(limit, true)} limit · {left >= 0 ? `${formatAmount(left, true)} left over` : `${formatAmount(-left, true)} over`}
                </Text>
                {change !== null && (
                    <View style={styles.changeChip}>
                        <Icon name={change <= 0 ? 'south' : 'north'} size={14} color={COLORS.brand} />
                        <Text style={styles.changeText}>{change > 0 ? '+' : ''}{change}% vs {monthName(y, (m + 11) % 12).slice(0, 3)}</Text>
                    </View>
                )}
            </View>

            {r.top.length > 0 ? (
                <View style={styles.card}>
                    {r.top.map(([cat, v]) => <Bar key={cat} label={CATEGORY_LABELS[cat as TransactionCategory] ?? cat} value={v} max={max} color={getCategoryColors(cat).bg} format={formatAmount} />)}
                    {r.other > 0 && <Bar label="Other" value={r.other} max={max} color={COLORS.surfaceSunk} format={formatAmount} />}
                </View>
            ) : (
                <Text style={frameStyles.muted}>No approved spends in {monthName(y, m)}.</Text>
            )}

            {r.regretTotal > 0 && (
                <View style={[styles.insight, { backgroundColor: CATEGORY_PALETTE.shopping.bg }]}>
                    <MoodFace mood="regret" size={44} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.insightTitle}>{formatAmount(r.regretTotal, true)} marked "Regret"</Text>
                        <Text style={frameStyles.muted}>
                            {r.lateNight > r.regret.length / 2
                                ? `Mostly late at night (${r.lateNight} of ${r.regret.length}).`
                                : r.regretTop
                                    ? `Mostly ${r.regretTop[0]} (${r.regretTop[1]} of ${r.regret.length}).`
                                    : ''}
                        </Text>
                    </View>
                </View>
            )}

            {cut && (
                <View style={[styles.insight, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}>
                    <Icon name="content-cut" size={26} color={CATEGORY_PALETTE.bills.fg} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.insightTitle}>Still using {cut.name}?</Text>
                        <Text style={frameStyles.muted}>Cut it and save {formatAmount(cut.amount, true)} a month.</Text>
                    </View>
                    <TouchableOpacity onPress={() => { closeScreen(); goToTab('assets'); }} style={styles.review} accessibilityRole="button">
                        <Text style={styles.reviewText}>Review</Text>
                    </TouchableOpacity>
                </View>
            )}

            <BottomSheet visible={limitOpen} onClose={() => setLimitOpen(false)} label={`Set ${next} limit`}>
                <Text style={styles.sheetTitle}>{next} limit</Text>
                <View style={styles.amountRow}>
                    <Text style={styles.rupee}>₹</Text>
                    <TextInput
                        value={Number(nextLimit.replace(/[^0-9]/g, '') || 0).toLocaleString('en-IN')}
                        onChangeText={setNextLimit}
                        keyboardType="number-pad"
                        style={styles.amountInput}
                        accessibilityLabel={`${next} spend limit`}
                        autoFocus
                    />
                </View>
                <Text style={frameStyles.muted}>
                    {monthName(y, m)} you spent {formatAmount(r.total, true)}. About {formatAmount(Math.round(Number(nextLimit.replace(/[^0-9]/g, '') || 0) / 30 / 100) * 100, true)} a day.
                </Text>
                <Button label="Save limit" icon="check" onPress={saveLimit} />
            </BottomSheet>
        </Frame>
    );
}

function Bar({ label, value, max, color, format }: { label: string; value: number; max: number; color: string; format: (n: number, b?: boolean) => string }) {
    return (
        <View style={styles.bar} accessibilityLabel={`${label} ${format(value, true)}`}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.barValue}>{format(value, true)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    hero: { backgroundColor: COLORS.night, borderRadius: 30, padding: SPACING.xl, gap: 4 },
    heroOver: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: COLORS.brand },
    heroValue: { fontSize: 44, lineHeight: 48, fontWeight: '800', color: COLORS.onNight, letterSpacing: -1.5 },
    heroSub: { fontSize: 15, fontWeight: '700', color: '#D9D3C7' },
    changeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#2E2B24', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginTop: SPACING.sm },
    changeText: { fontSize: 13, fontWeight: '800', color: COLORS.brand },
    card: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, gap: SPACING.md, ...SHADOWS.sm },
    bar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    barLabel: { width: 84, fontSize: 14, fontWeight: '800', color: COLORS.text },
    barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: COLORS.background, overflow: 'hidden' },
    barFill: { height: 14, borderRadius: 7 },
    barValue: { width: 76, textAlign: 'right', fontSize: 14, fontWeight: '800', color: COLORS.text },
    insight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: 26, padding: SPACING.lg },
    insightTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    review: { backgroundColor: COLORS.night, borderRadius: 18, height: 36, paddingHorizontal: 14, justifyContent: 'center' },
    reviewText: { fontSize: 14, fontWeight: '800', color: COLORS.onNight },
    sheetTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 22, paddingHorizontal: 18, height: 68 },
    rupee: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginRight: 6 },
    amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: COLORS.text, paddingVertical: 0 },
});
