/**
 * Shared frame for the pushed v3 screens: round back button, title, optional
 * right action, a scrolling body and an optional pinned bottom action.
 */
import React, { ReactNode } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Typography';
import { IconButton } from '../../components/ui';
import { COLORS, SPACING } from '../../constants/theme';
import { useNavigation } from '../../context/NavigationContext';

export function Frame({
    title,
    sub,
    right,
    children,
    bottom,
    onBack,
    scroll = true,
    contentStyle,
    big,
}: {
    title?: string;
    sub?: string;
    right?: ReactNode;
    children: ReactNode;
    bottom?: ReactNode;
    onBack?: () => void;
    scroll?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
    /** Large page title under the header instead of a small one in it. */
    big?: boolean;
}) {
    const insets = useSafeAreaInsets();
    const { closeScreen } = useNavigation();
    const Body: any = scroll ? ScrollView : View;
    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + SPACING.lg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <IconButton icon="chevron-left" label="Back" onPress={onBack ?? closeScreen} iconSize={26} />
                <View style={{ flex: 1 }}>
                    {!big && !!title && <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>}
                </View>
                {right}
            </View>
            <Body
                {...(scroll ? { contentContainerStyle: [styles.content, contentStyle], keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false } : { style: [styles.content, { flex: 1 }, contentStyle] })}
            >
                {big && !!title && (
                    <View style={{ gap: 4 }}>
                        <Text style={styles.bigTitle} accessibilityRole="header">{title}</Text>
                        {!!sub && <Text style={styles.sub}>{sub}</Text>}
                    </View>
                )}
                {!big && !!sub && <Text style={styles.sub}>{sub}</Text>}
                {children}
            </Body>
            {bottom && <View style={styles.bottom}>{bottom}</View>}
        </KeyboardAvoidingView>
    );
}

export const frameStyles = StyleSheet.create({
    over: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
    card: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, gap: SPACING.sm },
    body: { fontSize: 15, lineHeight: 21, color: COLORS.text },
    muted: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    bigTitle: { fontSize: 32, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8, color: COLORS.text },
    sub: { fontSize: 16, lineHeight: 22, color: COLORS.textSecondary },
    content: { gap: SPACING.lg, paddingBottom: SPACING.lg },
    bottom: { gap: SPACING.sm },
});
