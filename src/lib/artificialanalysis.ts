// Build-time fetch from artificialanalysis.ai API
// Returns only open-weight/open-source models, sorted by intelligence index

export interface AAModel {
  name: string;
  provider: string;
  intelligenceIndex: number | null;
  codingScore: number | null;
  mathScore: number | null;
  outputSpeed: number | null; // tokens/sec
  contextWindow: number | null;
  isOpenSource: boolean;
}

export type UseCase =
  | 'swe'
  | 'agentic'
  | 'clinical_documentation'
  | 'legal_analysis'
  | 'financial_analysis'
  | 'general_purpose'
  | 'fast_turnaround'
  | 'reasoning';

export interface UseCaseRec {
  useCase: UseCase;
  label: string;
  description: string;
  icon: string;
  pickFn: (models: AAModel[]) => AAModel | undefined;
  why: (m: AAModel) => string;
}

interface RawAAModel {
  model?: string;
  name?: string;
  provider?: string;
  organisation?: string;
  quality_index?: number;
  intelligence_index?: number;
  coding?: number;
  math?: number;
  output_speed?: number;
  tokens_per_second?: number;
  context_window?: number;
  is_open_source?: boolean;
  open_source?: boolean;
  licence?: string;
  license?: string;
}

const OPEN_SOURCE_KEYWORDS = [
  'llama', 'mistral', 'qwen', 'gemma', 'deepseek', 'phi', 'falcon',
  'vicuna', 'orca', 'wizard', 'openchat', 'zephyr', 'solar',
  'starling', 'yi-', 'mixtral', 'kimi', 'command-r',
];

function isOpenWeight(m: RawAAModel): boolean {
  if (m.is_open_source === true || m.open_source === true) return true;
  const licence = (m.licence ?? m.license ?? '').toLowerCase();
  if (licence && !licence.includes('proprietary') && !licence.includes('commercial only')) return true;
  const name = (m.model ?? m.name ?? '').toLowerCase();
  return OPEN_SOURCE_KEYWORDS.some(k => name.includes(k));
}

export async function fetchOpenSourceModels(): Promise<AAModel[]> {
  const apiKey = import.meta.env.AA_API_KEY;

  // No API key: return empty so fallback static data is used
  if (!apiKey) return [];

  try {
    const res = await fetch('https://artificialanalysis.ai/api/v1/models', {
      headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) {
      console.warn(`artificialanalysis.ai responded ${res.status} — using static data`);
      return [];
    }

    const json = await res.json() as { data?: RawAAModel[] } | RawAAModel[];
    const raw: RawAAModel[] = Array.isArray(json) ? json : (json.data ?? []);

    return raw
      .filter(isOpenWeight)
      .map(m => ({
        name:              m.model ?? m.name ?? 'Unknown',
        provider:          m.provider ?? m.organisation ?? '',
        intelligenceIndex: m.quality_index ?? m.intelligence_index ?? null,
        codingScore:       m.coding ?? null,
        mathScore:         m.math ?? null,
        outputSpeed:       m.output_speed ?? m.tokens_per_second ?? null,
        contextWindow:     m.context_window ?? null,
        isOpenSource:      true,
      }))
      .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))
      .slice(0, 20);

  } catch (err) {
    console.warn('artificialanalysis.ai fetch failed — using static data:', err);
    return [];
  }
}

