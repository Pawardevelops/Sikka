import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';

// Enable LayoutAnimation for smooth expansion on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function PrivacyPolicyScreen() {
    const { closePrivacyPolicy } = useNavigation();
    const safeTop = useSafeTop();

    // State to manage expanded sections
    const [expanded, setExpanded] = useState({
        collection: false,
        permissions: false,
        security: false,
    });

    const toggleSection = (section) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <View style={[styles.container, { paddingTop: safeTop }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={closePrivacyPolicy} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Privacy Policy</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Intro Card */}
                <View style={styles.introCard}>
                    <View style={styles.iconCircle}>
                        <Icon name="security" size={32} color={COLORS.primary} />
                    </View>
                    <Text style={styles.introTitle}>Your Privacy Matters</Text>
                    <Text style={styles.introText}>
                        At Sikka, your financial data is <Text style={styles.highlight}>yours and yours alone</Text>.
                    </Text>
                </View>

                {/* Data Collection Section */}
                <View style={styles.sectionCard}>
                    <TouchableOpacity onPress={() => toggleSection('collection')} activeOpacity={0.7}>
                        <View style={styles.cardHeader}>
                            <Icon name="storage" size={20} color={COLORS.primary} style={styles.cardIcon} />
                            <Text style={styles.sectionTitle}>Data Collection</Text>
                            <Icon name={expanded.collection ? "expand-less" : "expand-more"} size={24} color={COLORS.textMuted} />
                        </View>
                    </TouchableOpacity>
                    
                    <Text style={styles.paragraph} numberOfLines={expanded.collection ? undefined : 2}>
                        Sikka is an <Text style={styles.highlight}>offline-first</Text> app. All your data stays <Text style={styles.highlight}>on your device</Text>. 
                        We <Text style={styles.highlight}>do not use external servers</Text> or cloud sync.
                    </Text>
                    <TouchableOpacity onPress={() => toggleSection('collection')}>
                        <Text style={styles.moreButton}>{expanded.collection ? "Show less" : "Read more"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Device Permissions Section */}
                <View style={styles.sectionCard}>
                    <TouchableOpacity onPress={() => toggleSection('permissions')} activeOpacity={0.7}>
                        <View style={styles.cardHeader}>
                            <Icon name="sms" size={20} color={COLORS.primary} style={styles.cardIcon} />
                            <Text style={styles.sectionTitle}>Device Permissions</Text>
                            <Icon name={expanded.permissions ? "expand-less" : "expand-more"} size={24} color={COLORS.textMuted} />
                        </View>
                    </TouchableOpacity>
                    
                    <Text style={styles.paragraph} numberOfLines={expanded.permissions ? undefined : 2}>
                        We request <Text style={styles.highlight}>Notifications</Text> for reminders and <Text style={styles.highlight}>Storage access</Text> for manual backups. 
                        Biometric data is <Text style={styles.highlight}>never accessible</Text> by Sikka; it is handled safely by your phone's system.
                    </Text>
                    <TouchableOpacity onPress={() => toggleSection('permissions')}>
                        <Text style={styles.moreButton}>{expanded.permissions ? "Show less" : "Read more"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Data Security Section */}
                <View style={styles.sectionCard}>
                    <TouchableOpacity onPress={() => toggleSection('security')} activeOpacity={0.7}>
                        <View style={styles.cardHeader}>
                            <Icon name="lock" size={20} color={COLORS.primary} style={styles.cardIcon} />
                            <Text style={styles.sectionTitle}>Data Security</Text>
                            <Icon name={expanded.security ? "expand-less" : "expand-more"} size={24} color={COLORS.textMuted} />
                        </View>
                    </TouchableOpacity>
                    
                    <Text style={styles.paragraph} numberOfLines={expanded.security ? undefined : 2}>
                        Your database is <Text style={styles.highlight}>locally encrypted</Text>. Because data is offline, your security depends on your <Text style={styles.highlight}>device passcode</Text>. 
                        Be careful when <Text style={styles.highlight}>sharing exported backup files</Text>.
                    </Text>
                    <TouchableOpacity onPress={() => toggleSection('security')}>
                        <Text style={styles.moreButton}>{expanded.security ? "Show less" : "Read more"}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Last updated: February 14, 2026</Text>
                    <Text style={styles.footerContact}>pawardevelops@gmail.com</Text>
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
    iconCircle: {
        marginBottom: SPACING.sm,
        padding: 12,
        backgroundColor: COLORS.primaryMuted,
        borderRadius: BORDER_RADIUS.full,
    },
    introTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 4,
    },
    introText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    sectionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        // Small height handled by padding and text lines
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
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
    moreButton: {
        color: COLORS.primary,
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        marginTop: 8,
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
    },
    footerContact: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.primary,
        fontWeight: '600',
        marginTop: 4,
    }
});