/**
 * Sikka - "Use a local AI?" (Onboarding step 2 of 5)
 * Design: Sikka v3 canvas "03 Use local AI?".
 *
 * One choice: local AI reads bank SMS on the phone, or no AI (add by hand).
 * The disclosure text sits right above the button that triggers Android's SMS
 * permission prompt, as Google Play requires for SMS-based money management.
 */

import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform, PermissionsAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Typography';
import { Icon, IconName } from '../../components/Icon';
import { useOnboarding, ONBOARDING_DOTS, dotFor } from '../../context/OnboardingContext';
import { usePrefs, AiMode } from '../../context/PrefsContext';
import { COLORS, SPACING, SHADOWS, CATEGORY_PALETTE, SIKKA } from '../../constants/theme';
import { Button, IconButton, StepDots } from '../../components/ui';
import { askNotificationPermission } from '../../services/notify';

export function AutoCaptureScreen() {
    const insets = useSafeAreaInsets();
    const { currentStep, goToStep } = useOnboarding();
    const { prefs, update } = usePrefs();
    const [choice, setChoice] = useState<AiMode>(prefs.aiMode ?? 'local');
    const [asking, setAsking] = useState(false);
    const [denied, setDenied] = useState(false);

    const onContinue = async () => {
        if (choice === 'none') {
            update({ aiMode: 'none' });
            goToStep(6);
            return;
        }
        setAsking(true);
        try {
            if (Platform.OS === 'android') {
                const result = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                    PermissionsAndroid.PERMISSIONS.READ_SMS,
                ]);
                const ok = Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
                if (!ok) {
                    setDenied(true);
                    return;
                }
                await askNotificationPermission().catch(() => false);
            }
            update({ aiMode: 'local' });
            goToStep(4);
        } finally {
            setAsking(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xxl }]}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" label="Back" onPress={() => goToStep(2)} iconSize={26} />
                <View style={{ flex: 1 }}><StepDots total={ONBOARDING_DOTS} current={dotFor(currentStep)} /></View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Preview />

                <View style={styles.pipeline} accessibilityLabel="The AI reads, files it, you swipe">
                    <Step n={1} label="AI reads" />
                    <Icon name="arrow-forward" size={18} color={COLORS.textSecondary} />
                    <Step n={2} label="Files it" />
                    <Icon name="arrow-forward" size={18} color={COLORS.textSecondary} />
                    <Step n={3} label="You swipe" />
                </View>

                <Text style={styles.title} accessibilityRole="header">Use a local AI?</Text>

                <View accessibilityRole="radiogroup" accessibilityLabel="Use a local AI?" style={{ gap: SPACING.md }}>
                    <Option
                        selected={choice === 'local'}
                        onPress={() => setChoice('local')}
                        icon="auto-awesome"
                        palette="groceries"
                        title="Use local AI"
                        badge="Recommended"
                        body="Reads your bank SMS for you. Learns the names you give. One-time download."
                    />
                    <Option
                        selected={choice === 'none'}
                        onPress={() => setChoice('none')}
                        icon="edit"
                        palette="bills"
                        title="No AI"
                        body="No SMS access. You add payments by hand. Turn AI on later in Settings."
                    />
                </View>
            </ScrollView>

            {choice === 'local' && (
                <View style={styles.disclosure} accessibilityRole="text">
                    <Icon name="lock" size={18} color={COLORS.primary} />
                    <Text style={styles.disclosureText}>
                        Sikka reads only bank SMS to find payments. Personal messages are skipped. Nothing leaves this phone.
                    </Text>
                </View>
            )}
            {denied && (
                <Text style={styles.denied} accessibilityLiveRegion="polite">
                    Android said no to SMS access. Allow it to use the AI, or pick "No AI".
                </Text>
            )}
            <Button
                label={choice === 'local' ? 'Continue · Android asks next' : 'Continue'}
                onPress={onContinue}
                loading={asking}
            />
        </View>
    );
}

