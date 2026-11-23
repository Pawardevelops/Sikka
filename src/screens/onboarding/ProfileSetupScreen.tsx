/**
 * Sikka - Profile (Onboarding 2 of 4)
 * Design: design-system/screens/Profile-v2.html
 * Name, monthly spend limit ("on pace"), main goal.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../components/Typography';
import { useOnboarding, USER_GOALS, ONBOARDING_STEPS } from '../../context/OnboardingContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE } from '../../constants/theme';
import { Button, IconButton, StepDots, Slider } from '../../components/ui';

const LIMIT_MIN = 5000;
const LIMIT_MAX = 100000;
const LIMIT_STEP = 1000;

export function ProfileSetupScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, data, updateData, goNext, goBack } = useOnboarding();
    const { formatAmount } = useCurrency();
    const limit = data.monthlySpendLimit ?? 30000;
    const initial = (data.userName.trim()[0] || 'S').toUpperCase();

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <IconButton icon="chevron-left" label="Back" onPress={goBack} iconSize={26} />
                <View style={{ flex: 1 }}><StepDots total={ONBOARDING_STEPS} current={currentStep} /></View>
                <TouchableOpacity onPress={goNext} accessibilityRole="button" hitSlop={10}>
                    <Text style={styles.skip}>Skip</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.title} accessibilityRole="header">What should Sikku call you?</Text>

                <View style={styles.nameRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
                    <TextInput
                        style={styles.nameInput}
                        placeholder="Your name"
                        value={data.userName}
                        onChangeText={(userName) => updateData({ userName })}
                        accessibilityLabel="Your name"
                        autoCapitalize="words"
                        returnKeyType="done"
                    />
                </View>

                <View style={styles.limitCard}>
                    <View style={styles.limitHead}>
                        <Text style={styles.limitOver}>MONTHLY SPEND LIMIT</Text>
                        <Text style={styles.limitHint}>powers "on pace"</Text>
                    </View>
                    <Text style={styles.limitValue}>{formatAmount(limit, true)}</Text>
                    <Slider
                        label="Monthly spend limit"
                        value={limit}
                        min={LIMIT_MIN}
                        max={LIMIT_MAX}
                        step={LIMIT_STEP}
                        onChange={(monthlySpendLimit) => updateData({ monthlySpendLimit })}
                        formatValue={(v) => formatAmount(v, true)}
                    />
                </View>

                <Text style={styles.overline}>YOUR MAIN GOAL</Text>
                <View style={styles.goals} accessibilityRole="radiogroup" accessibilityLabel="Main goal">
                    {USER_GOALS.map((g) => {
                        const on = data.primaryGoal === g.value;
                        const pair = CATEGORY_PALETTE[g.palette];
                        return (
                            <TouchableOpacity
                                key={g.value}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: on }}
                                onPress={() => updateData({ primaryGoal: g.value })}
                                activeOpacity={0.85}
                                style={[styles.goal, { backgroundColor: pair.bg }, on && styles.goalOn]}
                            >
                                <Icon name={g.icon as any} size={22} color={pair.fg} />
                                <Text style={styles.goalLabel}>{g.label}</Text>
                                {on && (
                                    <View style={styles.goalCheck}><Icon name="check" size={13} color={COLORS.brand} /></View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <Button label="Continue" onPress={goNext} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    skip: { fontSize: 15, fontWeight: '800', color: COLORS.text, paddingVertical: 10, paddingHorizontal: 4 },
    scroll: { gap: SPACING.lg, paddingBottom: SPACING.lg },
    title: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.brand,
        borderWidth: 3,
        borderColor: COLORS.night,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: COLORS.onBrand },
    nameInput: {
        flex: 1,
        minWidth: 0,
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
    limitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    limitOver: { fontSize: 13, fontWeight: '800', color: CATEGORY_PALETTE.bills.fg, letterSpacing: 0.4 },
    limitHint: { fontSize: 12, fontWeight: '700', color: CATEGORY_PALETTE.bills.fg },
    limitValue: { fontSize: 40, lineHeight: 42, fontWeight: '800', letterSpacing: -1, color: COLORS.text },

    overline: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, marginTop: SPACING.xs, letterSpacing: 0.4 },
    goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    goal: {
        width: '48%',
        flexGrow: 1,
        height: 84,
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 14,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    goalOn: { borderWidth: 3, borderColor: COLORS.night, paddingVertical: 9, paddingHorizontal: 11 },
    goalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    goalCheck: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.night,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
