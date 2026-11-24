import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import CryptoJS from 'crypto-js';
import { GoogleDriveService } from './GoogleDriveService';
import database from '../database';

const BACKUP_FILE_NAME = 'sikka_backup.enc';
const TEMP_FILE_PATH = `${cacheDirectory}sikka_backup.enc`;
const ENCRYPTION_SECRET = 'sikka-secure-backup-key-v1';

// Helper to serialize a collection
const serializeCollection = async (collectionName: string) => {
    try {
        const collection = database.get(collectionName);
        const records = await collection.query().fetch();
        return records.map(r => r._raw);
    } catch (e) {
        console.warn(`Failed to serialize collection ${collectionName}:`, e);
        return [];
    }
};

/** Every table, so a restore on a new phone brings back payments, rules and plans too. */
const BACKUP_TABLES = [
    'accounts',
    'credit_card_details',
    'investment_holdings',
    'categories',
    'tags',
    'sentiments',
    'transactions',
    'transaction_tags',
    'transaction_sentiments',
    'subscriptions',
    'subscription_members',
    'subscription_events',
    'sms_rules',
    'users',
    'settings',
] as const;

/**
 * Replaces local data with the backup. Records keep their ids, so payments stay
 * linked to their accounts, categories and feelings.
 */
export async function restoreTables(data: Record<string, any[] | undefined>) {
    await database.write(async () => {
        const ops: any[] = [];
        for (const table of BACKUP_TABLES) {
            const records = data[table];
            if (!records) continue; // older backups don't have every table
            const collection = database.get(table);
            const existing = await collection.query().fetch();
            existing.forEach((rec) => ops.push(rec.prepareDestroyPermanently()));
            records.forEach((raw) => {
                const { _status, _changed, ...clean } = raw;
                ops.push((collection as any).prepareCreateFromDirtyRaw(clean));
            });
        }
        await database.batch(...ops);
    });
}

export class BackupService {
    /**
     * Helper to serialize all WatermelonDB data.
     */
    static async _serializeDatabaseData() {
        const out: Record<string, any[]> = {};
        for (const table of BACKUP_TABLES) out[table] = await serializeCollection(table);
        return out;
    }

    /**
     * Create a full backup of the app data (WatermelonDB + Select AsyncStorage keys)
     */
    static async createBackup() {
        try {
            // 1. Serialize WatermelonDB Data
            const dbData = await this._serializeDatabaseData();

            // 2. Add Metadata & Versioning
            const payload = {
                timestamp: Date.now(),
                version: '2.0',
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
    }

    static async checkIfBackupExists(accessToken: string) {
        try {
            const files = await GoogleDriveService.listFiles(accessToken);
            const existingFile = files.find((f: any) => f.name === BACKUP_FILE_NAME);
            return !!existingFile;
        } catch (error) {
            console.error('Check backup exists failed:', error);
            return false;
        }
    }

    /**
     * Creates a full database backup and saves it locally, then opens the share sheet.
     * @returns boolean indicating success
     */
    static async exportLocalBackup(): Promise<boolean> {
        try {
            // 1. Serialize Data
            const dbData = await this._serializeDatabaseData();

            // 2. Add Metadata & Versioning
            const payload = {
                timestamp: Date.now(),
                version: '2.0',
                type: 'watermelondb',
                data: dbData,
            };
            const jsonString = JSON.stringify(payload);

            // 3. Encrypt Data
            const encryptedData = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_SECRET).toString();

            // 4. Write to a temporary file locally
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `sikka_backup_${timestamp}.enc`;
            const fileUri = `${cacheDirectory}${fileName}`;

            await writeAsStringAsync(fileUri, encryptedData, {
                encoding: EncodingType.UTF8
            });

            // 5. Check if sharing is available and share
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/octet-stream',
                    dialogTitle: 'Export Backup',
                    UTI: 'public.data'
                });
                return true;
            } else {
                throw new Error("Sharing is not available on this device.");
            }
        } catch (error) {
            console.error('Error exporting local backup:', error);
            throw error;
        }
    }

    /**
     * Restore data from the latest backup
     */
    static async restoreBackup() {
        try {
            const accessToken = await GoogleDriveService.getAccessToken();
            if (!accessToken) throw new Error('No access token');

            const files = await GoogleDriveService.listFiles(accessToken);
            const backupFile = files.find((f: any) => f.name === BACKUP_FILE_NAME);

            if (!backupFile) throw new Error('No backup found');

            const encryptedContent = await GoogleDriveService.downloadFile(accessToken, backupFile.id);
            const bytes = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_SECRET);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedString) throw new Error('Decryption failed');

            const payload = JSON.parse(decryptedString);
            if (payload.version !== '2.0' && payload.type !== 'watermelondb') {
                console.warn('Restoring record type mismatch or version mismatch.');
            }

            const { data } = payload;

            await restoreTables(data);

            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }
}
