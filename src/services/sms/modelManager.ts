/**
 * Downloads, stores and selects the on-device SMS model.
 * Files live in <documents>/models/; the chosen model id is kept in AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    documentDirectory,
    makeDirectoryAsync,
    getInfoAsync,
    deleteAsync,
    createDownloadResumable,
    DownloadResumable,
} from 'expo-file-system/legacy';
import { SMS_MODELS, SmsModel, getSmsModel } from './models';

const ACTIVE_KEY = 'sikka.smsModel.active';
const MODELS_DIR = `${documentDirectory}models/`;

export const modelPath = (m: SmsModel) => `${MODELS_DIR}${m.fileName}`;

export async function isDownloaded(m: SmsModel): Promise<boolean> {
    const info = await getInfoAsync(modelPath(m));
    // Guard against a half-written file from an interrupted download.
    return info.exists && !info.isDirectory && (info.size ?? 0) > m.sizeMb * 1e6 * 0.9;
}

export async function getActiveModel(): Promise<SmsModel | undefined> {
    const model = getSmsModel(await AsyncStorage.getItem(ACTIVE_KEY));
    return model && (await isDownloaded(model)) ? model : undefined;
}

export async function setActiveModel(id: string | null) {
    if (id) await AsyncStorage.setItem(ACTIVE_KEY, id);
    else await AsyncStorage.removeItem(ACTIVE_KEY);
}

export async function getActiveModelId() {
    return AsyncStorage.getItem(ACTIVE_KEY);
}

const running = new Map<string, DownloadResumable>();

/** Starts (or resumes) a download. `onProgress` gets 0..1. Resolves when the file is complete. */
export async function downloadModel(m: SmsModel, onProgress: (p: number) => void): Promise<void> {
    await makeDirectoryAsync(MODELS_DIR, { intermediates: true }).catch(() => undefined);
    const task = createDownloadResumable(m.url, modelPath(m), {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : m.sizeMb * 1e6;
        onProgress(Math.min(1, totalBytesWritten / total));
    });
    running.set(m.id, task);
    try {
        const result = await task.downloadAsync();
        if (!result || result.status < 200 || result.status >= 300) {
            await deleteAsync(modelPath(m), { idempotent: true });
            throw new Error(`Download failed (${result?.status ?? 'no response'})`);
        }
    } finally {
        running.delete(m.id);
    }
}

export async function cancelDownload(m: SmsModel) {
    const task = running.get(m.id);
    running.delete(m.id);
    await task?.cancelAsync().catch(() => undefined);
    await deleteAsync(modelPath(m), { idempotent: true });
}

export async function deleteModel(m: SmsModel) {
    if ((await getActiveModelId()) === m.id) await setActiveModel(null);
    await deleteAsync(modelPath(m), { idempotent: true });
}

/**
 * Background downloads started during onboarding keep going while the user
 * sets up. Screens subscribe to see progress; the model becomes active when done.
 */
export type DownloadState = { modelId: string; progress: number; status: 'running' | 'done' | 'failed'; error?: string };
let bg: DownloadState | null = null;
const listeners = new Set<(s: DownloadState | null) => void>();
const emit = () => listeners.forEach((l) => l(bg));

export function backgroundDownload(): DownloadState | null {
    return bg;
}

export function onBackgroundDownload(cb: (s: DownloadState | null) => void): () => void {
    listeners.add(cb);
    cb(bg);
    return () => { listeners.delete(cb); };
}

export function startBackgroundDownload(m: SmsModel, onDone?: () => void) {
    if (bg?.status === 'running' && bg.modelId === m.id) return;
    bg = { modelId: m.id, progress: 0, status: 'running' };
    emit();
    let last = 0;
    downloadModel(m, (p) => {
        // Throttle: a re-render per percent is plenty.
        if (p - last >= 0.01 || p === 1) {
            last = p;
            bg = { modelId: m.id, progress: p, status: 'running' };
            emit();
        }
    })
        .then(async () => {
            await setActiveModel(m.id);
            bg = { modelId: m.id, progress: 1, status: 'done' };
            emit();
            onDone?.();
        })
        .catch((e: any) => {
            bg = { modelId: m.id, progress: 0, status: 'failed', error: e?.message };
            emit();
        });
}

/** Which model fits a phone with this much RAM (bytes). */
export function recommendModel(totalMemory?: number | null): SmsModel {
    const gb = (totalMemory ?? 0) / 1024 ** 3;
    const id = gb >= 7.5 ? 'qwen-1.5b-sms-txn' : gb >= 3.5 || !gb ? 'qwen-0.5b-sms-txn' : 'functiongemma-270m-sms';
    return getSmsModel(id) ?? SMS_MODELS[0];
}

/** A model fits when it needs at most a quarter of the phone's RAM (or RAM is unknown). */
export function modelFits(m: SmsModel, totalMemory?: number | null): boolean {
    if (!totalMemory) return true;
    return m.sizeMb * 1e6 * 2.5 <= totalMemory * 0.6;
}

export { SMS_MODELS };
