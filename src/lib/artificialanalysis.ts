// Build-time fetch from artificialanalysis.ai API
// Returns only open-weight/open-source models, sorted by intelligence index
// Intelligence Index is 0–100 scale (AA Intelligence Index v4.1, June 2026 baseline).
// UPDATED 2026-08-06: Claude Opus 5 (max) is the new world ceiling at 61, ahead of
//   Claude Fable 5 (60, previously #1) and GPT-5.6 Sol (59). Rankings below are additive —
//   prior June 2026 rows are kept for history, not deleted.
// Top open-weight model is now Kimi K3 (max) at 57 (AA Intelligence Index, Jul 2026) —
//   #7 overall, ahead of every proprietary model except Opus 5 / Fable 5 / GPT-5.6 Sol / Opus 4.8.
//   It supersedes GLM-5.2 (51), the prior open-weight #1. Kimi K3 is open-weight (attribution
//   license, not fully open-source — no training data/code), 2.8T total / 104B active MoE, 1M context.
//   IMPORTANT: Kimi K3 does NOT fit our 2-node cluster — even the most aggressive 1-bit GGUF needs
//   ~594 GB combined RAM/VRAM, well beyond the 244 GB usable across both M5 Max nodes. Listed for
//   reference/tracking; GLM-5.2 remains the practical #1 open-weight model we can actually run.
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
  // ── Added 2026-08-06 (new #1 overall + new releases since the June 2026 baseline) ──
  { name: 'Claude Opus 5 (max)',    provider: 'Anthropic', intelligenceIndex: 61, outputSpeed: 50,  note: 'NEW #1 overall, Aug 2026. API only.' },
  { name: 'Claude Fable 5 (max)',   provider: 'Anthropic', intelligenceIndex: 60, outputSpeed: 50,  note: '#2 overall. Previously #1 (June 2026); availability improved since the June outage. API only.' },
  { name: 'GPT-5.6 Sol (max)',      provider: 'OpenAI',    intelligenceIndex: 59, outputSpeed: 85,  note: 'API only.' },
  { name: 'Kimi K3 (max)',          provider: 'Moonshot AI',intelligenceIndex: 57, outputSpeed: 60, note: 'Open-weight, but #7 overall — beats every closed model except the three above and Opus 4.8. API only reference; see STATIC_OPEN_SOURCE_MODELS for local-hosting notes.' },
  { name: 'Claude Opus 4.8 (max)',  provider: 'Anthropic', intelligenceIndex: 56, outputSpeed: 50,  note: 'Top model as of the June 2026 baseline. API only.' },
  { name: 'GPT-5.6 Terra (max)',    provider: 'OpenAI',    intelligenceIndex: 55, outputSpeed: 85,  note: 'API only.' },
  { name: 'Grok 4.5 (high)',        provider: 'xAI',       intelligenceIndex: 54, outputSpeed: 90,  note: 'API only.' },
  { name: 'Claude Sonnet 5 (max)',  provider: 'Anthropic', intelligenceIndex: 53, outputSpeed: 51,  note: 'Powers Claude Code as of Aug 2026, succeeding Sonnet 4.6. API only.' },
  // ── June 2026 baseline (kept for history) ──
  { name: 'GPT-5.5 (xhigh)',        provider: 'OpenAI',    intelligenceIndex: 55, outputSpeed: 85,  note: 'API only.' },
  { name: 'Gemini 3.5 Flash (high)',provider: 'Google',    intelligenceIndex: 55, outputSpeed: 180, note: 'API only, fast tier.' },
  { name: 'Claude Opus 4.7 (max)',  provider: 'Anthropic', intelligenceIndex: 54, outputSpeed: 56,  note: 'API only.' },
  { name: 'GPT-5.5 (high)',         provider: 'OpenAI',    intelligenceIndex: 53, outputSpeed: 83,  note: 'API only.' },
  { name: 'Grok 4.3 (high)',        provider: 'xAI',       intelligenceIndex: 53, outputSpeed: 90,  note: 'API only. Superseded by Grok 4.5.' },
  { name: 'Claude Sonnet 4.6 (max)',provider: 'Anthropic', intelligenceIndex: 52, outputSpeed: 51,  note: 'Previously powered Claude Code; superseded by Sonnet 5. API only.' },
  { name: 'Gemini 3.1 Pro Preview', provider: 'Google',    intelligenceIndex: 46, outputSpeed: 141, note: 'API only.' },
];

