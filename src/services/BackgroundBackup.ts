import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import NetInfo from '@react-native-community/netinfo';
import { BackupService } from './BackupService';
import { GoogleDriveService } from './GoogleDriveService';
import database from '../database';
import User from '../database/models/User';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';

const BACKGROUND_BACKUP_TASK = 'BACKGROUND_BACKUP_TASK';

TaskManager.defineTask(BACKGROUND_BACKUP_TASK, async () => {
    try {
        const now = new Date();
        // 1. Check Network
        const netState = await NetInfo.fetch();
        if (netState.type !== 'wifi') {
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // 2. Check if user has enabled auto-backup (from Users table)
        const usersCollection = database.get<User>('users');
        const users = await usersCollection.query().fetch();
        if (users.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

        const currentUserProfile = users[0]; // Assuming single user for now
        // preferences is a JSON object handled by WatermelonDB decorator
        const prefs = currentUserProfile.preferences || {};
        if (!prefs.autoBackupEnabled) return BackgroundFetch.BackgroundFetchResult.NoData;

        // 3. Attempt Backup
        // We need to be signed in. GoogleSignin silently signs in if previously authorized.
        const currentUser = await GoogleDriveService.signIn(); // Try silent sign-in
        if (!currentUser) return BackgroundFetch.BackgroundFetchResult.Failed;

        await BackupService.createBackup();

        // Save success timestamp to Settings table
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

        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        console.error('Background backup failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

export const registerBackgroundBackup = async () => {
    try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_BACKUP_TASK, {
            minimumInterval: 60 * 60 * 24, // 24 hours
            stopOnTerminate: false, // Continue even if app is closed
            startOnBoot: true, // Android only
        });
        console.log('Background backup task registered');
    } catch (err) {
        console.error('Task registration failed:', err);
    }
};
