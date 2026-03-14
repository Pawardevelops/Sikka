import { useState, useEffect } from 'react';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { BackupService } from '../services/BackupService';
import { useOnboarding } from '../context/OnboardingContext';
import database from '../database';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';
import { ModalAction, ModalType } from '../components/CustomModal';

export interface UseBackupOptions {
    showModal?: (title: string, message: string, actions: ModalAction[], type?: ModalType, icon?: string) => void;
}

export function useBackup(options?: UseBackupOptions) {
    const { showModal } = options || {};
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
                    
                    const token = await GoogleDriveService.getAccessToken();
                    let hasBackup = false;
                    if (token) {
                        hasBackup = await BackupService.checkIfBackupExists(token);
                    }
                    
                    if (hasBackup) {
                        if (showModal) {
                            showModal(
                                'Backup Found',
                                'A previous backup was found in your Google Drive. Would you like to restore it now?',
                                [
                                    { text: 'Skip', style: 'cancel', onPress: () => {} },
                                    { text: 'Restore', onPress: restoreBackup, style: 'primary' }
                                ],
                                'info'
                            );
                        } else {
                            // Fallback
                            console.log('Skipping restore prompt, showModal not provided.');
                        }
                    } else {
                        // Perform initial backup immediately
                        await manualBackup(true);
                    }
                } else {
                    // Canceled
                    await updateData({ autoBackupEnabled: false });
                }
            } catch (error) {
                console.error('Toggle backup error:', error);
                if (showModal) {
                    showModal('Error', 'Failed to enable Google Drive backup.', [{ text: 'OK', style: 'primary', onPress: () => {} }], 'error');
                }
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

    const manualBackup = async (skipConfirm: boolean = false) => {
        if (isSyncing) return;

        const performBackup = async () => {
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

                    if (showModal) {
                        showModal('Success', 'Backup uploaded to Google Drive successfully.', [{ text: 'OK', style: 'primary', onPress: () => {} }], 'success');
                    }
                }
            } catch (error: any) {
                console.error('Manual backup error:', error);
                if (showModal) {
                    showModal('Backup Failed', error.message || 'Could not upload to Google Drive. Please check your internet connection.', [{ text: 'OK', style: 'primary', onPress: () => {} }], 'error');
                }
            } finally {
                setIsSyncing(false);
            }
        };

        if (skipConfirm === true) {
            await performBackup();
        } else {
            if (showModal) {
                showModal(
                    'Confirm Backup',
                    'Are you sure you want to backup your data now? This will overwrite your existing backup in Google Drive.',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => {} },
                        { text: 'Backup', onPress: performBackup, style: 'primary' }
                    ],
                    'warning'
                );
            } else {
                await performBackup();
            }
        }
    };

    const restoreBackup = async () => {
        if (isSyncing) return;

        if (showModal) {
            showModal(
                'Restore Backup',
                'This will OVERWRITE all current data on this device with the version from Google Drive. Are you sure?',
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => {} },
                    {
                        text: 'Restore',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setIsSyncing(true);
                                await BackupService.restoreBackup();
                                showModal('Success', 'Data restored successfully. Please restart the app to see changes.', [{ text: 'OK', style: 'primary', onPress: () => {} }], 'success');
                            } catch (error: any) {
                                console.error('Restore error:', error);
                                showModal('Restore Failed', error.message || 'Could not find or decrypt backup file.', [{ text: 'OK', style: 'primary', onPress: () => {} }], 'error');
                            } finally {
                                setIsSyncing(false);
                            }
                        }
                    }
                ],
                'error'
            );
        }
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
