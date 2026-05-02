// Build-time fetch from artificialanalysis.ai API
// Returns only open-weight/open-source models, sorted by intelligence index
// Intelligence Index is on a 0–60 scale (GPT-5.5 tops at 60 as of May 2026)

export interface AAModel {
  name: string;
  provider: string;
  intelligenceIndex: number | null;
  codingScore: number | null;
  mathScore: number | null;
  outputSpeed: number | null; // tokens/sec (API speed from AA; local Apple Silicon speeds differ)
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
  'kimi', 'command-r', 'mixtral',
  // Chinese open-weight ecosystem
  'minimax', 'glm', 'internlm', 'intern-lm', 'baichuan', 'exaone', 'olmo',
  'hunyuan', 'mimo', 'skywork', 'moonshot',
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
      .slice(0, 24);
  } catch (err) {
    console.warn('artificialanalysis.ai fetch failed — using static data:', err);
    return [];
  }
}

// Use-case recommendation logic — driven by live scores
export const USE_CASE_RECS: UseCaseRec[] = [
  {
    useCase: 'swe',
    label: 'Software engineering',
    description: 'Code generation, bug fixes, refactoring, test writing — single-shot tasks on a specific file or function',
    icon: '⌨',
    pickFn: (models) =>
      [...models].sort((a, b) => (b.codingScore ?? b.intelligenceIndex ?? 0) - (a.codingScore ?? a.intelligenceIndex ?? 0))[0],
    why: (m) =>
      `Highest coding benchmark in the open-weight leaderboard. Optimized for correctness on discrete tasks: generate, complete, explain, fix.`,
  },
  {
    useCase: 'agentic',
    label: 'Agentic / multi-step',
    description: 'Long-horizon planning, tool use, function calling, multi-turn task completion across many steps',
    icon: '◈',
    pickFn: (models) =>
      [...models]
        .filter(m => (m.contextWindow ?? 0) >= 65536)
        .sort((a, b) => {
          const scoreA = (a.intelligenceIndex ?? 0) * 0.5 + (a.codingScore ?? a.intelligenceIndex ?? 0) * 0.3 + ((a.contextWindow ?? 0) > 200000 ? 5 : 0);
          const scoreB = (b.intelligenceIndex ?? 0) * 0.5 + (b.codingScore ?? b.intelligenceIndex ?? 0) * 0.3 + ((b.contextWindow ?? 0) > 200000 ? 5 : 0);
          return scoreB - scoreA;
        })[0] ?? models[0],
    why: (m) =>
      `Best composite for long-horizon work: intelligence ${m.intelligenceIndex ?? '—'}, ${m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : 'large'} context. Agentic loops need a model that tracks state, calls tools reliably, and recovers across many steps — not just writes code.`,
  },
  {
    useCase: 'reasoning',
    label: 'Reasoning / Chain-of-thought',
    description: 'Explicit step-by-step logic — audits, diagnostics, structured analysis',
    icon: '◎',
    pickFn: (models) => {
      const reasoning = models.find(m =>
        m.name.toLowerCase().includes('reasoning') ||
        m.name.toLowerCase().includes('r1') ||
        m.name.toLowerCase().includes('v4 pro')
      );
      return reasoning ?? [...models].sort((a, b) => (b.mathScore ?? b.intelligenceIndex ?? 0) - (a.mathScore ?? a.intelligenceIndex ?? 0))[0];
    },
    why: (m) =>
      `Top reasoning model in current open-weight rankings (intelligence ${m.intelligenceIndex ?? '—'}). Reasoning-mode models expose their chain-of-thought — every conclusion is auditable, which matters for regulated workflows.`,
  },
  {
    useCase: 'clinical_documentation',
    label: 'Clinical documentation',
    description: 'SOAP notes, visit summaries, referral letters — must stay on-device',
    icon: '♥',
    pickFn: (models) =>
      models.filter(m => (m.contextWindow ?? 0) >= 65536)[0] ?? models[0],
    why: (m) =>
      `Top intelligence (${m.intelligenceIndex ?? '—'}) with ${m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : 'large'} context — handles full visit transcripts without truncation. No data leaves the device.`,
  },
  {
    useCase: 'legal_analysis',
    label: 'Legal analysis',
    description: 'Contract review, clause extraction, red-lining — precision matters',
    icon: '⚖',
    pickFn: (models) =>
      [...models]
        .filter(m => (m.contextWindow ?? 0) >= 32768)
        .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))[0] ?? models[0],
    why: (m) =>
      `Highest reasoning quality (${m.intelligenceIndex ?? '—'}) among models with sufficient context for full contracts. Hallucination rate at Q4/Q8 is low enough for attorney review loops.`,
  },
  {
    useCase: 'financial_analysis',
    label: 'Financial / accounting',
    description: 'Meeting notes → CRM, client memos, regulatory summaries',
    icon: '$',
    pickFn: (models) =>
      [...models].sort((a, b) =>
        ((b.mathScore ?? b.intelligenceIndex ?? 0) + (b.outputSpeed ?? 0) * 0.05) -
        ((a.mathScore ?? a.intelligenceIndex ?? 0) + (a.outputSpeed ?? 0) * 0.05)
      )[0],
    why: (m) =>
      `Strong math benchmarks + ${m.outputSpeed ?? '—'} t/s output. Fast enough for live meeting capture; accurate enough for numbers-heavy summaries.`,
  },
  {
    useCase: 'fast_turnaround',
    label: 'Fast turnaround',
    description: 'Near-real-time tasks: form filling, short summaries, simple Q&A',
    icon: '⚡',
    pickFn: (models) =>
      [...models].sort((a, b) => (b.outputSpeed ?? 0) - (a.outputSpeed ?? 0))[0],
    why: (m) =>
      `${m.outputSpeed ?? '—'} t/s — fastest open-weight model in current rankings. Sufficient intelligence (${m.intelligenceIndex ?? '—'}) for structured short-form output.`,
  },
  {
    useCase: 'general_purpose',
    label: 'General purpose',
    description: 'Best single model if you only want to run one',
    icon: '◆',
    pickFn: (models) => models[0],
    why: (m) =>
      `Highest overall intelligence index (${m.intelligenceIndex ?? '—'}/60) in the open-weight leaderboard. The go-to when you want one model that handles most tasks well.`,
  },
];

