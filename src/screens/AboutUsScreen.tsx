import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';

export function AboutUsScreen() {
    const { closeAboutUs } = useNavigation();
    const safeTop = useSafeTop();

    const handleContact = () => {
        Linking.openURL('mailto:pawardevelops@gmail.com');
    };

    return (
        <View style={[styles.container, { paddingTop: safeTop }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={closeAboutUs} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>About Sikka</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Beta Warning Card */}
                <View style={[styles.introCard, styles.warningCard]}>
                    <View style={[styles.iconCircle, styles.warningIconCircle]}>
                        <Icon name="science" size={32} color={COLORS.warning} />
                    </View>
                    <Text style={[styles.introTitle, { color: COLORS.warning }]}>Beta Release</Text>
                    <Text style={styles.introText}>
                        This is a <Text style={[styles.highlight, { color: COLORS.warning }]}>BETA version</Text> of Sikka.
                    </Text>
                    <Text style={styles.introText}>
                        It is currently in active development and <Text style={[styles.highlight, { color: COLORS.warning }]}>NOT production ready</Text>.
                    </Text>
                </View>

                {/* Disclaimer Section */}
                <View style={styles.sectionCard}>
                    <View style={styles.cardHeader}>
                        <Icon name="warning" size={20} color={COLORS.error} style={styles.cardIcon} />
                        <Text style={styles.sectionTitle}>Testing Only</Text>
                    </View>

                    <Text style={styles.paragraph}>
                        Please use this app for <Text style={styles.highlight}>testing purposes only</Text>.
                        We rely on your feedback to find bugs and improve the experience.
                    </Text>
                    <Text style={[styles.paragraph, { marginTop: SPACING.md }]}>
                        <Text style={[styles.highlight, { color: COLORS.error }]}>DO NOT</Text> rely on Sikka as your sole method of tracking critical financial data during this phase.
                        Data structures may change, layout bugs may occur, and features may be adjusted.
                    </Text>
                </View>

                {/* Feedback Section */}
                <View style={styles.sectionCard}>
                    <View style={styles.cardHeader}>
                        <Icon name="feedback" size={20} color={COLORS.primary} style={styles.cardIcon} />
                        <Text style={styles.sectionTitle}>We Need Your Feedback</Text>
                    </View>

                    <Text style={styles.paragraph}>
                        Found a bug? Have a suggestion? We'd love to hear from you.
                        Your input helps us build a better offline-first finance tracker.
                    </Text>

                    <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
                        <Icon name="mail" size={20} color={COLORS.background} style={{ marginRight: SPACING.md }} />
                        <Text style={styles.contactButtonText}>Contact Team Sikka</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Version 1.0.0 (Beta)</Text>
                    <Text style={styles.footerText}>Made with ❤️ by Team Sikka</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceLight,
    },
    backButton: {
        marginRight: SPACING.md,
        padding: SPACING.xs,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.full,
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: COLORS.text,
    },
    content: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    introCard: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.surface,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
    },
    warningCard: {
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)', // Warning color fade
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
    },
    iconCircle: {
        marginBottom: SPACING.sm,
        padding: 12,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.full,
    },
    warningIconCircle: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
    },
    introTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 8,
    },
    introText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 4,
    },
    sectionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    cardIcon: {
        marginRight: SPACING.sm,
    },
    sectionTitle: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.text,
    },
    paragraph: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    highlight: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    contactButton: {
        marginTop: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    contactButtonText: {
        color: COLORS.background,
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
});
