/**
 * Sikka - Add a subscription
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { COLORS, SPACING } from '../constants/theme';
import { Button, IconButton } from './ui';
import { SubscriptionForm, toDraft, toPayload, isDraftValid, SubscriptionDraft } from './SubscriptionForm';

interface AddSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (subData: any) => void;
}

export function AddSubscriptionModal({ visible, onClose, onAdd }: AddSubscriptionModalProps) {
    const insets = useSafeAreaInsets();
    const [draft, setDraft] = useState<SubscriptionDraft>(toDraft());

    useEffect(() => {
        if (visible) setDraft(toDraft());
    }, [visible]);

    const save = () => {
        if (!isDraftValid(draft)) return;
        onAdd(toPayload(draft));
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.container, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }]}
            >
                <View style={styles.header}>
                    <IconButton icon="close" label="Close" onPress={onClose} />
                    <Text style={styles.title} accessibilityRole="header">New subscription</Text>
                </View>
                <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <SubscriptionForm draft={draft} onChange={setDraft} />
                </ScrollView>
                <Button label="Add subscription" icon="check" onPress={save} disabled={!isDraftValid(draft)} />
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
});
