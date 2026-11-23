/**
 * Sikka - Welcome (Onboarding 1 of 4)
 * Design: design-system/screens/Welcome-v2.html
 * Sikku hero, language, currency and number format.
 */

import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Typography';
import { useOnboarding, ONBOARDING_STEPS } from '../../context/OnboardingContext';
import { CURRENCIES } from '../../context/CurrencyContext';
import { COLORS, SPACING, CATEGORY_PALETTE } from '../../constants/theme';
import { Button, Segmented, StepDots, Sikku, Chip } from '../../components/ui';
import { Language } from '../../types';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'hinglish', label: 'Hinglish' },
];

export function WelcomeScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, data, updateData, goNext } = useOnboarding();
    const [showCurrencies, setShowCurrencies] = useState(false);
    const currency = CURRENCIES.find((c) => c.code === data.currency) ?? CURRENCIES[0];
    const isLakhs = data.numberSystem === 'lakhs';

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <StepDots total={ONBOARDING_STEPS} current={currentStep} />

                {/* Hero: Sikku on lilac with coin stack */}
                <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <View style={[styles.blob, styles.blobPeach]} />
                    <View style={[styles.blob, styles.blobLime]} />
                    <View style={[styles.coin, { bottom: 76 }]} />
                    <View style={[styles.coin, { bottom: 58 }]} />
                    <View style={[styles.coin, { bottom: 40 }]} />
                    <View style={styles.sikku}><Sikku size={170} /></View>
                    <View style={styles.speech}><Text style={styles.speechText}>Namaste! I'm Sikku</Text></View>
                </View>

                <View>
                    <Text style={styles.title} accessibilityRole="header">Money that tracks itself.</Text>
                    <Text style={styles.body}>Sikka reads payment SMS, asks one tiny question, and never leaves your phone.</Text>
                </View>

                <Segmented
                    label="Language"
                    options={LANGUAGE_OPTIONS}
                    value={data.language}
                    onChange={(language) => updateData({ language })}
                    tone="pills"
                />

                <View style={styles.tiles}>
                    <TouchableOpacity
                        style={[styles.tile, { backgroundColor: CATEGORY_PALETTE.bills.bg }]}
                        onPress={() => setShowCurrencies((v) => !v)}
                        accessibilityRole="button"
                        accessibilityLabel={`Currency ${currency.name}. Change`}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.bills.fg }]}>CURRENCY</Text>
                        <Text style={styles.tileValue}>{currency.symbol} {currency.code}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tile, { backgroundColor: CATEGORY_PALETTE.transport.bg }]}
                        onPress={() => updateData({ numberSystem: isLakhs ? 'millions' : 'lakhs' })}
                        accessibilityRole="button"
                        accessibilityLabel={`Number format ${isLakhs ? 'lakhs' : 'millions'}. Switch`}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.tileOver, { color: CATEGORY_PALETTE.transport.fg }]}>NUMBERS</Text>
                        <Text style={styles.tileValue}>{isLakhs ? '1,00,000' : '100,000'}</Text>
                    </TouchableOpacity>
                </View>

                {showCurrencies && (
                    <View style={styles.currencyList}>
                        {CURRENCIES.map((c) => (
                            <Chip
                                key={c.code}
                                label={`${c.symbol} ${c.code}`}
                                selected={c.code === currency.code}
                                tone={c.code === currency.code ? 'night' : 'surface'}
                                onPress={() => {
                                    updateData({ currency: c.code });
                                    setShowCurrencies(false);
                                }}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            <Button label="Let's start" onPress={goNext} style={styles.cta} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg },
    scroll: { gap: SPACING.lg, paddingBottom: SPACING.lg },

    hero: { height: 300, borderRadius: 36, backgroundColor: CATEGORY_PALETTE.fun.bg, overflow: 'hidden' },
    blob: { position: 'absolute', borderRadius: 999 },
    blobPeach: { left: -40, bottom: -60, width: 200, height: 200, backgroundColor: CATEGORY_PALETTE.dining.bg },
    blobLime: { right: -30, top: -30, width: 150, height: 150, backgroundColor: CATEGORY_PALETTE.groceries.bg },
    coin: {
        position: 'absolute',
        right: 36,
        width: 70,
        height: 20,
        borderRadius: 10,
        backgroundColor: CATEGORY_PALETTE.bills.bg,
        borderWidth: 3,
        borderColor: COLORS.night,
    },
    sikku: { position: 'absolute', left: 0, right: 0, top: 62, alignItems: 'center' },
    speech: {
        position: 'absolute',
        left: 18,
        top: 18,
        backgroundColor: COLORS.surface,
        borderRadius: 999,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    speechText: { fontSize: 13, fontWeight: '800', color: COLORS.text },

    title: { fontSize: 36, lineHeight: 38, fontWeight: '800', letterSpacing: -1, color: COLORS.text },
    body: { fontSize: 16, lineHeight: 23, color: COLORS.textSecondary, marginTop: SPACING.sm },

    tiles: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, borderRadius: 24, padding: 14 },
    tileOver: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
    tileValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 2 },

    currencyList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },

    cta: { marginTop: SPACING.md },
});