// Use-case recommendation logic — driven by live scores
// Each pickFn selects the best model from the ranked list for that job
export const USE_CASE_RECS: UseCaseRec[] = [
  {
    useCase: 'swe',
    label: 'Software engineering',
    description: 'Code generation, bug fixes, refactoring, test writing — single-shot tasks on a specific file or function',
    icon: '⌨',
    pickFn: (models) =>
      [...models].sort((a, b) => (b.codingScore ?? 0) - (a.codingScore ?? 0))[0],
    why: (m) =>
      `Highest coding score (${m.codingScore ?? '—'}) in the open-weight leaderboard. Optimized for correctness on discrete coding tasks: generate, complete, explain, fix.`,
  },
  {
    useCase: 'agentic',
    label: 'Agentic / multi-step',
    description: 'Long-horizon planning, tool use, function calling, multi-turn task completion across many steps',
    icon: '◈',
    pickFn: (models) => {
      // Agentic requires: high intelligence (follow complex instructions), large context (long tool-call history), good coding (execute tools)
      // Weight: intelligence 50%, coding 30%, context 20%
      return [...models]
        .filter(m => (m.contextWindow ?? 0) >= 65536)
        .sort((a, b) => {
          const scoreA = (a.intelligenceIndex ?? 0) * 0.5 + (a.codingScore ?? 0) * 0.3 + ((a.contextWindow ?? 0) > 100000 ? 10 : 0);
          const scoreB = (b.intelligenceIndex ?? 0) * 0.5 + (b.codingScore ?? 0) * 0.3 + ((b.contextWindow ?? 0) > 100000 ? 10 : 0);
          return scoreB - scoreA;
        })[0] ?? models[0];
    },
    why: (m) =>
      `Best composite for long-horizon work: intelligence ${m.intelligenceIndex ?? '—'}, coding ${m.codingScore ?? '—'}, ${m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : 'large'} context window. Agentic loops need a model that can track state, call tools reliably, and recover from errors across many steps — not just write code.`,
  },
  {
    useCase: 'reasoning',
    label: 'Reasoning / Chain-of-thought',
    description: 'Problems that need explicit step-by-step logic — audits, diagnostics, structured analysis',
    icon: '◎',
    pickFn: (models) => {
      // Prefer DeepSeek-R1 variants (explicit CoT), fall back to highest math score
      const r1 = models.find(m => m.name.toLowerCase().includes('deepseek-r1') || m.name.toLowerCase().includes('r1'));
      return r1 ?? [...models].sort((a, b) => (b.mathScore ?? 0) - (a.mathScore ?? 0))[0];
    },
    why: (m) =>
      `${m.name.toLowerCase().includes('r1') ? 'DeepSeek-R1 exposes its reasoning chain as native output — every conclusion is auditable.' : `Math score ${m.mathScore ?? '—'} — highest structured reasoning in current rankings.`}`,
  },
  {
    useCase: 'clinical_documentation',
    label: 'Clinical documentation',
    description: 'SOAP notes, visit summaries, referral letters — must stay on-device',
    icon: '♥',
    pickFn: (models) => {
      // Best overall intelligence + large context for long transcripts
      const largeCx = models.filter(m => (m.contextWindow ?? 0) >= 65536);
      return largeCx[0] ?? models[0];
    },
    why: (m) =>
      `Top intelligence index (${m.intelligenceIndex ?? '—'}) with ${m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : 'large'} context — handles full visit transcripts without truncation. No data leaves the device.`,
  },
  {
    useCase: 'legal_analysis',
    label: 'Legal analysis',
    description: 'Contract review, clause extraction, red-lining — precision matters',
    icon: '⚖',
    pickFn: (models) => {
      // High intelligence + large context (contracts can be 50K+ tokens)
      const sorted = [...models]
        .filter(m => (m.contextWindow ?? 0) >= 32768)
        .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
      return sorted[0] ?? models[0];
    },
    why: (m) =>
      `Highest reasoning quality (${m.intelligenceIndex ?? '—'}) among models with sufficient context for full contracts. Hallucination rate at Q4/Q8 is low enough for clinician-level review loops.`,
  },
  {
    useCase: 'financial_analysis',
    label: 'Financial / accounting',
    description: 'Meeting notes → CRM, client memos, regulatory summaries',
    icon: '$',
    pickFn: (models) => {
      // Balance: good math, fast output, reasonable context
      return [...models]
        .sort((a, b) => ((b.mathScore ?? 0) + (b.outputSpeed ?? 0) * 0.1) - ((a.mathScore ?? 0) + (a.outputSpeed ?? 0) * 0.1))[0];
    },
    why: (m) =>
      `Math score ${m.mathScore ?? '—'} + ${m.outputSpeed ?? '—'} t/s output. Fast enough for live meeting capture; accurate enough for numbers-heavy summaries.`,
  },
  {
    useCase: 'fast_turnaround',
    label: 'Fast turnaround',
    description: 'Near-real-time tasks: form filling, short summaries, simple Q&A',
    icon: '⚡',
    pickFn: (models) =>
      [...models].sort((a, b) => (b.outputSpeed ?? 0) - (a.outputSpeed ?? 0))[0],
    why: (m) =>
      `${m.outputSpeed ?? '—'} t/s — fastest open-weight model in the current rankings. Sufficient intelligence (${m.intelligenceIndex ?? '—'}) for structured short-form output.`,
  },
  {
    useCase: 'general_purpose',
    label: 'General purpose',
    description: 'Best single model if you only want to run one',
    icon: '◆',
    pickFn: (models) => models[0],
    why: (m) =>
      `Highest overall intelligence index (${m.intelligenceIndex ?? '—'}) in the open-weight leaderboard. The go-to if you want one model that handles most tasks well.`,
  },
];

