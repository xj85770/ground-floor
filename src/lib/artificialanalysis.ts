// Build-time fetch from artificialanalysis.ai API
// Returns only open-weight/open-source models, sorted by intelligence index
// Intelligence Index is 0–100 scale. Current world ceiling is GPT-5.5 at 60 (May 2026).
// Scores are low because benchmarks are hard: Humanity's Last Exam, GPQA Diamond, SciCode, etc.
// A score of 54 means the model answered 54% of an extremely difficult multi-domain eval mix.

export interface AAModel {
  name: string;
  provider: string;
  intelligenceIndex: number | null;
  codingScore: number | null;
  mathScore: number | null;
  outputSpeed: number | null; // tokens/sec (API speed from AA; local Apple Silicon speeds differ)
  contextWindow: number | null;
  isOpenSource: boolean;
  minRamGb: number | null;    // minimum unified memory (GB) to run at lowest useful quant
  requiresCluster?: boolean;  // needs TB5 RDMA cluster (256 GB effective, 244 GB usable)
  clusterNote?: string;       // what quantization / why it needs the cluster
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
  // InclusionAI
  'ling',
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
        minRamGb:          null,
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
      `Highest overall intelligence index (${m.intelligenceIndex ?? '—'}/100) in the open-weight leaderboard. The go-to when you want one model that handles most tasks well.`,
  },
];

// Closed-source reference — scores from artificialanalysis.ai, May 2026
// Same 0–100 scale. Shown for context only.
export interface ClosedModel {
  name: string;
  provider: string;
  intelligenceIndex: number;
  note: string;
  outputSpeed: number;
}

export const CLOSED_SOURCE_REFERENCE: ClosedModel[] = [
  { name: 'GPT-5.5 (xhigh)',       provider: 'OpenAI',    intelligenceIndex: 60, outputSpeed: 85,  note: 'Top model, May 2026. API only.' },
  { name: 'GPT-5.5 (high)',         provider: 'OpenAI',    intelligenceIndex: 59, outputSpeed: 83,  note: 'API only.' },
  { name: 'Claude Opus 4.7 (max)',  provider: 'Anthropic', intelligenceIndex: 57, outputSpeed: 56,  note: 'API only.' },
  { name: 'Gemini 3.1 Pro Preview', provider: 'Google',    intelligenceIndex: 57, outputSpeed: 141, note: 'API only.' },
  { name: 'Claude Opus 4.7',        provider: 'Anthropic', intelligenceIndex: 52, outputSpeed: 44,  note: 'API only.' },
  { name: 'GPT-5.5 (low)',          provider: 'OpenAI',    intelligenceIndex: 51, outputSpeed: 84,  note: 'API only.' },
  { name: 'Gemini 3.1 Flash',       provider: 'Google',    intelligenceIndex: 46, outputSpeed: 183, note: 'API only, fast tier.' },
  { name: 'Claude Sonnet 4.6',      provider: 'Anthropic', intelligenceIndex: 44, outputSpeed: 51,  note: 'Powers Claude Code. Strong agentic performance — reliable everyday benchmark. API only.' },
];

