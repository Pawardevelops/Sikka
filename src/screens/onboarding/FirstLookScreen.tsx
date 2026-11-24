/**
 * Sikka - First look (Onboarding step 3 of 5) — new in v3.
 * Design: Sikka v3 canvas "05 First look".
 *
 * Value before more setup: reads the last 30 days of bank SMS on the phone and
 * shows what Sikka found — payments, total spent, biggest places, accounts —
 * before asking the user to confirm accounts.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Typography';
import { Icon } from '../../components/Icon';
import { useOnboarding, ONBOARDING_DOTS, dotFor, SmsPreview } from '../../context/OnboardingContext';
import { usePrefs } from '../../context/PrefsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, getCategoryColors } from '../../constants/theme';
import { Button, IconButton, StepDots, HeroCard, Sikku } from '../../components/ui';
import { previewInbox } from '../../services/sms';
import { prettyName } from '../../services/sms/extract';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../context/TransactionsContext';

/** Turns the raw inbox preview into what the screen shows. */
export function summarise(p: Awaited<ReturnType<typeof previewInbox>>): SmsPreview {
    const debits = p.payments.filter((x) => x.direction === 'debit');
    const byPlace = new Map<string, { name: string; count: number; total: number; category: string }>();
    for (const d of debits) {
        const name = d.merchant && d.merchant !== 'UNKNOWN' ? prettyName(d.merchant) : 'Unknown';
        const cur = byPlace.get(name) ?? { name, count: 0, total: 0, category: d.category };
        cur.count += 1;
        cur.total += d.amount;
        byPlace.set(name, cur);
    }
    const toCheck = p.payments.filter((x) => !x.merchant || x.merchant === 'UNKNOWN').length + p.unread;
    return {
        payments: p.payments.length,
        spent: debits.reduce((s, d) => s + d.amount, 0),
        toCheck,
        places: [...byPlace.values()].filter((x) => x.name !== 'Unknown').sort((a, b) => b.total - a.total).slice(0, 3),
        accounts: p.accounts,
    };
}