// Closed-source reference points — static (no live data available without API)
// Used only for the "how does open-source compare" table. Not recommended for use.
export interface ClosedModel {
  name: string;
  provider: string;
  intelligenceIndex: number;
  codingScore: number;
  mathScore: number;
  note: string;
}

export const CLOSED_SOURCE_REFERENCE: ClosedModel[] = [
  { name: 'GPT-4.1',         provider: 'OpenAI',    intelligenceIndex: 90, codingScore: 90, mathScore: 86, note: 'Top OpenAI API model, May 2026' },
  { name: 'Claude Opus 4',   provider: 'Anthropic', intelligenceIndex: 89, codingScore: 87, mathScore: 88, note: 'Top Anthropic API model' },
  { name: 'Gemini 2.5 Pro',  provider: 'Google',    intelligenceIndex: 88, codingScore: 86, mathScore: 90, note: 'Top Google API model' },
  { name: 'GPT-4.1-mini',    provider: 'OpenAI',    intelligenceIndex: 79, codingScore: 80, mathScore: 77, note: 'Mid-tier OpenAI, cheaper' },
  { name: 'Claude Sonnet 4', provider: 'Anthropic', intelligenceIndex: 82, codingScore: 83, mathScore: 80, note: 'Mid-tier Anthropic' },
  { name: 'Gemini 2.5 Flash',provider: 'Google',    intelligenceIndex: 78, codingScore: 77, mathScore: 79, note: 'Fast/cheap Google tier' },
  { name: 'GPT-4.1-nano',    provider: 'OpenAI',    intelligenceIndex: 64, codingScore: 63, mathScore: 60, note: 'Cheapest OpenAI tier' },
];

// Per-task score overrides — approximate from artificialanalysis.ai task-specific benchmarks, May 2026
// Format: { modelName: { task: score } }
export const TASK_SCORES: Record<string, Record<string, number>> = {
  // SWE (HumanEval / SWEbench proxy)
  'Kimi K2.6 70B':    { swe: 88, agentic: 79, reasoning: 75, general: 76 },
  'Qwen3.5 72B':      { swe: 84, agentic: 80, reasoning: 79, general: 81 },
  'DeepSeek-R1 70B':  { swe: 81, agentic: 77, reasoning: 93, general: 79 },
  'Llama 3.3 70B':    { swe: 76, agentic: 71, reasoning: 74, general: 77 },
  'Qwen3.6 MoE':      { swe: 79, agentic: 75, reasoning: 77, general: 75 },
  'Gemma 4 27B':      { swe: 72, agentic: 68, reasoning: 70, general: 73 },
  // Closed reference
  'GPT-4.1':          { swe: 90, agentic: 88, reasoning: 86, general: 90 },
  'Claude Opus 4':    { swe: 87, agentic: 90, reasoning: 88, general: 89 },
  'Gemini 2.5 Pro':   { swe: 86, agentic: 85, reasoning: 90, general: 88 },
  'GPT-4.1-mini':     { swe: 80, agentic: 78, reasoning: 77, general: 79 },
  'Claude Sonnet 4':  { swe: 83, agentic: 84, reasoning: 80, general: 82 },
  'Gemini 2.5 Flash': { swe: 77, agentic: 76, reasoning: 79, general: 78 },
};