// Per-task scores — derived from benchmark data, May 2026 (0–100 scale, current ceiling ~60)
export const TASK_SCORES: Record<string, Record<string, number>> = {
  // Open-weight
  'Kimi K2.6':               { swe: 54, agentic: 51, reasoning: 50, general: 54 },
  'MiMo-V2.5-Pro':           { swe: 51, agentic: 50, reasoning: 53, general: 54 },
  'Qwen3.6 Max Preview':     { swe: 51, agentic: 50, reasoning: 52, general: 52 },
  'DeepSeek V4 Pro':         { swe: 50, agentic: 49, reasoning: 55, general: 52 },
  'GLM-5.1 Reasoning':       { swe: 48, agentic: 47, reasoning: 52, general: 51 },
  'GLM-5 Reasoning':         { swe: 47, agentic: 46, reasoning: 51, general: 50 },
  'MiniMax-M2.7':            { swe: 46, agentic: 48, reasoning: 49, general: 50 },
  'Qwen3.6 Plus':            { swe: 47, agentic: 51, reasoning: 49, general: 50 },
  'DeepSeek V4 Flash':       { swe: 44, agentic: 43, reasoning: 46, general: 47 },
  'Qwen3.6 27B':             { swe: 43, agentic: 44, reasoning: 44, general: 46 },
  'Qwen3.5 397B A17B':       { swe: 42, agentic: 43, reasoning: 44, general: 45 },
  'Qwen3.5 27B':             { swe: 40, agentic: 39, reasoning: 41, general: 42 },
  'Ling 2.6 Flash':          { swe: 24, agentic: 23, reasoning: 23, general: 26 },
  'Ling-1T':                 { swe: 19, agentic: 18, reasoning: 18, general: 20 },
  'Gemma 4 31B':             { swe: 36, agentic: 35, reasoning: 37, general: 39 },
  'Mistral Medium 3.5':      { swe: 37, agentic: 36, reasoning: 37, general: 39 },
  // RDMA cluster models
  'DeepSeek-R1 671B':          { swe: 52, agentic: 53, reasoning: 58, general: 55 },
  'Qwen3.5 235B A22B Q8':      { swe: 49, agentic: 50, reasoning: 51, general: 50 },
  // Closed reference (same scale)
  'GPT-5.5 (xhigh)':        { swe: 59, agentic: 58, reasoning: 57, general: 60 },
  'GPT-5.5 (high)':         { swe: 57, agentic: 57, reasoning: 56, general: 59 },
  'Claude Opus 4.7 (max)':  { swe: 56, agentic: 58, reasoning: 58, general: 57 },
  'Gemini 3.1 Pro Preview': { swe: 55, agentic: 54, reasoning: 57, general: 57 },
  'Claude Opus 4.7':        { swe: 52, agentic: 54, reasoning: 51, general: 52 },
  'Claude Sonnet 4.6':      { swe: 43, agentic: 46, reasoning: 42, general: 44 },
  'Gemini 3.1 Flash':       { swe: 43, agentic: 42, reasoning: 44, general: 46 },
};

// ── Human intelligence tier system ─────────────────────────────────────────
// Mapped to the 0–100 Intelligence Index scale.
// Tiers are ordered highest → lowest; getTier() returns the first match.

export interface Tier {
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  accent: string;
  bg: string;
  border: string;
  description: string;
  skills: string[];
}

