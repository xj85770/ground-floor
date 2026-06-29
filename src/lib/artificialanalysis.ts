// Build-time fetch from artificialanalysis.ai API
// Returns only open-weight/open-source models, sorted by intelligence index
// Intelligence Index is 0–100 scale (AA Intelligence Index v4.1, June 2026).
// Current world ceiling is Claude Fable 5 at 60 — but Fable 5 is currently unavailable,
//   so Claude Opus 4.8 at 56 is the top *available* model. (GPT-5.5 xhigh is 55.)
// Top open-weight model is now GLM-5.2 at 51 (AA Intelligence Index v4.1).
// v4.1 re-baselined the scale downward (~10–12 pts vs v4.0) and re-weighted toward agentic work.
// Scores are low because benchmarks are hard: Humanity's Last Exam, GPQA Diamond, SciCode, etc.
// A score of 51 means the model answered 51% of an extremely difficult multi-domain eval mix.

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
      console.warn(`artificialanalysis.ai responded ${res.status}, using static data`);
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
    console.warn('artificialanalysis.ai fetch failed, using static data:', err);
    return [];
  }
}

// Use-case recommendation logic, driven by live scores
export const USE_CASE_RECS: UseCaseRec[] = [
  {
    useCase: 'swe',
    label: 'Software engineering',
    description: 'Code generation, bug fixes, refactoring, test writing, single-shot tasks on a specific file or function',
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
      `Best composite for long-horizon work: intelligence ${m.intelligenceIndex ?? ', '}, ${m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : 'large'} context. Agentic loops need a model that tracks state, calls tools reliably, and recovers across many steps, not just writes code.`,
  },
  {
    useCase: 'reasoning',
    label: 'Reasoning / Chain-of-thought',
    description: 'Explicit step-by-step logic, audits, diagnostics, structured analysis',
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
      `Top reasoning model in current open-weight rankings (intelligence ${m.intelligenceIndex ?? ', '}). Reasoning-mode models expose their chain-of-thought, every conclusion is auditable, which matters for regulated workflows.`,
  },
  {
    useCase: 'clinical_documentation',
    label: 'Clinical documentation',
    description: 'SOAP notes, visit summaries, referral letters, must stay on-device',
    icon: '♥',
    pickFn: (models) =>
      models.filter(m => (m.contextWindow ?? 0) >= 65536)[0] ?? models[0],
    why: (m) =>
      `Top intelligence (${m.intelligenceIndex ?? ', '}) with ${m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : 'large'} context, handles full visit transcripts without truncation. No data leaves the device.`,
  },
  {
    useCase: 'legal_analysis',
    label: 'Legal analysis',
    description: 'Contract review, clause extraction, red-lining, precision matters',
    icon: '⚖',
    pickFn: (models) =>
      [...models]
        .filter(m => (m.contextWindow ?? 0) >= 32768)
        .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))[0] ?? models[0],
    why: (m) =>
      `Highest reasoning quality (${m.intelligenceIndex ?? ', '}) among models with sufficient context for full contracts. Hallucination rate at Q4/Q8 is low enough for attorney review loops.`,
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
      `Strong math benchmarks + ${m.outputSpeed ?? ', '} t/s output. Fast enough for live meeting capture; accurate enough for numbers-heavy summaries.`,
  },
  {
    useCase: 'fast_turnaround',
    label: 'Fast turnaround',
    description: 'Near-real-time tasks: form filling, short summaries, simple Q&A',
    icon: '⚡',
    pickFn: (models) =>
      [...models].sort((a, b) => (b.outputSpeed ?? 0) - (a.outputSpeed ?? 0))[0],
    why: (m) =>
      `${m.outputSpeed ?? ', '} t/s, fastest open-weight model in current rankings. Sufficient intelligence (${m.intelligenceIndex ?? ', '}) for structured short-form output.`,
  },
  {
    useCase: 'general_purpose',
    label: 'General purpose',
    description: 'Best single model if you only want to run one',
    icon: '◆',
    pickFn: (models) => models[0],
    why: (m) =>
      `Highest overall intelligence index (${m.intelligenceIndex ?? ', '}/100) in the open-weight leaderboard. The go-to when you want one model that handles most tasks well.`,
  },
];