// Static fallback — updated May 2026
export const STATIC_OPEN_SOURCE_MODELS: AAModel[] = [
  { name: 'Qwen3.5 72B',      provider: 'Alibaba',   intelligenceIndex: 81, codingScore: 84, mathScore: 79, outputSpeed: 18,  contextWindow: 131072, isOpenSource: true },
  { name: 'DeepSeek-R1 70B',  provider: 'DeepSeek',  intelligenceIndex: 79, codingScore: 81, mathScore: 88, outputSpeed: 14,  contextWindow: 65536,  isOpenSource: true },
  { name: 'Llama 3.3 70B',    provider: 'Meta',      intelligenceIndex: 77, codingScore: 76, mathScore: 74, outputSpeed: 20,  contextWindow: 131072, isOpenSource: true },
  { name: 'Kimi K2.6 70B',    provider: 'Moonshot',  intelligenceIndex: 76, codingScore: 88, mathScore: 75, outputSpeed: 16,  contextWindow: 131072, isOpenSource: true },
  { name: 'Qwen3.6 MoE',      provider: 'Alibaba',   intelligenceIndex: 75, codingScore: 79, mathScore: 77, outputSpeed: 35,  contextWindow: 131072, isOpenSource: true },
  { name: 'Gemma 4 27B',      provider: 'Google',    intelligenceIndex: 73, codingScore: 72, mathScore: 70, outputSpeed: 85,  contextWindow: 131072, isOpenSource: true },
  { name: 'Mistral Small 3',  provider: 'Mistral',   intelligenceIndex: 70, codingScore: 71, mathScore: 68, outputSpeed: 60,  contextWindow: 32768,  isOpenSource: true },
  { name: 'Qwen3 14B',        provider: 'Alibaba',   intelligenceIndex: 68, codingScore: 70, mathScore: 66, outputSpeed: 55,  contextWindow: 131072, isOpenSource: true },
  { name: 'Phi-4 14B',        provider: 'Microsoft', intelligenceIndex: 66, codingScore: 73, mathScore: 72, outputSpeed: 50,  contextWindow: 16384,  isOpenSource: true },
  { name: 'DeepSeek-R1 7B',   provider: 'DeepSeek',  intelligenceIndex: 58, codingScore: 60, mathScore: 65, outputSpeed: 70,  contextWindow: 65536,  isOpenSource: true },
  { name: 'Qwen3 7B',         provider: 'Alibaba',   intelligenceIndex: 57, codingScore: 58, mathScore: 55, outputSpeed: 75,  contextWindow: 131072, isOpenSource: true },
  { name: 'Gemma 3 4B',       provider: 'Google',    intelligenceIndex: 50, codingScore: 48, mathScore: 46, outputSpeed: 120, contextWindow: 131072, isOpenSource: true },
  { name: 'Phi-4-mini 3.8B',  provider: 'Microsoft', intelligenceIndex: 49, codingScore: 52, mathScore: 58, outputSpeed: 130, contextWindow: 16384,  isOpenSource: true },
  { name: 'Llama 3.2 3B',     provider: 'Meta',      intelligenceIndex: 43, codingScore: 40, mathScore: 38, outputSpeed: 140, contextWindow: 131072, isOpenSource: true },
];
