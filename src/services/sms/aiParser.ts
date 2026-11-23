/**
 * Runs the selected SMS model with llama.rn. The context is loaded on first use
 * and released after a minute idle so the model doesn't sit in memory.
 */
import { Platform } from 'react-native';
import type { LlamaContext } from 'llama.rn';
import { SmsModel, ModelOutput } from './models';
import { modelPath } from './modelManager';
import { amountAppearsIn } from './patterns';

const IDLE_RELEASE_MS = 60_000;

let loaded: { id: string; ctx: LlamaContext } | null = null;
let loading: Promise<LlamaContext> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

async function getContext(model: SmsModel): Promise<LlamaContext> {
    if (loaded?.id === model.id) return loaded.ctx;
    if (loading) await loading.catch(() => undefined);
    if (loaded?.id === model.id) return loaded.ctx;
    await releaseModel();

    // Native module; required lazily so web / tests never load it.
    const { initLlama } = require('llama.rn') as typeof import('llama.rn');
    loading = initLlama({ model: modelPath(model), n_ctx: model.contextSize, n_gpu_layers: 0, use_mlock: false });
    try {
        const ctx = await loading;
        loaded = { id: model.id, ctx };
        return ctx;
    } finally {
        loading = null;
    }
}

export async function releaseModel() {
    clearTimeout(idleTimer);
    const current = loaded;
    loaded = null;
    await current?.ctx.release().catch(() => undefined);
}

/**
 * Reads one SMS with the model. Returns the parsed payment, 'skip' when the model
 * says it isn't a transaction, or null when the answer is unusable. Answers whose
 * amount doesn't appear in the SMS are rejected so the model can't invent payments.
 */
export async function parseWithModel(
    model: SmsModel,
    sms: { body: string; sender: string; ownerName?: string },
): Promise<ModelOutput> {
    if (Platform.OS !== 'android') return null;
    const ctx = await getContext(model);
    clearTimeout(idleTimer);
    try {
        const result = await ctx.completion({
            prompt: model.buildPrompt(sms),
            n_predict: model.maxTokens,
            stop: model.stop,
            temperature: 0,
        });
        const parsed = model.readOutput(result.text, model.id);
        if (parsed && parsed !== 'skip' && !amountAppearsIn(sms.body, parsed.amount)) return null;
        return parsed;
    } finally {
        idleTimer = setTimeout(() => void releaseModel(), IDLE_RELEASE_MS);
    }
}
