/**
 * Sikka - Profile Setup Screen (Onboarding Step 2)
 * Name, goal, and hide balances preference
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
} from 'react-native';
import { useOnboarding, USER_GOALS } from '../../context/OnboardingContext';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';

export function ProfileSetupScreen() {
    const { currentStep, data, updateData, goNext, goBack } = useOnboarding();
    const [showGoalPicker, setShowGoalPicker] = useState(false);

    const handleContinue = () => {
        goNext();
    };

    const handleSkip = () => {
        goNext();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PROFILE SETUP</Text>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <OnboardingProgress currentStep={currentStep} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Text style={styles.title}>What should we{'\n'}call you?</Text>
                <Text style={styles.subtitle}>Personalize your local offline profile.</Text>

                {/* Name Input */}
                <Text style={styles.fieldLabel}>Your Name</Text>
                <View style={styles.inputContainer}>
                    <View style={{ marginRight: SPACING.md }}>
                        <Icon name="person" size={20} color={COLORS.textMuted} />
                    </View>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Nayan jyotipatwari"
                        placeholderTextColor={COLORS.textMuted}
                        value={data.userName}
                        onChangeText={(text) => updateData({ userName: text })}
                    />
                </View>

                {/* Goal Selection */}
                <Text style={styles.fieldLabel}>Primary Income Goal</Text>
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowGoalPicker(!showGoalPicker)}
                    activeOpacity={0.7}
                >
                    <View style={{ marginRight: SPACING.md }}>
                        <Icon name="track-changes" size={20} color={COLORS.textMuted} />
                    </View>
                    <Text style={[
                        styles.dropdownText,
                        !data.primaryGoal && styles.dropdownPlaceholder,
                    ]}>
                        {data.primaryGoal || 'Select a goal'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>

                {showGoalPicker && (
                    <View style={styles.goalPicker}>
                        {USER_GOALS.map((goal) => (
                            <TouchableOpacity
                                key={goal}
                                style={[
                                    styles.goalOption,
                                    data.primaryGoal === goal && styles.goalOptionActive,
                                ]}
                                onPress={() => {
                                    updateData({ primaryGoal: goal });
                                    setShowGoalPicker(false);
                                }}
                            >
                                <Text style={styles.goalText}>{goal}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Hide Balances Card */}
                <View style={styles.hideBalancesCard}>
                    <View style={styles.hideBalancesIconContainer}>
                        <Icon name="visibility-off" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.hideBalancesContent}>
                        <View style={styles.hideBalancesHeader}>
                            <Text style={styles.hideBalancesTitle}>Hide balances by default</Text>
                            <Switch
                                value={data.hideBalances}
                                onValueChange={(value) => updateData({ hideBalances: value })}
                                trackColor={{ false: COLORS.surfaceLight, true: COLORS.primaryMuted }}
                                thumbColor={data.hideBalances ? COLORS.primary : COLORS.textMuted}
                            />
                        </View>
                        <Text style={styles.hideBalancesDescription}>
                            Masks numerical values with asterisks (****) on the dashboard.
                            Useful when checking Sikka in busy markets or public spaces.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Continue Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8}>
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
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingTop: 60,
        paddingBottom: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 24,
        color: COLORS.text,
    },
    headerTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    skipText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxxl,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxl,
    },
    fieldLabel: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        marginTop: SPACING.lg,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: {
        fontSize: 20,
        marginRight: SPACING.md,
    },
    textInput: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
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
    dropdownPlaceholder: {
        color: COLORS.textMuted,
    },
    dropdownArrow: {
        fontSize: 20,
        color: COLORS.textMuted,
    },
    goalPicker: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    goalOption: {
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    goalOptionActive: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    goalText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.text,
    },
    hideBalancesCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginTop: SPACING.xxl,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    hideBalancesIconContainer: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    hideBalancesIcon: {
        fontSize: 24,
    },
    hideBalancesContent: {
        flex: 1,
    },
    hideBalancesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    hideBalancesTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    hideBalancesDescription: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
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
