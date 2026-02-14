import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';

export function PrivacyPolicyScreen() {
    const { closePrivacyPolicy } = useNavigation();
    const safeTop = useSafeTop();

    return (
        <View style={[styles.container, { paddingTop: safeTop }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={closePrivacyPolicy} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Privacy Policy</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.introCard}>
                    <View style={styles.iconCircle}>
                        <Icon name="security" size={32} color={COLORS.primary} />
                    </View>
                    <Text style={styles.introTitle}>Your Privacy Matters</Text>
                    <Text style={styles.introText}>
                        Sikka is designed to protect your financial data. We believe in transparency and security.
                    </Text>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.cardHeader}>
                        <Icon name="storage" size={20} color={COLORS.primary} style={styles.cardIcon} />
                        <Text style={styles.sectionTitle}>Data Collection</Text>
                    </View>
                    <Text style={styles.paragraph}>
                        We collect minimal data necessary to provide expense tracking services. Your transaction history is stored <Text style={styles.highlight}>locally on your device</Text>.
                    </Text>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.cardHeader}>
                        <Icon name="sms" size={20} color={COLORS.primary} style={styles.cardIcon} />
                        <Text style={styles.sectionTitle}>SMS Access</Text>
                    </View>
                    <Text style={styles.paragraph}>
                        Sikka processes transactional SMS messages on-device to automatically log expenses. We strictly <Text style={styles.highlight}>ignore personal messages</Text> (OTPs, personal chats).
                    </Text>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.cardHeader}>
                        <Icon name="lock" size={20} color={COLORS.primary} style={styles.cardIcon} />
                        <Text style={styles.sectionTitle}>Security</Text>
                    </View>
                    <Text style={styles.paragraph}>
                        Your data is encrypted. We offer <Text style={styles.highlight}>biometric lock</Text> (Fingerprint/FaceID) to ensure only you can access your financial insights.
                    </Text>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.cardHeader}>
                        <Icon name="share" size={20} color={COLORS.primary} style={styles.cardIcon} />
                        <Text style={styles.sectionTitle}>Data Sharing</Text>
                    </View>
                    <Text style={styles.paragraph}>
                        We do <Text style={styles.highlight}>NOT sell or share</Text> your personal data with third parties, advertisers, or financial institutions.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Last updated: February 14, 2026</Text>
                    <Text style={styles.footerContact}>Contact: privacy@sikka.app</Text>
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
        marginBottom: SPACING.md,
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
        marginBottom: SPACING.xl,
        marginTop: SPACING.sm,
        backgroundColor: COLORS.surface,
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    iconCircle: {
        marginBottom: SPACING.md,
        padding: 16,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    introTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.primary, // Green title
        marginBottom: SPACING.xs,
    },
    introText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderLeftWidth: 3, // Accent border
        borderLeftColor: COLORS.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    cardIcon: {
        marginRight: SPACING.sm,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.text,
    },
    paragraph: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
        lineHeight: 24,
    },
    highlight: {
        color: COLORS.primaryLight,
        fontWeight: '500',
    },
    footer: {
        marginTop: SPACING.lg,
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    footerText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    footerContact: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.primary,
        fontWeight: '600',
    }
});