export function FirstLookScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, goToStep, preview, setPreview } = useOnboarding();
    const { update } = usePrefs();
    const { formatAmount } = useCurrency();
    const [loading, setLoading] = useState(!preview);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (preview) return;
        previewInbox(30)
            .then((p) => setPreview(summarise(p)))
            .catch((e) => {
                console.warn('[Sikka] First look failed', e);
                setFailed(true);
            })
            .finally(() => setLoading(false));
    }, [preview, setPreview]);

    const next = () => {
        update({ firstLookSeen: true });
        goToStep(6);
    };

    const p = preview;
    const empty = !loading && (!p || p.payments === 0);

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" label="Back" onPress={() => goToStep(4)} iconSize={26} />
                <View style={{ flex: 1 }}><StepDots total={ONBOARDING_DOTS} current={dotFor(currentStep)} /></View>
            </View>

            {loading ? (
                <View style={styles.center} accessibilityLiveRegion="polite">
                    <Sikku size={110} mood="thinking" />
                    <Text style={styles.title}>Reading your bank SMS…</Text>
                    <Text style={styles.sub}>Last 30 days, on this phone. Personal messages are skipped.</Text>
                    <ActivityIndicator color={COLORS.text} />
                </View>
            ) : empty ? (
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.center}>
                        <Sikku size={110} mood="thinking" />
                        <Text style={styles.title} accessibilityRole="header">No bank SMS yet</Text>
                        <Text style={styles.sub}>
                            {failed
                                ? 'Sikka could not read the inbox. You can sync SMS later from Review.'
                                : 'Nothing from a bank in the last 30 days. New payments will show up as they come. Add your accounts next.'}
                        </Text>
                    </View>
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View>
                        <Text style={styles.title} accessibilityRole="header">We found {p!.payments} payments</Text>
                        <Text style={styles.titleSoft}>in the last 30 days</Text>
                        <Text style={styles.sub}>Read from your bank SMS on this phone. No typing.</Text>
                    </View>

                    <HeroCard style={{ gap: SPACING.md }}>
                        <Text style={styles.heroOver}>SPENT IN 30 DAYS</Text>
                        <Text style={styles.heroValue}>{formatAmount(p!.spent, true)}</Text>
                        <View style={styles.heroRow}>
                            <View style={styles.pill}>
                                <Icon name="auto-awesome" size={14} color={COLORS.brand} />
                                <Text style={styles.pillText}>{p!.payments - Math.min(p!.toCheck, p!.payments)} filed by AI</Text>
                            </View>
                            {p!.toCheck > 0 && (
                                <View style={[styles.pill, { backgroundColor: COLORS.surface }]}>
                                    <Text style={[styles.pillText, { color: COLORS.text }]}>{p!.toCheck} to check tonight</Text>
                                </View>
                            )}
                        </View>
                    </HeroCard>

                    {p!.places.length > 0 && (
                        <View style={{ gap: SPACING.sm }}>
                            <Text style={styles.over}>BIGGEST PLACES</Text>
                            {p!.places.map((pl) => {
                                const pair = getCategoryColors(pl.category);
                                return (
                                    <View key={pl.name} style={styles.place}>
                                        <View style={[styles.placeIcon, { backgroundColor: pair.bg }]}>
                                            <Icon name={(CATEGORY_ICONS as any)[pl.category] ?? 'receipt-long'} size={20} color={pair.fg} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.placeName}>{pl.name}</Text>
                                            <Text style={styles.placeMeta}>
                                                {pl.count} {pl.count === 1 ? 'payment' : 'payments'} · {(CATEGORY_LABELS as any)[pl.category] ?? 'Other'}
                                            </Text>
                                        </View>
                                        <Text style={styles.placeAmount}>{formatAmount(pl.total, true)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {p!.accounts.length > 0 && (
                        <View style={styles.accounts}>
                            <Icon name="account-balance" size={22} color={CATEGORY_PALETTE.transport.fg} />
                            <Text style={styles.accountsText}>
                                <Text style={{ fontWeight: '800' }}>{p!.accounts.length} {p!.accounts.length === 1 ? 'account' : 'accounts'} found</Text>
                                {' '}in the SMS: {p!.accounts.slice(0, 3).map((a) => `${a.bank}${a.kind === 'credit' ? ' card' : ''} ··${a.last4}`).join(', ')}. Confirm them next.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {!loading && <Button label={empty ? 'Add accounts' : 'Confirm accounts'} onPress={next} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: SPACING.lg, paddingBottom: SPACING.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg, paddingHorizontal: SPACING.lg },
    title: { fontSize: 32, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text, textAlign: 'left' },
    titleSoft: { fontSize: 32, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8, color: COLORS.textSecondary },
    sub: { fontSize: 16, lineHeight: 23, color: COLORS.textSecondary, marginTop: SPACING.sm },
    over: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },

    heroOver: { fontSize: 13, fontWeight: '800', color: CATEGORY_PALETTE.groceries.fg, letterSpacing: 0.6 },
    heroValue: { fontSize: 44, lineHeight: 46, fontWeight: '800', letterSpacing: -1.5, color: COLORS.onBrand },
    heroRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.night, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
    pillText: { fontSize: 13, fontWeight: '800', color: COLORS.brand },

    place: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 22, padding: 14, ...SHADOWS.sm },
    placeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    placeName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    placeMeta: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    placeAmount: { fontSize: 18, fontWeight: '800', color: COLORS.text },

    accounts: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', backgroundColor: CATEGORY_PALETTE.transport.bg, borderRadius: 22, padding: SPACING.lg },
    accountsText: { flex: 1, fontSize: 15, lineHeight: 21, color: CATEGORY_PALETTE.transport.fg, fontWeight: '600' },
});