// Closed-source reference, scores from artificialanalysis.ai (AA Intelligence Index v4.1), June 2026
// Same 0–100 scale. Shown for context only. outputSpeed is approximate API speed (t/s).
export interface ClosedModel {
  name: string;
  provider: string;
  intelligenceIndex: number;
  note: string;
  outputSpeed: number;
}

export const CLOSED_SOURCE_REFERENCE: ClosedModel[] = [
  { name: 'Claude Fable 5 (max)',   provider: 'Anthropic', intelligenceIndex: 60, outputSpeed: 50,  note: '#1 overall, June 2026 (Opus 4.8 fallback). Currently UNAVAILABLE. API only.' },
  { name: 'Claude Opus 4.8 (max)',  provider: 'Anthropic', intelligenceIndex: 56, outputSpeed: 50,  note: 'Top *available* model, June 2026. API only.' },
  { name: 'GPT-5.5 (xhigh)',        provider: 'OpenAI',    intelligenceIndex: 55, outputSpeed: 85,  note: 'API only.' },
  { name: 'Gemini 3.5 Flash (high)',provider: 'Google',    intelligenceIndex: 55, outputSpeed: 180, note: 'API only, fast tier.' },
  { name: 'Claude Opus 4.7 (max)',  provider: 'Anthropic', intelligenceIndex: 54, outputSpeed: 56,  note: 'API only.' },
  { name: 'GPT-5.5 (high)',         provider: 'OpenAI',    intelligenceIndex: 53, outputSpeed: 83,  note: 'API only.' },
  { name: 'Grok 4.3 (high)',        provider: 'xAI',       intelligenceIndex: 53, outputSpeed: 90,  note: 'API only.' },
  { name: 'Claude Sonnet 4.6 (max)',provider: 'Anthropic', intelligenceIndex: 52, outputSpeed: 51,  note: 'Powers Claude Code. Strong agentic performance, reliable everyday benchmark. API only.' },
  { name: 'Gemini 3.1 Pro Preview', provider: 'Google',    intelligenceIndex: 46, outputSpeed: 141, note: 'API only.' },
];

