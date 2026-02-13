/**
 * Sikka - Welcome Screen (Onboarding Step 1)
 * Language, currency, and number system selection
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useOnboarding, LANGUAGES, NUMBER_SYSTEMS } from '../../context/OnboardingContext';
import { CURRENCIES } from '../../context/CurrencyContext';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { Icon } from '../../components/Icon';
import { Language, NumberSystem, CurrencyCode } from '../../types';

export function WelcomeScreen() {
    const { currentStep, data, updateData, goNext } = useOnboarding();
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

    const handleLanguageSelect = (language: Language) => {
        updateData({ language });
    };

    const handleCurrencySelect = (currency: CurrencyCode) => {
        updateData({ currency });
        setShowCurrencyPicker(false);
    };

    const handleNumberSystemSelect = (numberSystem: NumberSystem) => {
        updateData({ numberSystem });
    };

    const selectedCurrency = CURRENCIES.find(c => c.code === data.currency);

    return (
        <View style={styles.container}>
            <OnboardingProgress currentStep={currentStep} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Icon name="waving-hand" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Namaste</Text>
                    <Text style={styles.subtitle}>
                        Select your preferred language to get started with Sikka.
                    </Text>
                </View>

                {/* Language Selection */}
                <Text style={styles.sectionLabel}>SELECT LANGUAGE</Text>
                <View style={styles.languageList}>
                    {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                            key={lang.value}
                            style={[
                                styles.languageOption,
                                data.language === lang.value && styles.languageOptionActive,
                            ]}
                            onPress={() => handleLanguageSelect(lang.value)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.languageIcon,
                                data.language === lang.value && styles.languageIconActive,
                            ]}>
                                <Text style={[
                                    styles.languageIconText,
                                    data.language === lang.value && styles.languageIconTextActive,
                                ]}>
                                    {lang.icon}
                                </Text>
                            </View>
                            <Text style={styles.languageLabel}>{lang.label}</Text>
                            <View style={[
                                styles.radioOuter,
                                data.language === lang.value && styles.radioOuterActive,
                            ]}>
                                {data.language === lang.value && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Regional Settings */}
                <Text style={styles.sectionLabel}>REGIONAL SETTINGS</Text>

                {/* Currency Dropdown */}
                <Text style={styles.fieldLabel}>Currency</Text>
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                    activeOpacity={0.7}
                >
                    <View style={{ marginRight: SPACING.md }}>
                        <Icon name="attach-money" size={20} color={COLORS.text} />
                    </View>
                    <Text style={styles.dropdownText}>
                        {selectedCurrency?.name} ({selectedCurrency?.symbol})
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>

                {showCurrencyPicker && (
                    <View style={styles.currencyPicker}>
                        {CURRENCIES.map((currency) => (
                            <TouchableOpacity
                                key={currency.code}
                                style={[
                                    styles.currencyOption,
                                    data.currency === currency.code && styles.currencyOptionActive,
                                ]}
                                onPress={() => handleCurrencySelect(currency.code)}
                            >
                                <Text style={styles.currencyText}>
                                    {currency.symbol} {currency.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Number System Toggle */}
                <View style={styles.numberSystemContainer}>
                    <View>
                        <Text style={styles.numberSystemTitle}>Number System</Text>
                        <Text style={styles.numberSystemSubtitle}>Format for large numbers</Text>
                    </View>
                    <View style={styles.toggleContainer}>
                        {NUMBER_SYSTEMS.map((system) => (
                            <TouchableOpacity
                                key={system.value}
                                style={[
                                    styles.toggleOption,
                                    data.numberSystem === system.value && styles.toggleOptionActive,
                                ]}
                                onPress={() => handleNumberSystemSelect(system.value)}
                            >
                                <Text style={[
                                    styles.toggleText,
                                    data.numberSystem === system.value && styles.toggleTextActive,
                                ]}>
                                    {system.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Continue Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueButton} onPress={goNext} activeOpacity={0.8}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Icon name="arrow-forward" size={20} color={COLORS.background} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxxl,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    waveIcon: {
        fontSize: 40,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: SPACING.md,
        marginTop: SPACING.lg,
    },
    languageList: {
        gap: SPACING.md,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    languageOptionActive: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: COLORS.primary,
    },
    languageIcon: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    languageIconActive: {
        backgroundColor: COLORS.primary,
    },
    languageIconText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.text,
    },
    languageIconTextActive: {
        color: COLORS.background,
    },
    languageLabel: {
        flex: 1,
        fontSize: FONT_SIZE.lg,
        fontWeight: '500',
        color: COLORS.text,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterActive: {
        borderColor: COLORS.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },
    fieldLabel: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdownIcon: {
        fontSize: 20,
        marginRight: SPACING.md,
    },
    dropdownText: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
    },
    dropdownArrow: {
        fontSize: 20,
        color: COLORS.textMuted,
    },
    currencyPicker: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    currencyOption: {
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    currencyOptionActive: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    currencyText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
    },
    numberSystemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginTop: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    numberSystemTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
    },
    numberSystemSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: 4,
    },
    toggleOption: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
    },
    toggleOptionActive: {
        backgroundColor: COLORS.primary,
    },
    toggleText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    toggleTextActive: {
        color: COLORS.background,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
        paddingTop: SPACING.lg,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.xl,
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    continueButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.background,
    },
    continueArrow: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.background,
    },
});