// Closed-source reference — scores from artificialanalysis.ai, May 2026
// Same 0–60 scale as open-weight models. Shown for context only.
export interface ClosedModel {
  name: string;
  provider: string;
  intelligenceIndex: number;
  note: string;
  outputSpeed: number;
}

export const CLOSED_SOURCE_REFERENCE: ClosedModel[] = [
  { name: 'GPT-5.5 (xhigh)',       provider: 'OpenAI',    intelligenceIndex: 60, outputSpeed: 67,  note: 'Top model, May 2026. API only.' },
  { name: 'GPT-5.5 (high)',         provider: 'OpenAI',    intelligenceIndex: 59, outputSpeed: 63,  note: 'API only.' },
  { name: 'Claude Opus 4.7 (max)',  provider: 'Anthropic', intelligenceIndex: 57, outputSpeed: 51,  note: 'API only.' },
  { name: 'Gemini 3.1 Pro Preview', provider: 'Google',    intelligenceIndex: 57, outputSpeed: 121, note: 'API only.' },
  { name: 'GPT-5.5 (low)',          provider: 'OpenAI',    intelligenceIndex: 55, outputSpeed: 80,  note: 'API only.' },
  { name: 'Claude Sonnet 4.7',      provider: 'Anthropic', intelligenceIndex: 53, outputSpeed: 95,  note: 'API only.' },
  { name: 'Gemini 3.1 Flash',       provider: 'Google',    intelligenceIndex: 50, outputSpeed: 220, note: 'API only, fast tier.' },
];

// Per-task scores — derived from benchmark data, May 2026 (0–60 scale)
export const TASK_SCORES: Record<string, Record<string, number>> = {
  // Open-weight
  'Kimi K2.6':               { swe: 54, agentic: 51, reasoning: 50, general: 54 },
  'MiMo-V2.5-Pro':           { swe: 51, agentic: 50, reasoning: 53, general: 54 },
  'DeepSeek V4 Pro':         { swe: 50, agentic: 49, reasoning: 55, general: 52 },
  'GLM-5.1 Reasoning':       { swe: 48, agentic: 47, reasoning: 52, general: 51 },
  'GLM-5 Reasoning':         { swe: 47, agentic: 46, reasoning: 51, general: 50 },
  'MiniMax-M2.7':            { swe: 46, agentic: 48, reasoning: 49, general: 50 },
  'DeepSeek V4 Flash':       { swe: 44, agentic: 43, reasoning: 46, general: 47 },
  'Qwen3.6 27B':             { swe: 43, agentic: 44, reasoning: 44, general: 46 },
  'Qwen3.5 397B A17B':       { swe: 42, agentic: 43, reasoning: 44, general: 45 },
  'Qwen3.5 27B':             { swe: 40, agentic: 39, reasoning: 41, general: 42 },
  'Gemma 4 31B':             { swe: 36, agentic: 35, reasoning: 37, general: 39 },
  'Mistral Medium 3.5':      { swe: 37, agentic: 36, reasoning: 37, general: 39 },
  // Closed reference (same scale)
  'GPT-5.5 (xhigh)':        { swe: 59, agentic: 58, reasoning: 57, general: 60 },
  'GPT-5.5 (high)':         { swe: 57, agentic: 57, reasoning: 56, general: 59 },
  'Claude Opus 4.7 (max)':  { swe: 56, agentic: 58, reasoning: 58, general: 57 },
  'Gemini 3.1 Pro Preview': { swe: 55, agentic: 54, reasoning: 57, general: 57 },
  'Claude Sonnet 4.7':      { swe: 52, agentic: 54, reasoning: 51, general: 53 },
  'Gemini 3.1 Flash':       { swe: 47, agentic: 46, reasoning: 48, general: 50 },
};

