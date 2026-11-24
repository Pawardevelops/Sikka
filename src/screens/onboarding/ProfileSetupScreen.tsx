/**
 * Sikka - Profile (Onboarding step 1 of 5)
 * Design: Sikka v3 canvas "02 Profile" — two quick things: a name and a
 * monthly limit typed as a number (presets, no slider), or "learn from my first month".
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../components/Typography';
import { useOnboarding, ONBOARDING_DOTS, dotFor } from '../../context/OnboardingContext';
import { usePrefs } from '../../context/PrefsContext';
import { useCurrency } from '../../context/CurrencyContext';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE } from '../../constants/theme';
import { Button, IconButton, StepDots, Toggle } from '../../components/ui';

const PRESETS = [15000, 30000, 50000];

export function ProfileSetupScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, data, updateData, goToStep } = useOnboarding();
    const { prefs, update } = usePrefs();
    const { formatAmount } = useCurrency();
    const limit = data.monthlySpendLimit ?? 30000;
    const perDay = Math.round(limit / 30 / 100) * 100;
    const learning = prefs.learnLimit;

    const setLimitText = (t: string) => {
        const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
        updateData({ monthlySpendLimit: Number.isFinite(n) ? Math.min(n, 99_99_999) : 0 });
    };
    const limitValid = learning || limit >= 1000;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <IconButton icon="chevron-left" label="Back" onPress={() => goToStep(1)} iconSize={26} />
                <View style={{ flex: 1 }}><StepDots total={ONBOARDING_DOTS} current={dotFor(currentStep)} /></View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 4 }}>
                    <Text style={styles.title} accessibilityRole="header">Two quick things</Text>
                    <Text style={styles.sub}>Both can change later in Settings.</Text>
                </View>

                <View style={{ gap: SPACING.sm }}>
                    <Text style={styles.overline} nativeID="nameLabel">WHAT SHOULD SIKKU CALL YOU?</Text>
                    <TextInput
                        style={styles.nameInput}
                        placeholder="Your name"
                        value={data.userName}
                        onChangeText={(userName) => updateData({ userName })}
                        accessibilityLabel="What should Sikku call you?"
                        autoCapitalize="words"
                        returnKeyType="done"
                    />
                </View>

                <View style={[styles.limitCard, learning && { opacity: 0.55 }]}>
                    <Text style={styles.limitOver}>MONTHLY SPEND LIMIT</Text>
                    <View style={styles.amountRow}>
                        <Text style={styles.rupee}>₹</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={limit ? limit.toLocaleString('en-IN') : ''}
                            onChangeText={setLimitText}
                            keyboardType="number-pad"
                            editable={!learning}
                            placeholder="30,000"
                            accessibilityLabel="Monthly spend limit in rupees"
                            maxLength={11}
                        />
                    </View>
                    {limitValid ? (
                        <Text style={styles.hint}>
                            {learning ? 'Sikku will suggest one after 30 days.' : `About ${formatAmount(perDay, true)} a day. Powers "on pace" on Home.`}
                        </Text>
                    ) : (
                        <Text style={styles.error} accessibilityLiveRegion="polite">Enter at least ₹1,000, or let Sikku learn it.</Text>
                    )}
                    <View style={styles.presets} accessibilityRole="radiogroup" accessibilityLabel="Quick limits">
                        {PRESETS.map((p) => {
                            const on = !learning && limit === p;
                            return (
                                <TouchableOpacity
                                    key={p}
                                    disabled={learning}
                                    onPress={() => updateData({ monthlySpendLimit: p })}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: on, disabled: learning }}
                                    style={[styles.preset, on && styles.presetOn]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.presetText, on && { color: COLORS.onNight }]}>{formatAmount(p, true)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.learnRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.learnTitle}>Not sure? Learn from my first month</Text>
                        <Text style={styles.learnSub}>Sikku suggests a limit after 30 days</Text>
                    </View>
                    <Toggle label="Learn my limit from my first month" value={learning} onValueChange={(v) => update({ learnLimit: v })} />
                </View>
            </ScrollView>

            <Button label="Continue" onPress={() => goToStep(3)} disabled={!limitValid} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: SPACING.xl, paddingBottom: SPACING.lg },
    title: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },
    sub: { fontSize: 16, color: COLORS.textSecondary },
    overline: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.6 },

    nameInput: {
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 22,
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        ...SHADOWS.md,
    },

    limitCard: { backgroundColor: CATEGORY_PALETTE.bills.bg, borderRadius: 30, padding: 18, gap: SPACING.md },
    limitOver: { fontSize: 13, fontWeight: '800', color: CATEGORY_PALETTE.bills.fg, letterSpacing: 0.6 },
    amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 22, paddingHorizontal: 18, height: 68 },
    rupee: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginRight: 6 },
    amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: COLORS.text, letterSpacing: -1, paddingVertical: 0 },
    hint: { fontSize: 14, fontWeight: '700', color: CATEGORY_PALETTE.bills.fg },
    error: { fontSize: 14, fontWeight: '800', color: COLORS.error },
    presets: { flexDirection: 'row', gap: SPACING.sm },
    preset: { flex: 1, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
    presetOn: { backgroundColor: COLORS.night },
    presetText: { fontSize: 15, fontWeight: '800', color: COLORS.text },

    learnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    learnTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    learnSub: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 2 },
});