// Per-task scores on the AA Intelligence Index v4.1 scale, June 2026 (0–100, current ceiling 60).
// `general` is anchored to each model's verified v4.1 Intelligence Index; swe/agentic/reasoning
// are sub-estimates around it. Rows marked "v4.1 est." are cross-source/delta estimates pending
// AA-primary confirmation (the live AA_API_KEY feed supersedes all of these at build time).
export const TASK_SCORES: Record<string, Record<string, number>> = {
  // Open-weight — verified AA v4.1 Intelligence Index
  'GLM-5.2':                 { swe: 50, agentic: 50, reasoning: 50, general: 51 },  // new #1 open-weight; TerminalBench 78, SciCode 50, GPQA 89, HLE 40 (verbose: 43k tok/task)
  'MiniMax M3':              { swe: 44, agentic: 43, reasoning: 40, general: 44 },
  'DeepSeek V4 Pro':         { swe: 43, agentic: 43, reasoning: 44, general: 44 },
  'Kimi K2.6':               { swe: 43, agentic: 41, reasoning: 41, general: 43 },
  'MiMo-V2.5-Pro':           { swe: 40, agentic: 41, reasoning: 43, general: 42 },
  'Qwen3.6 Max Preview':     { swe: 39, agentic: 40, reasoning: 40, general: 40 },
  'DeepSeek V4 Flash':       { swe: 40, agentic: 39, reasoning: 39, general: 40 },
  'Qwen3.6 27B':             { swe: 36, agentic: 36, reasoning: 36, general: 37 },
  'Qwen3.5 27B':             { swe: 40, agentic: 39, reasoning: 41, general: 42 },
  'Gemma 4 31B':             { swe: 36, agentic: 35, reasoning: 37, general: 39 },
  // Open-weight — v4.1 est. (cross-source; pending AA-primary)
  'GLM-5.1 Reasoning':       { swe: 38, agentic: 38, reasoning: 41, general: 40 },  // GLM-5.1 = 40 (verified)
  'GLM-5 Reasoning':         { swe: 37, agentic: 37, reasoning: 39, general: 39 },  // v4.1 est.
  'Qwen3.6 Plus':            { swe: 38, agentic: 40, reasoning: 38, general: 39 },  // v4.1 est.
  'MiniMax-M2.7':            { swe: 37, agentic: 39, reasoning: 38, general: 38 },  // v4.1 est.
  'Qwen3.5 397B A17B':       { swe: 33, agentic: 34, reasoning: 34, general: 34 },  // v4.1 est.
  'Mistral Medium 3.5':      { swe: 32, agentic: 31, reasoning: 32, general: 33 },  // v4.1 est.
  'Ling 2.6 Flash':          { swe: 21, agentic: 20, reasoning: 20, general: 22 },  // v4.1 est.
  'Ling-1T':                 { swe: 16, agentic: 15, reasoning: 15, general: 16 },  // v4.1 est.
  'Mistral Small 4':         { swe: 23, agentic: 22, reasoning: 21, general: 24 },  // v4.1 est.
  'Granite 4.0 H Small':     { swe: 8,  agentic: 8,  reasoning: 7,  general: 9  },  // v4.1 est.
  // RDMA cluster models — v4.1 est. (older reasoning models; pending AA-primary)
  'DeepSeek-R1 671B':          { swe: 39, agentic: 40, reasoning: 44, general: 42 },  // v4.1 est. (was 55 on v4.0)
  'Qwen3.5 235B A22B Q8':      { swe: 39, agentic: 40, reasoning: 41, general: 40 },  // v4.1 est. (was 50 on v4.0)
  // Closed reference — verified AA v4.1
  'Claude Fable 5 (max)':   { swe: 59, agentic: 60, reasoning: 59, general: 60 },  // #1 overall, currently unavailable
  'Claude Opus 4.8 (max)':  { swe: 55, agentic: 57, reasoning: 56, general: 56 },  // top available
  'GPT-5.5 (xhigh)':        { swe: 55, agentic: 54, reasoning: 54, general: 55 },
  'Gemini 3.5 Flash (high)':{ swe: 54, agentic: 53, reasoning: 54, general: 55 },
  'Claude Opus 4.7 (max)':  { swe: 53, agentic: 55, reasoning: 54, general: 54 },
  'GPT-5.5 (high)':         { swe: 53, agentic: 53, reasoning: 52, general: 53 },
  'Grok 4.3 (high)':        { swe: 52, agentic: 53, reasoning: 53, general: 53 },
  'Claude Sonnet 4.6 (max)':{ swe: 51, agentic: 53, reasoning: 50, general: 52 },
  'Gemini 3.1 Pro Preview': { swe: 45, agentic: 44, reasoning: 47, general: 46 },
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
      'Writes poetry with genuine stylistic innovation, not imitation of any existing poet',
    ],
  },
  {
    label: 'PhD with distinction',
    shortLabel: 'PhD+',
    min: 60, max: 67,
    accent: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)',
    description: 'Systematic expert-level analysis across multiple disciplines. Current world ceiling, Claude Fable 5 scores 60 (Opus 4.8, the top available model, scores 56).',
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
    description: 'Domain expertise applied to messy, real-world inputs, the ambiguity professionals encounter daily.',
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
      'Follows basic instructions, translate a phrase, fill in a blank',
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