// Per-task scores on the AA Intelligence Index v4.1 scale, June 2026 (0–100, current ceiling 60).
// `general` is anchored to each model's verified v4.1 Intelligence Index; swe/agentic/reasoning
// are sub-estimates around it. Rows marked "v4.1 est." are cross-source/delta estimates pending
// AA-primary confirmation (the live AA_API_KEY feed supersedes all of these at build time).
export const TASK_SCORES: Record<string, Record<string, number>> = {
  // Open-weight — verified AA v4.1 Intelligence Index (general = true index; sub-scores illustrative)
  'GLM-5.2':                 { swe: 50, agentic: 50, reasoning: 50, general: 51 },  // #1 open-weight; beats GPT-5.5 on SWE-bench Pro/FrontierSWE/MCP-Atlas/GDPval
  'MiniMax M3':              { swe: 44, agentic: 43, reasoning: 40, general: 44 },
  'DeepSeek V4 Pro':         { swe: 43, agentic: 43, reasoning: 44, general: 44 },
  'Kimi K2.6':               { swe: 43, agentic: 41, reasoning: 41, general: 43 },
  'MiMo-V2.5-Pro':           { swe: 40, agentic: 41, reasoning: 43, general: 42 },
  'GLM-5.1 Reasoning':       { swe: 39, agentic: 39, reasoning: 41, general: 40 },
  'GLM-5 Reasoning':         { swe: 39, agentic: 38, reasoning: 41, general: 40 },
  'DeepSeek V4 Flash':       { swe: 40, agentic: 39, reasoning: 39, general: 40 },
  'MiniMax-M2.7':            { swe: 37, agentic: 39, reasoning: 38, general: 38 },
  'Kimi K2.5':               { swe: 37, agentic: 36, reasoning: 37, general: 38 },
  'Qwen3.6 27B':             { swe: 36, agentic: 36, reasoning: 36, general: 37 },
  'Qwen3.5 397B A17B':       { swe: 33, agentic: 34, reasoning: 34, general: 34 },
  'Qwen3.5 27B':             { swe: 33, agentic: 33, reasoning: 34, general: 34 },
  'Qwen3.6 35B A3B':         { swe: 31, agentic: 32, reasoning: 31, general: 32 },
  'Mistral Medium 3.5':      { swe: 29, agentic: 29, reasoning: 30, general: 30 },
  'Gemma 4 31B':             { swe: 27, agentic: 27, reasoning: 28, general: 29 },
  'Qwen3.5 9B':              { swe: 24, agentic: 24, reasoning: 24, general: 25 },
  'DeepSeek-R1 671B':        { swe: 18, agentic: 19, reasoning: 22, general: 20 },  // v4.1 (was 55 on v4.0)
  'Mistral Small 4':         { swe: 20, agentic: 20, reasoning: 20, general: 21 },
  'Qwen3.5 4B':              { swe: 19, agentic: 19, reasoning: 20, general: 20 },
  'Ling 2.6 Flash':          { swe: 18, agentic: 18, reasoning: 18, general: 19 },
  'Ling-1T':                 { swe: 13, agentic: 12, reasoning: 13, general: 13 },
  'Gemma 4 E4B':             { swe: 11, agentic: 11, reasoning: 12, general: 12 },
  'Granite 4.0 H Small':     { swe: 5,  agentic: 5,  reasoning: 4,  general: 5  },
  'Phi-4 14B':               { swe: 5,  agentic: 4,  reasoning: 5,  general: 5  },
  // Open-weight — added 2026-08-06
  'Kimi K3':                 { swe: 56, agentic: 57, reasoning: 57, general: 57 },  // new #1 open-weight; #7 overall; can't fit our 2-node cluster (~594 GB min)
  // Closed reference — added 2026-08-06
  'Claude Opus 5 (max)':     { swe: 60, agentic: 61, reasoning: 60, general: 61 },  // new #1 overall
  'GPT-5.6 Sol (max)':       { swe: 58, agentic: 59, reasoning: 58, general: 59 },
  'GPT-5.6 Terra (max)':     { swe: 54, agentic: 55, reasoning: 54, general: 55 },
  'Grok 4.5 (high)':         { swe: 53, agentic: 54, reasoning: 54, general: 54 },
  'Claude Sonnet 5 (max)':   { swe: 52, agentic: 54, reasoning: 51, general: 53 },  // now powers Claude Code
  // Closed reference — verified AA v4.1 (June 2026 baseline, kept for history)
  'Claude Fable 5 (max)':   { swe: 59, agentic: 60, reasoning: 59, general: 60 },  // #2 overall as of Aug 2026 update
  'Claude Opus 4.8 (max)':  { swe: 55, agentic: 57, reasoning: 56, general: 56 },  // top model as of June 2026 baseline
  'GPT-5.5 (xhigh)':        { swe: 55, agentic: 54, reasoning: 54, general: 55 },
  'Gemini 3.5 Flash (high)':{ swe: 54, agentic: 53, reasoning: 54, general: 55 },
  'Claude Opus 4.7 (max)':  { swe: 53, agentic: 55, reasoning: 54, general: 54 },
  'GPT-5.5 (high)':         { swe: 53, agentic: 53, reasoning: 52, general: 53 },
  'Grok 4.3 (high)':        { swe: 52, agentic: 53, reasoning: 53, general: 53 },  // superseded by Grok 4.5
  'Claude Sonnet 4.6 (max)':{ swe: 51, agentic: 53, reasoning: 50, general: 52 },  // superseded by Sonnet 5
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
    description: 'Systematic expert-level analysis across multiple disciplines. Current world ceiling, Claude Opus 5 scores 61 (as of Aug 2026; Claude Fable 5 close behind at 60, Opus 4.8 at 56).',
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

// Static fallback, source: artificialanalysis.ai — Artificial Analysis Intelligence Index v4.1, June 2026
// FACT-ONLY: every intelligenceIndex below is the model's verified current v4.1 score (cross-checked
//   by two independent passes). No v4.0 ghosts, no estimates. Proprietary/API-only models (Qwen "Plus"
//   and "Max") and models AA does not track were removed — this list is open-weight only.
// coding/math sub-scores are NOT published by AA as plain numbers; values here are derived/illustrative.
// Output speeds are API inference speeds; local Apple Silicon speeds are lower for large models.
// Ceiling is 60 (no model above it). Listed in true descending order of the v4.1 Intelligence Index.
export const STATIC_OPEN_SOURCE_MODELS: AAModel[] = [
  // ── New #1 open-weight by score (Jul 2026): Kimi K3 — but it does NOT fit our cluster. Listed
  //    for reference/tracking; GLM-5.2 below remains the practical #1 we can actually self-host. ──
  {
    name: 'Kimi K3',
    provider: 'Moonshot AI',
    intelligenceIndex: 57,  // AA Intelligence Index, Jul 2026 — new #1 open-weight, #7 overall (beats every closed model except Opus 5/Fable 5/GPT-5.6 Sol/Opus 4.8)
    codingScore: 56,        // illustrative: tops the Frontend Code Arena
    mathScore: 54,          // illustrative
    outputSpeed: 60,        // API t/s, est.
    contextWindow: 1000000, // 1M-token context, native multimodal (text/image/video in)
    isOpenSource: true,     // open-weight (attribution license w/ commercial thresholds), NOT fully open-source — no training data/code
    minRamGb: 594,          // 2.8T total / 104B active MoE. Even the most aggressive 1-bit GGUF needs ~594 GB combined RAM/VRAM
    requiresCluster: true,
    clusterNote: 'Does NOT fit the current 2-node cluster (244 GB usable) at any practical quant — the most aggressive 1-bit dynamic GGUF still needs ~594 GB combined RAM/VRAM, and a 2-bit build runs ~861 GB. Would need roughly 3x our current cluster capacity (a 5+ node setup or future high-RAM hardware). Listed for tracking, not self-hostable today — GLM-5.2 stays the practical #1 open-weight pick for regulated on-prem deployments.',
  },
  {
    name: 'GLM-5.2',
    provider: 'Z AI',
    intelligenceIndex: 51,  // AA Intelligence Index v4.1 — #1 open-weight (+11 over GLM-5.1)
    codingScore: 50,        // illustrative: SciCode 50, TerminalBench v2.1 78, GPQA Diamond 89
    mathScore: 49,          // illustrative: HLE 40, CritPt 21
    outputSpeed: 132,       // API t/s (AA). Local 2-node IQ1_S ~15 t/s. Very verbose (~43k tok/task).
    contextWindow: 1000000, // 1M-token context
    isOpenSource: true,
    minRamGb: 150,          // 744B total / 40B active MoE; IQ1_S (~150 GB) fits the 2-node window, IQ2_M ~222 GB
    requiresCluster: true,
    clusterNote: 'New #1 open-weight on the AA Intelligence Index v4.1 (51), +11 over GLM-5.1. On real coding and agentic work it BEATS GPT-5.5 — SWE-bench Pro 62.1 vs 58.6, FrontierSWE 74.4% vs 72.6%, MCP-Atlas 77.0 vs 75.3, GDPval-AA 1524 vs 1514 — and lands within a point of the top closed model, Opus 4.8, at roughly 1/6 the API cost. It trails only on Terminal-Bench 2.1 (81 vs 84) and the composite Index (where GPT-5.5 is 55), and has no image input yet. 744B total / 40B active MoE, MIT license, 1M context. IQ1_S (~150 GB) runs across the 244 GB 2-node cluster at ~15 t/s; IQ2_M (~222 GB) also fits. Verbose (~43k tokens/task). Self-hostable open weights — beats a cloud frontier model on real work, air-gapped and cheap.',
  },
  {
    name: 'MiniMax M3',
    provider: 'MiniMax',
    intelligenceIndex: 44,  // AA Intelligence Index v4.1 (was 55 on v4.0). Joint-2nd open-weight, tied with DeepSeek V4 Pro
    codingScore: 43,        // est. (AA does not publish sub-indices)
    mathScore: 42,          // est.
    outputSpeed: 92,        // API t/s (AA)
    contextWindow: 1000000, // 1M-token context via MiniMax Sparse Attention
    isOpenSource: true,
    minRamGb: 160,          // 428B total / 23B active MoE, Q2_K ~160 GB
    requiresCluster: true,
    clusterNote: 'First multimodal M-series (text + image + video in), 1M context. 428B total / 23B active MoE, Q2_K (~160 GB) fits inside the 244 GB 2-node window; needs both nodes. Joint-2nd open-weight Intelligence Index (44, AA v4.1, tied with DeepSeek V4 Pro) behind GLM-5.2 (51). Self-hostable open weights, which suits air-gapped deployment.',
  },
  // ── Frontier open-weight (1T+ MoE, need a cluster or future 512 GB hardware) ──
  // minRamGb = Q2_K/Q3 quantization minimum. The 1T+ ones do NOT fit the current 2-node 244 GB cluster.
  { name: 'DeepSeek V4 Pro',        provider: 'DeepSeek',    intelligenceIndex: 44, codingScore: 43, mathScore: 44, outputSpeed: 88,  contextWindow: 1000000, isOpenSource: true, minRamGb: 580 },  // v4.1 (was 52). 1.6T total / 49B active
  { name: 'Kimi K2.6',              provider: 'Moonshot AI', intelligenceIndex: 43, codingScore: 43, mathScore: 41, outputSpeed: 83,  contextWindow: 262144,  isOpenSource: true, minRamGb: 360 },  // v4.1 (was 54). 1T total / 32B active
  { name: 'MiMo-V2.5-Pro',          provider: 'Xiaomi',      intelligenceIndex: 42, codingScore: 40, mathScore: 43, outputSpeed: 49,  contextWindow: 1000000, isOpenSource: true, minRamGb: 360 },  // v4.1 (was 54). ~1T total / 42B active
  { name: 'GLM-5.1 Reasoning',      provider: 'Z AI',        intelligenceIndex: 40, codingScore: 38, mathScore: 41, outputSpeed: 74,  contextWindow: 200000,  isOpenSource: true, minRamGb: 150, requiresCluster: true, clusterNote: '744B total / 40B active MoE; IQ1_S (~150 GB) needs the 2-node cluster. Superseded by GLM-5.2.' }, // v4.1 (was 51)
  { name: 'GLM-5 Reasoning',        provider: 'Z AI',        intelligenceIndex: 40, codingScore: 38, mathScore: 40, outputSpeed: 68,  contextWindow: 200000,  isOpenSource: true, minRamGb: 150, requiresCluster: true, clusterNote: '744B total / 40B active MoE; IQ1_S (~150 GB) needs the 2-node cluster. Superseded by GLM-5.1 and GLM-5.2.' }, // v4.1 verified
  { name: 'DeepSeek V4 Flash',      provider: 'DeepSeek',    intelligenceIndex: 40, codingScore: 40, mathScore: 39, outputSpeed: 104, contextWindow: 1000000, isOpenSource: true, minRamGb: 135 },  // v4.1 (was 47). 284B total / 13B active, Q3 ~135 GB
  { name: 'MiniMax-M2.7',           provider: 'MiniMax',     intelligenceIndex: 38, codingScore: 37, mathScore: 38, outputSpeed: 43,  contextWindow: 205000,  isOpenSource: true, minRamGb: 110 },  // v4.1 (was 50). 230B total / 10B active, Q3 ~110 GB
  { name: 'Kimi K2.5',              provider: 'Moonshot AI', intelligenceIndex: 38, codingScore: 37, mathScore: 36, outputSpeed: 46,  contextWindow: 262144,  isOpenSource: true, minRamGb: 360 },  // v4.1 (AA-estimated label). 1T MoE like K2.6
  // ── Mid-tier ──────────────────────────────────────────────────────────────
  { name: 'Qwen3.6 27B',         provider: 'Alibaba',     intelligenceIndex: 37, codingScore: 35, mathScore: 36, outputSpeed: 57,  contextWindow: 262144,  isOpenSource: true, minRamGb: 17 },  // v4.1 verified (27.8B dense) — #1 open-weight in the small 4B–40B class
  { name: 'Qwen3.5 397B A17B',   provider: 'Alibaba',     intelligenceIndex: 34, codingScore: 33, mathScore: 34, outputSpeed: 50,  contextWindow: 262144,  isOpenSource: true, minRamGb: 150 },  // v4.1 (was 45). 397B total / 17B active, Q2_K ~150 GB
  { name: 'Qwen3.5 27B',         provider: 'Alibaba',     intelligenceIndex: 34, codingScore: 32, mathScore: 33, outputSpeed: 81,  contextWindow: 262144,  isOpenSource: true, minRamGb: 17 },  // v4.1 (was 42). 27.8B dense
  { name: 'Qwen3.6 35B A3B',     provider: 'Alibaba',     intelligenceIndex: 32, codingScore: 31, mathScore: 31, outputSpeed: 161, contextWindow: 262144,  isOpenSource: true, minRamGb: 23 },  // v4.1 verified. 36B total / 3B active
  { name: 'Mistral Medium 3.5',  provider: 'Mistral',     intelligenceIndex: 30, codingScore: 29, mathScore: 29, outputSpeed: 118, contextWindow: 131072,  isOpenSource: true, minRamGb: 79 },   // v4.1 (was 39). 128B dense, Q4_K_M ~79 GB
  { name: 'Gemma 4 31B',         provider: 'Google',      intelligenceIndex: 29, codingScore: 27, mathScore: 28, outputSpeed: 35,  contextWindow: 131072,  isOpenSource: true, minRamGb: 20 },  // v4.1 (was 39). 30.7B dense, Apache 2.0, multimodal
  { name: 'Qwen3.5 9B',          provider: 'Alibaba',      intelligenceIndex: 25, codingScore: 24, mathScore: 24, outputSpeed: 56,  contextWindow: 262144,  isOpenSource: true, minRamGb: 6 },   // v4.1 (was 32). 9.7B dense
  // ── TB5 RDMA cluster / large but older ───────────────────────────────────
  {
    name: 'DeepSeek-R1 671B',
    provider: 'DeepSeek',
    intelligenceIndex: 20,  // v4.1 verified (was 55 on v4.0 — older reasoning model, re-baselined hard)
    codingScore: 18,        // est.
    mathScore: 22,          // est. (R1 is reasoning/math-leaning)
    outputSpeed: 8,         // est. (slow across cluster)
    contextWindow: 131072,
    isOpenSource: true,
    minRamGb: 190,
    requiresCluster: true,
    clusterNote: 'Q2_K ~190 GB, fits in 244 GB usable across both nodes. The full 671B / 37B-active reasoning model, not a distilled version. Heavily superseded on the v4.1 leaderboard by GLM-5.2 and the V4 line — kept for reference.',
  },
  // ── Small / edge models (v4.1 is brutal on sub-15B models: agentic + HLE-weighted) ──
  { name: 'Mistral Small 4',     provider: 'Mistral',      intelligenceIndex: 21, codingScore: 20, mathScore: 20, outputSpeed: 173, contextWindow: 262144, isOpenSource: true, minRamGb: 55 },  // v4.1 (was 28). 119B total / 6.5B active MoE
  { name: 'Qwen3.5 4B',          provider: 'Alibaba',      intelligenceIndex: 20, codingScore: 19, mathScore: 19, outputSpeed: 182, contextWindow: 131072,  isOpenSource: true, minRamGb: 3 },   // v4.1 verified (Reasoning variant). 4.7B dense
  { name: 'Ling 2.6 Flash',      provider: 'InclusionAI',  intelligenceIndex: 19, codingScore: 18, mathScore: 18, outputSpeed: 183, contextWindow: 262144, isOpenSource: true, minRamGb: 49 },   // v4.1 (was 26). 107B total / 7.4B active MoE, Q3_K_M ~49 GB
  {
    name: 'Ling-1T',
    provider: 'InclusionAI',
    intelligenceIndex: 13,  // v4.1 verified (was 20)
    codingScore: 12,        // est.
    mathScore: 12,          // est.
    outputSpeed: 6,         // est. (large, slow across cluster)
    contextWindow: 128000,
    isOpenSource: true,
    minRamGb: 375,
    requiresCluster: true,
    clusterNote: 'Q3_K_M ~375 GB, beyond the current 2-node setup (244 GB). Needs 3-node cluster (~366 GB usable) or a future 512 GB Mac. At Q4: ~500 GB (4 nodes). 1T total / 50B active params, MIT license.',
  },
  { name: 'Gemma 4 E4B',         provider: 'Google',       intelligenceIndex: 12, codingScore: 11, mathScore: 11, outputSpeed: 290, contextWindow: 131072,  isOpenSource: true, minRamGb: 5 },   // v4.1 (AA-estimated). 8B total / 4.5B active, Apache 2.0, multimodal
  { name: 'Granite 4.0 H Small', provider: 'IBM',          intelligenceIndex: 5,  codingScore: 5,  mathScore: 4,  outputSpeed: 374, contextWindow: 128000, isOpenSource: true, minRamGb: 20 },  // v4.1 (was 11). 32B total / 9B active MoE, speed leader
  { name: 'Phi-4 14B',           provider: 'Microsoft',    intelligenceIndex: 5,  codingScore: 5,  mathScore: 6,  outputSpeed: 36,  contextWindow: 16384,   isOpenSource: true, minRamGb: 10 },  // v4.1 (AA-estimated; was 30). 14B dense
  { name: 'Llama 3.2 3B',        provider: 'Meta',         intelligenceIndex: 4,  codingScore: 3,  mathScore: 3,  outputSpeed: 52,  contextWindow: 131072,  isOpenSource: true, minRamGb: 2 },   // v4.1 (was 18). 3B dense
  { name: 'Phi-4-mini 3.8B',     provider: 'Microsoft',    intelligenceIndex: 3,  codingScore: 3,  mathScore: 4,  outputSpeed: 44,  contextWindow: 16384,   isOpenSource: true, minRamGb: 3 }    // v4.1 (was 22). 3.8B dense
];
