/**
 * Welcome → "New phone? Restore from a backup".
 * Signs in to Google Drive, restores the encrypted backup and restarts the app.
 * Journey map low point: "Phone lost" (1/5).
 */
import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from '../../components/Typography';
import { BottomSheet, Button } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { COLORS, SPACING, CATEGORY_PALETTE } from '../../constants/theme';
import { GoogleDriveService } from '../../services/GoogleDriveService';
import { BackupService } from '../../services/BackupService';
import { useAppLifecycle } from '../../context/AppLifecycleContext';

type Phase = 'idle' | 'working' | 'none' | 'error';

export function RestoreSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { resetApp } = useAppLifecycle();
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState('');

    const restore = async () => {
        setPhase('working');
        try {
            const user = await GoogleDriveService.signIn();
            if (!user) {
                setPhase('idle');
                return;
            }
            const token = await GoogleDriveService.getAccessToken();
            if (!token || !(await BackupService.checkIfBackupExists(token))) {
                setPhase('none');
                return;
            }
            await BackupService.restoreBackup();
            onClose();
            resetApp();
        } catch (e: any) {
            setError(e?.message || 'Could not restore.');
            setPhase('error');
        }
    };

    return (
        <BottomSheet visible={visible} onClose={onClose} label="Restore from a backup">
            <View style={styles.body}>
                <View style={styles.icon}><Icon name="cloud-download" size={28} color={CATEGORY_PALETTE.transport.fg} /></View>
                <Text style={styles.title} accessibilityRole="header">Restore from Google Drive</Text>
                <Text style={styles.text}>
                    Sign in with the Google account you backed up to. Payments, accounts, rules and plans come back on this phone.
                </Text>
                {phase === 'working' && (
                    <View style={styles.row}>
                        <ActivityIndicator color={COLORS.text} />
                        <Text style={styles.text}>Restoring… keep Sikka open.</Text>
                    </View>
                )}
                {phase === 'none' && (
                    <Text style={styles.warn}>No Sikka backup in this Google account. Try another account, or start fresh.</Text>
                )}
                {phase === 'error' && <Text style={styles.warn}>{error} Check your connection and try again.</Text>}
                <Button label={phase === 'none' || phase === 'error' ? 'Try again' : 'Sign in and restore'} icon="cloud-download" onPress={restore} loading={phase === 'working'} />
                <Button label="Start fresh instead" variant="soft" icon={null} onPress={onClose} />
            </View>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    body: { gap: SPACING.lg },
    icon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: CATEGORY_PALETTE.transport.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontSize: 26, lineHeight: 30, fontWeight: '800', color: COLORS.text },
    text: { fontSize: 16, lineHeight: 23, color: COLORS.text },
    warn: { fontSize: 15, fontWeight: '700', color: COLORS.error },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
});