// Static fallback, source: artificialanalysis.ai, June 2026
// Intelligence index: 0–100 scale. No model has scored above 60 yet (June 2026).
// Output speeds are API inference speeds; local Apple Silicon speeds are lower for large models
export const STATIC_OPEN_SOURCE_MODELS: AAModel[] = [
  // ── New #1 open-weight (Jun 2026): GLM-5.2, large MoE that fits the 2-node cluster at low quant ──
  {
    name: 'GLM-5.2',
    provider: 'Z AI',
    intelligenceIndex: 51,  // AA Intelligence Index v4.1 — #1 open-weight (+11 over GLM-5.1)
    codingScore: 50,        // SciCode 50, TerminalBench v2.1 78, GPQA Diamond 89
    mathScore: 49,          // HLE 40, CritPt 21 — strong but reasoning is the relative weak spot
    outputSpeed: 55,        // API; very verbose (~43k tok/task). Local 2-node IQ1_S ~15 t/s.
    contextWindow: 1000000, // 1M-token context
    isOpenSource: true,
    minRamGb: 150,          // 744B total / 40B active MoE; IQ1_S (~150 GB) fits the 2-node window, IQ2_M ~222 GB
    requiresCluster: true,
    clusterNote: 'New #1 open-weight on the AA Intelligence Index v4.1 (51), +11 over GLM-5.1. On real coding and agentic work it BEATS GPT-5.5 — SWE-bench Pro 62.1 vs 58.6, FrontierSWE 74.4% vs 72.6%, MCP-Atlas 77.0 vs 75.3, GDPval-AA 1524 vs 1514 — and lands within a point of the top closed model, Opus 4.8, at roughly 1/6 the API cost. It trails only on Terminal-Bench 2.1 (81 vs 84) and the composite Index (where GPT-5.5 is 55), and has no image input yet. 744B total / 40B active MoE, MIT license, 1M context. IQ1_S (~150 GB) runs across the 244 GB 2-node cluster at ~15 t/s; IQ2_M (~222 GB) also fits. Verbose (~43k tokens/task). Self-hostable open weights — beats a cloud frontier model on real work, air-gapped and cheap.',
  },
  {
    name: 'MiniMax M3',
    provider: 'MiniMax',
    intelligenceIndex: 44,  // AA Intelligence Index v4.1 (was 55 on v4.0)
    codingScore: null,      // AA reports the composite Index for M3; no separate coding sub-score published yet
    mathScore: null,        //   (M3 leads SWE-Bench Pro but is weak on abstract reasoning, see task scores)
    outputSpeed: 58,        // notably slow + very verbose
    contextWindow: 1000000, // 1M-token context via MiniMax Sparse Attention
    isOpenSource: true,
    minRamGb: 160,          // 428B total / 23B active MoE, Q2_K ~160 GB
    requiresCluster: true,
    clusterNote: 'First multimodal M-series (text + image + video in), 1M context. 428B total / 23B active MoE, Q2_K (~160 GB) fits inside the 244 GB 2-node window; needs both nodes. Joint-2nd open-weight Intelligence Index (44, AA v4.1, tied with DeepSeek V4 Pro) behind GLM-5.2 (51), but slow and very verbose in practice. Self-hostable open weights, which suits air-gapped deployment.',
  },
  // ── Frontier open-weight (1T+ MoE, need 3–4 node cluster or future 512 GB hardware) ──
  // minRamGb = Q2_K quantization minimum. These do NOT fit the current 2-node 244 GB cluster.
  { name: 'DeepSeek V4 Pro',        provider: 'DeepSeek',    intelligenceIndex: 44, codingScore: 43, mathScore: 44, outputSpeed: 34,  contextWindow: 1000000, isOpenSource: true, minRamGb: 580 },  // v4.1 (was 52). 1.6T total / 49B active
  { name: 'Kimi K2.6',              provider: 'Moonshot AI', intelligenceIndex: 43, codingScore: 43, mathScore: 41, outputSpeed: 34,  contextWindow: 262144,  isOpenSource: true, minRamGb: 360 },  // v4.1 (was 54). 1T total / 32B active
  { name: 'MiMo-V2.5-Pro',          provider: 'Xiaomi',      intelligenceIndex: 42, codingScore: 40, mathScore: 43, outputSpeed: 68,  contextWindow: 1000000, isOpenSource: true, minRamGb: 360 },  // v4.1 (was 54). 1T total / 42B active
  { name: 'Qwen3.6 Max Preview',    provider: 'Alibaba',     intelligenceIndex: 40, codingScore: 39, mathScore: 40, outputSpeed: 36,  contextWindow: 262144,  isOpenSource: true, minRamGb: null }, // v4.1 (was 52). Note: AA now lists Qwen "Max" as proprietary/API-only — flagged for review
  { name: 'GLM-5.1 Reasoning',      provider: 'Z AI',        intelligenceIndex: 40, codingScore: 38, mathScore: 41, outputSpeed: 60,  contextWindow: 200000,  isOpenSource: true, minRamGb: null }, // v4.1 (was 51). Z AI has not published param count
  { name: 'GLM-5 Reasoning',        provider: 'Z AI',        intelligenceIndex: 39, codingScore: 37, mathScore: 39, outputSpeed: 65,  contextWindow: 200000,  isOpenSource: true, minRamGb: null }, // v4.1 est. (was 50)
  { name: 'Qwen3.6 Plus',           provider: 'Alibaba',     intelligenceIndex: 39, codingScore: 38, mathScore: 39, outputSpeed: 53,  contextWindow: 1000000, isOpenSource: true, minRamGb: null }, // v4.1 est. (was 50). Alibaba has not disclosed param count
  { name: 'MiniMax-M2.7',           provider: 'MiniMax',     intelligenceIndex: 38, codingScore: 37, mathScore: 38, outputSpeed: 55,  contextWindow: 205000,  isOpenSource: true, minRamGb: 110 },  // v4.1 est. (was 50). 230B total / 10B active, Q3 ~110 GB
  // ── Strong mid-tier ──────────────────────────────────────────────────────
  { name: 'DeepSeek V4 Flash',   provider: 'DeepSeek',    intelligenceIndex: 40, codingScore: 40, mathScore: 39, outputSpeed: 82,  contextWindow: 1000000, isOpenSource: true, minRamGb: 135 },  // v4.1 (was 47). 284B total / 13B active, Q3 ~135 GB
  { name: 'Qwen3.6 27B',         provider: 'Alibaba',     intelligenceIndex: 37, codingScore: 35, mathScore: 36, outputSpeed: 66,  contextWindow: 262144,  isOpenSource: true, minRamGb: 17 },  // v4.1 verified (27.8B params) — #1 open-weight in the small 4B–40B class
  { name: 'Qwen3.5 27B',         provider: 'Alibaba',     intelligenceIndex: 42, codingScore: 40, mathScore: 41, outputSpeed: 87,  contextWindow: 262144,  isOpenSource: true, minRamGb: 17 },  // v4.1 verified
  { name: 'Qwen3.6 35B A3B',     provider: 'Alibaba',     intelligenceIndex: 41, codingScore: 39, mathScore: 40, outputSpeed: 200, contextWindow: 262144,  isOpenSource: true, minRamGb: 23 },  // v4.1 est.
  { name: 'Gemma 4 31B',         provider: 'Google',      intelligenceIndex: 39, codingScore: 36, mathScore: 37, outputSpeed: 35,  contextWindow: 131072,  isOpenSource: true, minRamGb: 20 },  // v4.1 verified (Apache 2.0, multimodal)
  { name: 'Qwen3.5 397B A17B',   provider: 'Alibaba',     intelligenceIndex: 34, codingScore: 33, mathScore: 34, outputSpeed: 53,  contextWindow: 262144,  isOpenSource: true, minRamGb: 150 },  // v4.1 est. (was 45). 397B total, Q2_K ~150 GB
  { name: 'Mistral Medium 3.5',  provider: 'Mistral',     intelligenceIndex: 33, codingScore: 32, mathScore: 32, outputSpeed: 173, contextWindow: 131072,  isOpenSource: true, minRamGb: 79 },   // v4.1 est. (was 39). 128B dense, Q4_K_M ~79 GB
  { name: 'Kimi K2.5',           provider: 'Moonshot AI', intelligenceIndex: 28, codingScore: 28, mathScore: 27, outputSpeed: 50,  contextWindow: 262144,  isOpenSource: true, minRamGb: 360 },  // v4.1 est. (was 37). 1T MoE like K2.6
  // ── TB5 RDMA cluster (244 GB usable, current 2-node setup) ───────────────
  {
    name: 'DeepSeek-R1 671B',
    provider: 'DeepSeek',
    intelligenceIndex: 42,  // v4.1 est. (was 55 on v4.0 — older reasoning model, re-baselined down)
    codingScore: 39,
    mathScore: 44,
    outputSpeed: 8,
    contextWindow: 131072,
    isOpenSource: true,
    minRamGb: 190,
    requiresCluster: true,
    clusterNote: 'Q2_K ~190 GB, fits in 244 GB usable across both nodes. The full 671B reasoning model, not a distilled version. Now superseded on the leaderboard by GLM-5.2 and the V4 line.',
  },
  {
    name: 'Qwen3.5 235B A22B Q8',
    provider: 'Alibaba',
    intelligenceIndex: 40,  // v4.1 est. (was 50 on v4.0)
    codingScore: 39,
    mathScore: 41,
    outputSpeed: 12,
    contextWindow: 262144,
    isOpenSource: true,
    minRamGb: 235,
    requiresCluster: true,
    clusterNote: 'Q8 full precision ~235 GB, exactly fills the 244 GB cluster window. Highest quality Qwen3.5 MoE run.',
  },
  // ── Needs 3–4 node cluster or 512 GB hardware (future) ───────────────────
  {
    name: 'Ling-1T',
    provider: 'InclusionAI',
    intelligenceIndex: 16,  // v4.1 est. (was 20)
    codingScore: null,
    mathScore: null,
    outputSpeed: null,
    contextWindow: 128000,
    isOpenSource: true,
    minRamGb: 375,
    requiresCluster: true,
    clusterNote: 'Q3_K_M ~375 GB, beyond the current 2-node setup (244 GB). Needs 3-node cluster (~366 GB usable) or a future 512 GB Mac. At Q4: ~500 GB (4 nodes). 1T total / 50B active params, MIT license.',
  },
  // ── Small / edge models ──────────────────────────────────────────────────
  { name: 'Qwen3.5 9B',          provider: 'Alibaba',      intelligenceIndex: 25, codingScore: 24, mathScore: 24, outputSpeed: 120, contextWindow: 131072,  isOpenSource: true, minRamGb: 6 },   // v4.1 est. (was 32)
  { name: 'Phi-4 14B',           provider: 'Microsoft',    intelligenceIndex: 24, codingScore: 25, mathScore: 26, outputSpeed: 95,  contextWindow: 16384,   isOpenSource: true, minRamGb: 10 },  // v4.1 est. (was 30)
  { name: 'Gemma 4 4B',          provider: 'Google',       intelligenceIndex: 24, codingScore: 22, mathScore: 22, outputSpeed: 290, contextWindow: 131072,  isOpenSource: true, minRamGb: 3 },   // v4.1 est.
  { name: 'Mistral Small 4',     provider: 'Mistral',      intelligenceIndex: 24, codingScore: null, mathScore: null, outputSpeed: 172, contextWindow: 262144, isOpenSource: true, minRamGb: 55 },  // v4.1 est. (was 28). 119B total / 6.5B active MoE
  { name: 'Ling 2.6 Flash',      provider: 'InclusionAI',  intelligenceIndex: 22, codingScore: null, mathScore: null, outputSpeed: 206, contextWindow: 262144, isOpenSource: true, minRamGb: 49 },   // v4.1 est. (was 26). 107B total / 7.4B active MoE, Q3_K_M ~49 GB
  { name: 'Qwen3.5 4B',          provider: 'Alibaba',      intelligenceIndex: 21, codingScore: 20, mathScore: 20, outputSpeed: 182, contextWindow: 131072,  isOpenSource: true, minRamGb: 3 },   // v4.1 est. (was 27)
  { name: 'Phi-4-mini 3.8B',     provider: 'Microsoft',    intelligenceIndex: 18, codingScore: 19, mathScore: 21, outputSpeed: 310, contextWindow: 16384,   isOpenSource: true, minRamGb: 3 },   // v4.1 est. (was 22)
  { name: 'Llama 3.2 3B',        provider: 'Meta',         intelligenceIndex: 14, codingScore: 13, mathScore: 12, outputSpeed: 340, contextWindow: 131072,  isOpenSource: true, minRamGb: 2 },   // v4.1 est. (was 18)
  { name: 'Granite 4.0 H Small', provider: 'IBM',          intelligenceIndex: 9,  codingScore: null, mathScore: null, outputSpeed: 364, contextWindow: 128000, isOpenSource: true, minRamGb: 20 }, // v4.1 est. (was 11). 32B total / 9B active MoE, speed leader
];