/** A still frame of the capture loop: bank SMS → Sikku reads → keep / not mine. */
function Preview() {
    return (
        <View style={styles.preview} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.sms}>
                <View style={styles.smsIcon}><Icon name="sms" size={16} color={COLORS.onNight} /></View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.smsFrom}>Messages · HDFCBK</Text>
                    <Text style={styles.smsBody} numberOfLines={1}>Rs.612 debited A/c XX7731 to blinkit…</Text>
                </View>
            </View>
            <View style={styles.reading}>
                <Icon name="auto-awesome" size={14} color={COLORS.onBrand} />
                <Text style={styles.readingText}>Sikku reading…</Text>
            </View>
            <View style={styles.cards}>
                <MiniCard name="Blinkit" cat="Groceries" amount="₹612" tag="✓ Keep" palette="groceries" />
                <MiniCard name="Uber" cat="Travel" amount="₹1,450" tag="Not mine ✕" palette="shopping" muted />
            </View>
        </View>
    );
}

function MiniCard({ name, cat, amount, tag, palette, muted }: { name: string; cat: string; amount: string; tag: string; palette: 'groceries' | 'shopping'; muted?: boolean }) {
    const pair = CATEGORY_PALETTE[palette];
    return (
        <View style={[styles.mini, muted && { opacity: 0.6, transform: [{ rotate: '3deg' }] }]}>
            <View style={[styles.miniTag, { backgroundColor: pair.bg }]}><Text style={[styles.miniTagText, { color: pair.fg }]}>{tag}</Text></View>
            <Text style={styles.miniName}>{name}</Text>
            <Text style={styles.miniCat}>{cat}</Text>
            <Text style={styles.miniAmount}>{amount}</Text>
        </View>
    );
}

function Step({ n, label }: { n: number; label: string }) {
    return (
        <View style={styles.step}>
            <View style={styles.stepN}><Text style={styles.stepNText}>{n}</Text></View>
            <Text style={styles.stepLabel}>{label}</Text>
        </View>
    );
}

function Option({
    selected, onPress, icon, palette, title, badge, body,
}: {
    selected: boolean; onPress: () => void; icon: IconName; palette: 'groceries' | 'bills'; title: string; badge?: string; body: string;
}) {
    const pair = CATEGORY_PALETTE[palette];
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${title}. ${badge ? badge + '. ' : ''}${body}`}
            style={[styles.option, selected && styles.optionOn]}
        >
            <View style={[styles.optionIcon, { backgroundColor: pair.bg }]}><Icon name={icon} size={22} color={pair.fg} /></View>
            <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.optionHead}>
                    <Text style={styles.optionTitle}>{title}</Text>
                    {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
                </View>
                <Text style={styles.optionBody}>{body}</Text>
            </View>
            <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    scroll: { gap: SPACING.lg, paddingBottom: SPACING.lg },
    title: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },

    preview: { backgroundColor: CATEGORY_PALETTE.fun.bg, borderRadius: 30, padding: SPACING.lg, gap: SPACING.md },
    sms: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 18, padding: 12, ...SHADOWS.sm },
    smsIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.night, alignItems: 'center', justifyContent: 'center' },
    smsFrom: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
    smsBody: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    reading: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SIKKA.lime, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
    readingText: { fontSize: 13, fontWeight: '800', color: COLORS.onBrand },
    cards: { flexDirection: 'row', gap: SPACING.md },
    mini: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, padding: 12, gap: 2, ...SHADOWS.sm },
    miniTag: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
    miniTagText: { fontSize: 12, fontWeight: '800' },
    miniName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    miniCat: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    miniAmount: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 4 },

    pipeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    step: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepN: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.night, alignItems: 'center', justifyContent: 'center' },
    stepNText: { fontSize: 12, fontWeight: '800', color: COLORS.brand },
    stepLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },

    option: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, ...SHADOWS.sm },
    optionOn: { borderWidth: 3, borderColor: COLORS.night, padding: SPACING.lg - 3 },
    optionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    optionHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
    optionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    optionBody: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
    badge: { backgroundColor: COLORS.brand, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 12, fontWeight: '800', color: COLORS.onBrand },
    radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#BDB5A6', alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: COLORS.night, backgroundColor: COLORS.night },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.brand },

    disclosure: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', backgroundColor: CATEGORY_PALETTE.groceries.bg, borderRadius: 18, padding: SPACING.md },
    disclosureText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: CATEGORY_PALETTE.groceries.fg },
    denied: { fontSize: 14, fontWeight: '800', color: COLORS.error },
});