export const TIERS: Tier[] = [
  {
    label: 'PhD · Frontier research',
    shortLabel: 'Frontier PhD',
    min: 68, max: 100,
    accent: '#e879f9', bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.3)',
    description: 'Generates novel hypotheses; solves open research problems; produces work that could advance a field.',
    skills: [
      'Proposes and tests original research hypotheses not in the training corpus',
      'Identifies unsolved problems at the edge of a scientific field',
      'Writes grant proposals reviewers cannot distinguish from expert submissions',
      'Writes poetry with genuine stylistic innovation — not imitation of any existing poet',
    ],
  },
  {
    label: 'PhD with distinction',
    shortLabel: 'PhD+',
    min: 60, max: 67,
    accent: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)',
    description: 'Systematic expert-level analysis across multiple disciplines. Current world ceiling — GPT-5.5 scores 60.',
    skills: [
      'Identifies factual errors and methodological flaws in published papers',
      'Synthesizes across unrelated disciplines to surface non-obvious connections',
      'Produces research-quality writing that could pass peer review',
      'Writes poetry with genuine literary merit a reviewer could attribute to a published poet',
    ],
  },
  {
    label: 'PhD',
    shortLabel: 'PhD',
    min: 53, max: 59,
    accent: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)',
    description: 'Tackles novel research questions; comparable to a junior faculty member in a specialized domain.',
    skills: [
      'Identifies gaps in existing literature and proposes studies to fill them',
      'Produces publishable draft sections of a scientific paper',
      'Reviews code and identifies subtle algorithmic inefficiencies across a large codebase',
      'Writes a poem using meter, imagery, and controlling conceit in a unified way',
    ],
  },
  {
    label: 'Graduate specialist + real world',
    shortLabel: 'Grad Specialist',
    min: 45, max: 52,
    accent: '#60a5fa', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.25)',
    description: 'Domain expertise applied to messy, real-world inputs — the ambiguity professionals encounter daily.',
    skills: [
      'Identifies subtle contradictions spread across a 50-page contract',
      'Writes a technically accurate oncology referral letter directly from raw visit notes',
      'Flags methodological problems in a clinical trial design narrative',
      'Writes an original sonnet with correct meter and a genuine emotional argument',
    ],
  },
  {
    label: 'Graduate',
    shortLabel: 'Graduate',
    min: 36, max: 44,
    accent: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)',
    description: 'Synthesizes research across papers; writes production code; handles structured professional tasks.',
    skills: [
      'Reads five research papers and synthesizes their conclusions into a coherent argument',
      'Builds a working REST API from a spec without scaffolding',
      'Identifies clause-level issues in a standard commercial contract',
      'Drafts a clinical SOAP note from a visit transcript',
      'Analyzes poetic technique using critical theory vocabulary',
    ],
  },
  {
    label: 'Smart undergrad',
    shortLabel: 'Smart Undergrad',
    min: 28, max: 35,
    accent: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)',
    description: 'Competent at structured academic tasks; writes functional code; reasons across a single domain.',
    skills: [
      'Writes a literature review with accurate citations and a coherent argument',
      'Debugs moderately complex code across multiple files',
      'Drafts a business proposal with coherent financial rationale',
      'Writes a structured legal argument at a 1L level',
      'Writes a sonnet with correct rhyme scheme, iambic meter, and a volta',
    ],
  },
  {
    label: 'Smart high school',
    shortLabel: 'Smart HS',
    min: 21, max: 27,
    accent: '#fb923c', bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.25)',
    description: 'Handles multi-step reasoning; writes functional short programs; analyzes texts with modest depth.',
    skills: [
      'Writes a short story with a plot arc and character motivation',
      'Writes a Python script to parse a CSV and compute descriptive statistics',
      'Analyzes a poem\'s structure, imagery, and central theme',
      'Solves introductory chemistry and physics word problems',
    ],
  },
  {
    label: 'High school',
    shortLabel: 'High School',
    min: 13, max: 20,
    accent: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)',
    description: 'Competent at summarization and basic writing; simple code; single-step reasoning.',
    skills: [
      'Summarizes a newspaper article with accurate main points',
      'Writes a 5-paragraph essay with a clear thesis and supporting paragraphs',
      'Writes a loop and handles basic I/O in Python',
      'Writes a rhyming poem on a given topic (ABAB scheme)',
    ],
  },
  {
    label: 'Elementary school',
    shortLabel: 'Elementary',
    min: 0, max: 12,
    accent: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',
    description: 'Handles simple factual questions and basic instructions; limited on multi-step or abstract tasks.',
    skills: [
      'Answers simple factual questions ("What is the capital of France?")',
      'Follows basic instructions — translate a phrase, fill in a blank',
      'Writes a few sentences about a familiar topic',
      'Writes a simple rhyming couplet',
    ],
  },
];

export function getTier(score: number | null): Tier {
  if (score === null) return TIERS[TIERS.length - 1];
  for (const tier of TIERS) {
    if (score >= tier.min) return tier;
  }
  return TIERS[TIERS.length - 1];
}

