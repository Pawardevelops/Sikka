/**
 * Voice notes ("why did I pay?") with Android's on-device speech recogniser.
 * Hinglish = Hindi (India) recogniser, which writes Roman or Devanagari script.
 * The ~150 MB language pack is fetched by Android itself; Sikka only asks for it.
 */
import { Platform } from 'react-native';

type Mod = typeof import('expo-speech-recognition');
let mod: Mod | null | undefined;
export function speech(): Mod | null {
    if (mod !== undefined) return mod;
    try {
        mod = require('expo-speech-recognition') as Mod;
    } catch {
        mod = null;
    }
    return mod;
}

export const VOICE_LOCALE = 'hi-IN';
export const VOICE_MODEL_MB = 150;

export type VoiceModelState = 'installed' | 'missing' | 'unsupported';

export async function voiceModelState(): Promise<VoiceModelState> {
    const m = speech();
    if (!m || Platform.OS !== 'android') return 'unsupported';
    try {
        const r = m.ExpoSpeechRecognitionModule;
        if (!r.isRecognitionAvailable()) return 'unsupported';
        const { installedLocales } = await r.getSupportedLocales({});
        return installedLocales.some((l) => l.toLowerCase().startsWith('hi')) ? 'installed' : 'missing';
    } catch {
        return 'unsupported';
    }
}

/** Asks Android to download the Hindi/Hinglish pack (Android may show its own dialog). */
export async function downloadVoiceModel(): Promise<'done' | 'dialog' | 'cancelled' | 'unsupported'> {
    const m = speech();
    if (!m || Platform.OS !== 'android') return 'unsupported';
    try {
        const r = await m.ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: VOICE_LOCALE });
        return r.status === 'download_success' ? 'done' : r.status === 'opened_dialog' ? 'dialog' : 'cancelled';
    } catch {
        return 'unsupported';
    }
}

/** Picks a category from words said in the note, using Settings → Voice notes words. */
export function categoryFromWords(text: string, words: Record<string, string[]>): string | undefined {
    const t = ` ${text.toLowerCase()} `;
    for (const [category, list] of Object.entries(words)) {
        if (list.some((w) => w && t.includes(` ${w.toLowerCase()} `))) return category;
    }
    return undefined;
}

/** #people / #tags said out loud: "with rahul" → #rahul. */
export function tagsFromNote(text: string): string[] {
    const tags = new Set<string>();
    for (const m of text.matchAll(/#([\p{L}0-9_]+)/gu)) tags.add(m[1].toLowerCase());
    for (const m of text.matchAll(/\bwith\s+([A-Za-z]{2,20})/g)) tags.add(m[1].toLowerCase());
    return [...tags].slice(0, 4);
}