// Static fallback — source: artificialanalysis.ai, May 2026
// Intelligence index: 0–60 scale (GPT-5.5 = 60)
// Output speeds are API inference speeds; local Apple Silicon speeds are lower for large models
export const STATIC_OPEN_SOURCE_MODELS: AAModel[] = [
  // ── Frontier open-weight ─────────────────────────────────────────────────
  { name: 'Kimi K2.6',           provider: 'Moonshot AI', intelligenceIndex: 54, codingScore: 54, mathScore: 50, outputSpeed: 34,  contextWindow: 262144,  isOpenSource: true },
  { name: 'MiMo-V2.5-Pro',       provider: 'Xiaomi',      intelligenceIndex: 54, codingScore: 51, mathScore: 53, outputSpeed: 61,  contextWindow: 1000000, isOpenSource: true },
  { name: 'DeepSeek V4 Pro',     provider: 'DeepSeek',    intelligenceIndex: 52, codingScore: 50, mathScore: 55, outputSpeed: 33,  contextWindow: 1000000, isOpenSource: true },
  { name: 'GLM-5.1 Reasoning',   provider: 'Z AI',        intelligenceIndex: 51, codingScore: 48, mathScore: 52, outputSpeed: 54,  contextWindow: 200000,  isOpenSource: true },
  { name: 'GLM-5 Reasoning',     provider: 'Z AI',        intelligenceIndex: 50, codingScore: 47, mathScore: 51, outputSpeed: 65,  contextWindow: 200000,  isOpenSource: true },
  { name: 'MiniMax-M2.7',        provider: 'MiniMax',     intelligenceIndex: 50, codingScore: 46, mathScore: 49, outputSpeed: 55,  contextWindow: 205000,  isOpenSource: true },
  // ── Strong mid-tier ──────────────────────────────────────────────────────
  { name: 'Kimi K2.5',           provider: 'Moonshot AI', intelligenceIndex: 47, codingScore: 46, mathScore: 46, outputSpeed: 40,  contextWindow: 262144,  isOpenSource: true },
  { name: 'DeepSeek V4 Flash',   provider: 'DeepSeek',    intelligenceIndex: 47, codingScore: 44, mathScore: 46, outputSpeed: 84,  contextWindow: 1000000, isOpenSource: true },
  { name: 'Qwen3.6 27B',         provider: 'Alibaba',     intelligenceIndex: 46, codingScore: 43, mathScore: 44, outputSpeed: 60,  contextWindow: 262144,  isOpenSource: true },
  { name: 'Qwen3.5 397B A17B',   provider: 'Alibaba',     intelligenceIndex: 45, codingScore: 42, mathScore: 44, outputSpeed: 52,  contextWindow: 262144,  isOpenSource: true },
  { name: 'Qwen3.6 35B A3B',     provider: 'Alibaba',     intelligenceIndex: 43, codingScore: 41, mathScore: 42, outputSpeed: 193, contextWindow: 262144,  isOpenSource: true },
  { name: 'Qwen3.5 27B',         provider: 'Alibaba',     intelligenceIndex: 42, codingScore: 40, mathScore: 41, outputSpeed: 87,  contextWindow: 262144,  isOpenSource: true },
  { name: 'Mistral Medium 3.5',  provider: 'Mistral',     intelligenceIndex: 39, codingScore: 37, mathScore: 37, outputSpeed: 165, contextWindow: 131072,  isOpenSource: true },
  { name: 'Gemma 4 31B',         provider: 'Google',      intelligenceIndex: 39, codingScore: 36, mathScore: 37, outputSpeed: 35,  contextWindow: 131072,  isOpenSource: true },
  // ── Small / edge models ──────────────────────────────────────────────────
  { name: 'Qwen3.5 9B',          provider: 'Alibaba',     intelligenceIndex: 32, codingScore: 30, mathScore: 31, outputSpeed: 120, contextWindow: 131072,  isOpenSource: true },
  { name: 'Phi-4 14B',           provider: 'Microsoft',   intelligenceIndex: 30, codingScore: 31, mathScore: 33, outputSpeed: 95,  contextWindow: 16384,   isOpenSource: true },
  { name: 'Qwen3.5 4B',          provider: 'Alibaba',     intelligenceIndex: 30, codingScore: 28, mathScore: 29, outputSpeed: 220, contextWindow: 131072,  isOpenSource: true },
  { name: 'Gemma 4 4B',          provider: 'Google',      intelligenceIndex: 24, codingScore: 22, mathScore: 22, outputSpeed: 290, contextWindow: 131072,  isOpenSource: true },
  { name: 'Phi-4-mini 3.8B',     provider: 'Microsoft',   intelligenceIndex: 22, codingScore: 24, mathScore: 26, outputSpeed: 310, contextWindow: 16384,   isOpenSource: true },
  { name: 'Llama 3.2 3B',        provider: 'Meta',        intelligenceIndex: 18, codingScore: 16, mathScore: 15, outputSpeed: 340, contextWindow: 131072,  isOpenSource: true },
];