// Static fallback — source: artificialanalysis.ai, May 2026
// Intelligence index: 0–100 scale. No model has scored above 60 yet (May 2026).
// Output speeds are API inference speeds; local Apple Silicon speeds are lower for large models
export const STATIC_OPEN_SOURCE_MODELS: AAModel[] = [
  // ── Frontier open-weight (1T+ MoE — need 3–4 node cluster or future 512 GB hardware) ──
  // minRamGb = Q2_K quantization minimum. These do NOT fit the current 2-node 244 GB cluster.
  { name: 'Kimi K2.6',              provider: 'Moonshot AI', intelligenceIndex: 54, codingScore: 54, mathScore: 50, outputSpeed: 34,  contextWindow: 262144,  isOpenSource: true, minRamGb: 360 },  // 1T total / 32B active
  { name: 'MiMo-V2.5-Pro',          provider: 'Xiaomi',      intelligenceIndex: 54, codingScore: 51, mathScore: 53, outputSpeed: 68,  contextWindow: 1000000, isOpenSource: true, minRamGb: 360 },  // 1T total / 42B active
  { name: 'Qwen3.6 Max Preview',    provider: 'Alibaba',     intelligenceIndex: 52, codingScore: 50, mathScore: 51, outputSpeed: 36,  contextWindow: 262144,  isOpenSource: true, minRamGb: null }, // param count undisclosed
  { name: 'DeepSeek V4 Pro',        provider: 'DeepSeek',    intelligenceIndex: 52, codingScore: 50, mathScore: 55, outputSpeed: 34,  contextWindow: 1000000, isOpenSource: true, minRamGb: 580 },  // 1.6T total / 49B active
  { name: 'GLM-5.1 Reasoning',      provider: 'Z AI',        intelligenceIndex: 51, codingScore: 48, mathScore: 52, outputSpeed: 60,  contextWindow: 200000,  isOpenSource: true, minRamGb: null }, // param count not published
  { name: 'GLM-5 Reasoning',        provider: 'Z AI',        intelligenceIndex: 50, codingScore: 47, mathScore: 51, outputSpeed: 65,  contextWindow: 200000,  isOpenSource: true, minRamGb: null }, // param count not published
  { name: 'Qwen3.6 Plus',           provider: 'Alibaba',     intelligenceIndex: 50, codingScore: 48, mathScore: 50, outputSpeed: 53,  contextWindow: 1000000, isOpenSource: true, minRamGb: null }, // proprietary, size undisclosed
  { name: 'MiniMax-M2.7',           provider: 'MiniMax',     intelligenceIndex: 50, codingScore: 46, mathScore: 49, outputSpeed: 55,  contextWindow: 205000,  isOpenSource: true, minRamGb: 110 },  // 230B total / 10B active — Q3 ~110 GB
  // ── Strong mid-tier ──────────────────────────────────────────────────────
  { name: 'DeepSeek V4 Flash',   provider: 'DeepSeek',    intelligenceIndex: 47, codingScore: 44, mathScore: 46, outputSpeed: 82,  contextWindow: 1000000, isOpenSource: true, minRamGb: 135 },  // 284B total / 13B active — Q3 ~135 GB
  { name: 'Qwen3.6 27B',         provider: 'Alibaba',     intelligenceIndex: 46, codingScore: 43, mathScore: 44, outputSpeed: 66,  contextWindow: 262144,  isOpenSource: true, minRamGb: 17 },
  { name: 'Qwen3.5 397B A17B',   provider: 'Alibaba',     intelligenceIndex: 45, codingScore: 42, mathScore: 44, outputSpeed: 53,  contextWindow: 262144,  isOpenSource: true, minRamGb: 150 },  // 397B total — Q2_K ~150 GB
  { name: 'Qwen3.6 35B A3B',     provider: 'Alibaba',     intelligenceIndex: 43, codingScore: 41, mathScore: 42, outputSpeed: 200, contextWindow: 262144,  isOpenSource: true, minRamGb: 23 },
  { name: 'Qwen3.5 27B',         provider: 'Alibaba',     intelligenceIndex: 42, codingScore: 40, mathScore: 41, outputSpeed: 87,  contextWindow: 262144,  isOpenSource: true, minRamGb: 17 },
  { name: 'Mistral Medium 3.5',  provider: 'Mistral',     intelligenceIndex: 39, codingScore: 37, mathScore: 37, outputSpeed: 173, contextWindow: 131072,  isOpenSource: true, minRamGb: null }, // param count not published
  { name: 'Gemma 4 31B',         provider: 'Google',      intelligenceIndex: 39, codingScore: 36, mathScore: 37, outputSpeed: 35,  contextWindow: 131072,  isOpenSource: true, minRamGb: 20 },
  { name: 'Kimi K2.5',           provider: 'Moonshot AI', intelligenceIndex: 37, codingScore: 36, mathScore: 36, outputSpeed: 50,  contextWindow: 262144,  isOpenSource: true, minRamGb: 360 },  // 1T MoE like K2.6
  // ── TB5 RDMA cluster (244 GB usable, current 2-node setup) ───────────────
  {
    name: 'DeepSeek-R1 671B',
    provider: 'DeepSeek',
    intelligenceIndex: 55,
    codingScore: 52,
    mathScore: 58,
    outputSpeed: 8,
    contextWindow: 131072,
    isOpenSource: true,
    minRamGb: 190,
    requiresCluster: true,
    clusterNote: 'Q2_K ~190 GB — fits in 244 GB usable across both nodes. The full 671B reasoning model, not a distilled version.',
  },
  {
    name: 'Qwen3.5 235B A22B Q8',
    provider: 'Alibaba',
    intelligenceIndex: 50,
    codingScore: 48,
    mathScore: 50,
    outputSpeed: 12,
    contextWindow: 262144,
    isOpenSource: true,
    minRamGb: 235,
    requiresCluster: true,
    clusterNote: 'Q8 full precision ~235 GB — exactly fills the 244 GB cluster window. Highest quality Qwen3.5 MoE run.',
  },
  // ── Needs 3–4 node cluster or 512 GB hardware (future) ───────────────────
  {
    name: 'Ling-1T',
    provider: 'InclusionAI',
    intelligenceIndex: 20,
    codingScore: null,
    mathScore: null,
    outputSpeed: null,
    contextWindow: 128000,
    isOpenSource: true,
    minRamGb: 375,
    requiresCluster: true,
    clusterNote: 'Q3_K_M ~375 GB — beyond the current 2-node setup (244 GB). Needs 3-node cluster (~366 GB usable) or a future 512 GB Mac. At Q4: ~500 GB (4 nodes). 1T total / 50B active params, MIT license.',
  },
  // ── Small / edge models ──────────────────────────────────────────────────
  { name: 'Qwen3.5 9B',          provider: 'Alibaba',      intelligenceIndex: 32, codingScore: 30, mathScore: 31, outputSpeed: 120, contextWindow: 131072,  isOpenSource: true, minRamGb: 6 },
  { name: 'Phi-4 14B',           provider: 'Microsoft',    intelligenceIndex: 30, codingScore: 31, mathScore: 33, outputSpeed: 95,  contextWindow: 16384,   isOpenSource: true, minRamGb: 10 },
  { name: 'Qwen3.5 4B',          provider: 'Alibaba',      intelligenceIndex: 27, codingScore: 26, mathScore: 26, outputSpeed: 182, contextWindow: 131072,  isOpenSource: true, minRamGb: 3 },
  { name: 'Ling 2.6 Flash',      provider: 'InclusionAI',  intelligenceIndex: 26, codingScore: null, mathScore: null, outputSpeed: 206, contextWindow: 262144, isOpenSource: true, minRamGb: null },
  { name: 'Gemma 4 4B',          provider: 'Google',       intelligenceIndex: 24, codingScore: 22, mathScore: 22, outputSpeed: 290, contextWindow: 131072,  isOpenSource: true, minRamGb: 3 },
  { name: 'Phi-4-mini 3.8B',     provider: 'Microsoft',    intelligenceIndex: 22, codingScore: 24, mathScore: 26, outputSpeed: 310, contextWindow: 16384,   isOpenSource: true, minRamGb: 3 },
  { name: 'Llama 3.2 3B',        provider: 'Meta',         intelligenceIndex: 18, codingScore: 16, mathScore: 15, outputSpeed: 340, contextWindow: 131072,  isOpenSource: true, minRamGb: 2 },
];
