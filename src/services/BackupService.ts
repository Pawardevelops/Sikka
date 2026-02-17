import { cacheDirectory, documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import CryptoJS from 'crypto-js';
import { GoogleDriveService } from './GoogleDriveService';
import database from '../database';

const BACKUP_FILE_NAME = 'sikka_backup.enc';
const TEMP_FILE_PATH = `${cacheDirectory || documentDirectory}sikka_backup.enc`;
const ENCRYPTION_SECRET = 'sikka-secure-backup-key-v1'; // Ideally, user should provide this or use SecureStore

// Helper to serialize a collection
const serializeCollection = async (collectionName: string) => {
    const collection = database.get(collectionName);
    const records = await collection.query().fetch();
    return records.map(r => r._raw); // Export raw internal JSON structure
};

export const BackupService = {
    /**
     * Create a full backup of the app data (WatermelonDB + Select AsyncStorage keys)
     */
    createBackup: async () => {
        try {
            // 1. Serialize WatermelonDB Data
            const dbData = {
                accounts: await serializeCollection('accounts'),
                categories: await serializeCollection('categories'),
                tags: await serializeCollection('tags'),
                sentiments: await serializeCollection('sentiments'),
                transactions: await serializeCollection('transactions'),
                transaction_tags: await serializeCollection('transaction_tags'),
                transaction_sentiments: await serializeCollection('transaction_sentiments'),
                subscriptions: await serializeCollection('subscriptions'),
                subscription_members: await serializeCollection('subscription_members'),
                subscription_events: await serializeCollection('subscription_events'),
                users: await serializeCollection('users'),
                settings: await serializeCollection('settings'),
            };

            // 2. Add Metadata & Versioning
            const payload = {
                timestamp: Date.now(),
                version: '2.0', // Bumped for DB migration
                type: 'watermelondb',
                data: dbData,
            };

            // 3. Encrypt
            const jsonString = JSON.stringify(payload);
            const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_SECRET).toString();

            // 4. Write to temp file
            await writeAsStringAsync(TEMP_FILE_PATH, encrypted);

            // 5. Upload to Drive
            const accessToken = await GoogleDriveService.getAccessToken();
            if (!accessToken) throw new Error('No access token');

            // Check for existing file to overwrite
            const files = await GoogleDriveService.listFiles(accessToken);
            const existingFile = files.find((f: any) => f.name === BACKUP_FILE_NAME);

            await GoogleDriveService.uploadFile(
                accessToken,
                encrypted,
                BACKUP_FILE_NAME,
                existingFile?.id
            );

            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            throw error;
        }
    },

    /**
     * Restore data from the latest backup
     * WARNING: This wipes existing data and replaces it with backup
     */
    restoreBackup: async () => {
        try {
            const accessToken = await GoogleDriveService.getAccessToken();
            if (!accessToken) throw new Error('No access token');

            // 1. Find file
            const files = await GoogleDriveService.listFiles(accessToken);
            const backupFile = files.find((f: any) => f.name === BACKUP_FILE_NAME);

            if (!backupFile) throw new Error('No backup found');

            // 2. Download
            const encryptedContent = await GoogleDriveService.downloadFile(accessToken, backupFile.id);

            // 3. Decrypt
            const bytes = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_SECRET);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedString) throw new Error('Decryption failed');

            const payload = JSON.parse(decryptedString);

            // Check version compatibility if needed
            if (payload.version !== '2.0' && payload.type !== 'watermelondb') {
                // TODO: Handle legacy migration here if needed
                console.warn('Restoring legacy backup not fully supported in this version yet.');
                // fallback or throw? For now let's assume v2.0
            }

            const { data } = payload;

            // 4. Restore to WatermelonDB (Batch Action)
            await database.write(async () => {
                // Helper to wipe and insert
                const restoreTable = async (tableName: string, records: any[]) => {
                    if (!records) return;
                    const collection = database.get(tableName);

                    // Dangerous: Wipe table. 
                    // WatermelonDB doesn't have a 'clear table' command easily without querying all.
                    // Ideally we sync, but for restore we want to replace.
                    const existing = await collection.query().fetch();

                    // Mark all existing as deleted or strictly destroy
                    for (const rec of existing) {
                        await rec.destroyPermanently();
                    }

                    // Create new
                    for (const raw of records) {
                        await collection.create(rec => {
                            // Use keys from raw to assign to record.
                            Object.keys(raw).forEach(key => {
                                if (key !== 'id' && key !== '_status' && key !== '_changed') {
                                    // @ts-ignore
                                    rec[key] = raw[key];
                                }
                            });
                        });
                    }
                };

                await restoreTable('accounts', data.accounts);
                await restoreTable('categories', data.categories);
                await restoreTable('tags', data.tags);
                await restoreTable('sentiments', data.sentiments);
                // Subscriptions need to come before transactions if there are FKs? No, WatermelonDB is lazy.
                // But generally restoring independents first is safer if we were using 'set' logic.
                // We are using raw ID strings, so order shouldn't matter too much for creation,
                // but for integrity it might.
                await restoreTable('subscriptions', data.subscriptions);
                await restoreTable('subscription_members', data.subscription_members);
                await restoreTable('subscription_events', data.subscription_events);
                // Misc
                await restoreTable('users', data.users);
                await restoreTable('settings', data.settings);
            });

            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }
};
