import { useState, useEffect } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { BackupService } from '../services/BackupService';
import { useOnboarding } from '../context/OnboardingContext';
import { Alert } from 'react-native';
import database from '../database';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';

export function useBackup() {
    const { data, updateData } = useOnboarding();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    // Load initial state
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        const currentUser = await GoogleDriveService.getCurrentUser();
        setUser(currentUser);

        try {
            const settingsCollection = database.get<Setting>('settings');
            const records = await settingsCollection.query(Q.where('key', 'last_backup')).fetch();
            if (records.length > 0) {
                const timestamp = JSON.parse(records[0].value);
                setLastBackup(new Date(timestamp).toLocaleString());
            }
        } catch (e) { console.error(e); }
    };

    const toggleDriveBackup = async (enabled: boolean) => {
        if (enabled) {
            try {
                setIsSyncing(true);
                const userInfo = await GoogleDriveService.signIn();
                if (userInfo) {
                    setUser(userInfo);
                    await updateData({ autoBackupEnabled: true });
                    // Perform initial backup immediately
                    await manualBackup();
                } else {
                    // Canceled
                    await updateData({ autoBackupEnabled: false });
                }
            } catch (error) {
                console.error('Toggle backup error:', error);
                Alert.alert('Error', 'Failed to enable Google Drive backup.');
                await updateData({ autoBackupEnabled: false });
            } finally {
                setIsSyncing(false);
            }
        } else {
            try {
                await GoogleDriveService.signOut();
                setUser(null);
                await updateData({ autoBackupEnabled: false });
            } catch (error) {
                console.error('Sign out error:', error);
            }
        }
    };

    const manualBackup = async () => {
        if (isSyncing) return;

        try {
            setIsSyncing(true);
            const success = await BackupService.createBackup();
            if (success) {
                const now = new Date();
                setLastBackup(now.toLocaleString());

                await database.write(async () => {
                    const settingsCollection = database.get<Setting>('settings');
                    const lastBackupKey = 'last_backup';
                    const records = await settingsCollection.query(Q.where('key', lastBackupKey)).fetch();
                    if (records.length > 0) {
                        await records[0].update(s => {
                            s.value = JSON.stringify(now.toISOString());
                        });
                    } else {
                        await settingsCollection.create(s => {
                            s.key = lastBackupKey;
                            s.value = JSON.stringify(now.toISOString());
                        });
                    }
                });

                Alert.alert('Success', 'Backup uploaded to Google Drive successfully.');
            }
        } catch (error: any) {
            console.error('Manual backup error:', error);
            Alert.alert('Backup Failed', error.message || 'Could not upload to Google Drive. Please check your internet connection.');
        } finally {
            setIsSyncing(false);
        }
    };

    const restoreBackup = async () => {
        if (isSyncing) return;

        Alert.alert(
            'Restore Backup',
            'This will OVERWRITE all current data on this device with the version from Google Drive. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsSyncing(true);
                            await BackupService.restoreBackup();
                            Alert.alert('Success', 'Data restored successfully. Please restart the app to see changes.');
                            // Optional: Reload app logic or trigger context refreshes
                        } catch (error: any) {
                            console.error('Restore error:', error);
                            Alert.alert('Restore Failed', error.message || 'Could not find or decrypt backup file.');
                        } finally {
                            setIsSyncing(false);
                        }
                    }
                }
            ]
        );
    };

    return {
        isSyncing,
        lastBackup,
        user,
        autoBackupEnabled: data.autoBackupEnabled || false,
        toggleDriveBackup,
        manualBackup,
        restoreBackup,
    };
}
