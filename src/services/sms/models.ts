/**
 * On-device models users can download to read bank SMS the patterns miss.
 * All are open models fine-tuned for Indian bank SMS, run with llama.rn (GGUF).
 * Prompt formats follow each model card exactly.
 */
import { creditCategory, cleanMerchant } from './patterns';
import { ParsedSms } from './types';

export type ModelOutput = ParsedSms | 'skip' | null;

export interface SmsModel {
    id: string;
    name: string;
    tagline: string;
    sizeMb: number;
    license: string;
    url: string;
    fileName: string;
    contextSize: number;
    stop: string[];
    maxTokens: number;
    buildPrompt: (sms: { body: string; sender: string; ownerName?: string }) => string;
    readOutput: (raw: string, modelId: string) => ModelOutput;
}

const HF = 'https://huggingface.co';

// ─── azabdus Qwen2.5 sms-txn (system trigger `sms_txn_v1`, JSON answer) ─────
const qwenSmsTxnPrompt: SmsModel['buildPrompt'] = ({ body, sender, ownerName }) =>
    '<|im_start|>system\nsms_txn_v1<|im_end|>\n' +
    `<|im_start|>user\nowner: ${ownerName?.trim() || 'Account holder'}\nsender: ${sender}\nfolder: inbox\n${body}<|im_end|>\n` +
    '<|im_start|>assistant\n';

const readQwenSmsTxn: SmsModel['readOutput'] = (raw, modelId) => {
    const json = firstJson(raw);
    if (!json) return null;
    if (json.is_txn === false) return 'skip';
    const amount = Number(json.amount);
    const direction = json.direction === 'credit' ? 'credit' : json.direction === 'debit' ? 'debit' : null;
    if (!direction || !Number.isFinite(amount) || amount <= 0) return null;
    if (json.currency && String(json.currency).toUpperCase() !== 'INR') return null;
    const merchant = cleanMerchant(String(json.merchant ?? ''));
    return {
        direction,
        amount,
        merchant,
        category: json.is_transfer ? 'transfer' : creditCategory(direction, merchant),
        source: modelId,
    };
};

// ─── FunctionGemma bank SMS parser (function-call answer) ───────────────────
const FUNCTION_GEMMA_DEVELOPER =
    'You are a financial transaction extractor. Analyze SMS messages and:\n' +
    '1. If the message describes a completed financial transaction (money sent, received, debited, or credited), use extract_transaction to capture the details.\n' +
    '2. If the message is not a transaction (OTP, promotional, application status, payment request, etc.), use skip_message.\n\n' +
    'Only extract actual completed transactions with concrete amounts, not payment requests or pending transactions.' +
    '<start_function_declaration>declaration:extract_transaction{description:<escape>Extract transaction details from a banking SMS message<escape>,parameters:{properties:{source:{type:<escape>STRING<escape>},currency:{type:<escape>STRING<escape>},amount:{type:<escape>NUMBER<escape>},date:{type:<escape>STRING<escape>},destination:{type:<escape>STRING<escape>},type:{type:<escape>STRING<escape>}},required:[<escape>source<escape>,<escape>currency<escape>,<escape>amount<escape>,<escape>date<escape>,<escape>destination<escape>,<escape>type<escape>],type:<escape>OBJECT<escape>}}<end_function_declaration>' +
    '<start_function_declaration>declaration:skip_message{description:<escape>Skip messages that are not financial transactions<escape>,parameters:{properties:{reason:{type:<escape>STRING<escape>}},required:[<escape>reason<escape>],type:<escape>OBJECT<escape>}}<end_function_declaration>';

const functionGemmaPrompt: SmsModel['buildPrompt'] = ({ body }) =>
    // llama.rn adds <bos> itself.
    `<start_of_turn>developer\n${FUNCTION_GEMMA_DEVELOPER}<end_of_turn>\n<start_of_turn>user\n${body}<end_of_turn>\n<start_of_turn>model\n`;

const readFunctionGemma: SmsModel['readOutput'] = (raw, modelId) => {
    if (raw.includes('skip_message')) return 'skip';
    if (!raw.includes('extract_transaction')) return null;
    const json = firstJson(raw);
    if (!json) return null;
    const amount = Number(json.amount);
    const type = String(json.type ?? '').toLowerCase();
    const direction = type === 'credit' ? 'credit' : type === 'debit' ? 'debit' : null;
    if (!direction || !Number.isFinite(amount) || amount <= 0) return null;
    if (json.currency && String(json.currency).toUpperCase() !== 'INR') return null;
    const merchant = cleanMerchant(String(json.destination ?? ''));
    return {
        direction,
        amount,
        merchant,
        category: creditCategory(direction, merchant),
        source: modelId,
    };
};

export const SMS_MODELS: SmsModel[] = [
    {
        id: 'qwen-0.5b-sms-txn',
        name: 'Balanced',
        tagline: 'Qwen2.5 0.5B, tuned on Indian bank SMS. Best mix of accuracy and speed.',
        sizeMb: 353,
        license: 'Apache-2.0',
        fileName: 'qwen2.5-0.5b-sms-txn-2026.11.02-Q4_0.gguf',
        url: `${HF}/azabdus/qwen2.5-0.5b-sms-txn-GGUF/resolve/main/qwen2.5-0.5b-sms-txn-2026.11.02-Q4_0.gguf`,
        contextSize: 1024,
        stop: ['<|im_end|>', '<|endoftext|>'],
        maxTokens: 80,
        buildPrompt: qwenSmsTxnPrompt,
        readOutput: readQwenSmsTxn,
    },
    {
        id: 'functiongemma-270m-sms',
        name: 'Light',
        tagline: 'FunctionGemma 270M. Smallest download, reads fewer details.',
        sizeMb: 253,
        license: 'Gemma',
        fileName: 'functiongemma-270m-bank-sms-parser-Q4_K_M.gguf',
        url: `${HF}/kartikaybagla/functiongemma-bank-sms-parser/resolve/main/functiongemma-270m-bank-sms-parser-Q4_K_M.gguf`,
        contextSize: 2048,
        stop: ['<end_function_call>', '<end_of_turn>'],
        maxTokens: 160,
        buildPrompt: functionGemmaPrompt,
        readOutput: readFunctionGemma,
    },
    {
        id: 'qwen-1.5b-sms-txn',
        name: 'Accurate',
        tagline: 'Qwen2.5 1.5B. Most accurate, needs a recent phone with 6 GB+ RAM.',
        sizeMb: 986,
        license: 'Apache-2.0',
        fileName: 'qwen2.5-1.5b-sms-txn-Q4_K_M.gguf',
        url: `${HF}/azabdus/qwen2.5-1.5b-sms-txn-GGUF/resolve/main/qwen2.5-1.5b-sms-txn-Q4_K_M.gguf`,
        contextSize: 1024,
        stop: ['<|im_end|>', '<|endoftext|>'],
        maxTokens: 80,
        buildPrompt: qwenSmsTxnPrompt,
        readOutput: readQwenSmsTxn,
    },
];

export const getSmsModel = (id: string | null | undefined) => SMS_MODELS.find((m) => m.id === id);

function firstJson(raw: string): Record<string, any> | null {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
        return JSON.parse(raw.slice(start, end + 1));
    } catch {
        return null;
    }
}
