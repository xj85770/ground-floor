---
title: "Can a local 13B model flag risky clauses in a vendor contract for a solo attorney?"
date: 2026-05-09
week: 2
industry: "legal"
hardware: "m4-pro"
task: "document-review"
model: "Llama-3.1-13B-Instruct-Q4_K_M"
verdict: "partial"
hypothesis: "A quantized 13B model running locally can identify non-standard or potentially unfavorable clauses in a standard commercial contract at a rate that reduces, but does not eliminate, the attorney's review burden."
description: "A local Llama 3.1 13B model reviewed five commercial vendor contracts and flagged clauses for attorney attention. It caught most obvious red flags but missed nuanced jurisdiction-specific risks — making it useful as a first-pass triage tool, not a replacement for legal review."
---

## Background

Contract review is one of the highest-volume, lowest-leverage tasks in a solo attorney's week. A standard vendor services agreement might have 30–40 clauses; a careful first read to flag issues takes 45–90 minutes. The attorney's judgment is needed for the flagged items — not usually for the first pass.

The question here is narrow: can a local model reliably identify clauses that warrant attorney attention, well enough that the attorney can start at the flagged items rather than reading front-to-back?

This experiment does not test whether the model gives good legal advice. It tests whether it's a useful triage filter.

## Setup

**Hardware:** M4 Pro Mac mini — 24 GB unified memory, 12-core CPU/GPU. $1,399.

**Model:** `Llama-3.1-13B-Instruct-Q4_K_M` via Ollama. ~8.1 GB loaded into unified memory.

**Documents:** Five de-identified vendor service agreements (SaaS, professional services, facilities management, IT support, data processing). Lengths: 8–22 pages. All standard commercial contracts from common templates.

**Prompt approach:** Two-stage. First pass: extract all clauses with non-standard terms into a structured list. Second pass: for each extracted clause, assess the risk category (liability, IP, data, termination, payment) and flag severity (note / review / flag).

**Evaluation:** A licensed commercial attorney reviewed the model's output against their own independent reading of each contract. Scoring: precision (flagged items that were actually worth attorney attention) and recall (risky items caught vs. total risky items present).

## Results

| Contract type | Precision | Recall | Notes |
|---|---|---|---|
| SaaS subscription | 88% | 76% | Missed one data portability clause |
| Professional services | 79% | 82% | False positive on standard indemnification |
| Facilities management | 85% | 71% | Missed two state-specific compliance clauses |
| IT support | 91% | 85% | Strong performance on liability caps |
| Data processing (DPA) | 83% | 68% | Struggled with GDPR Article 28 nuance |

**Average across all five:** Precision 85%, Recall 76%.

**Generation speed:** 11–16 tokens/second on the 13B model. A 15-page contract took approximately 90 seconds to process through both stages.

## What worked well

The model was consistently good at catching obvious risk signals: unilateral amendment clauses, uncapped liability language, auto-renewal terms with short notice windows, one-sided IP assignment, and missing limitation-of-liability provisions. These are the items a first-year associate would flag on a standard review checklist.

The structured output was clean and actionable. The attorney's feedback was that the flagged items were well-organized and the severity ratings were roughly calibrated.

## Where it struggled

**Jurisdiction-specific provisions.** Several state-specific requirements (California-specific data privacy clauses, Texas venue requirements) were either missed or flagged with generic language that didn't reflect the specific risk. This is the 13B model's core limitation: it lacks depth on jurisdiction-specific legal nuance.

**Nuanced DPA analysis.** The data processing agreement produced the weakest results. GDPR Article 28 requirements are specific and the model's flagging was superficial — it noted "data processing terms present" rather than identifying specific gaps in the processor obligations.

**False negatives in complex clauses.** Multi-clause interdependencies (where Clause 12.3 modifies the liability cap in Clause 8.1, for example) were occasionally missed. The model reads sequentially and doesn't always build the cross-reference model a human attorney does.

## Replication notes

```
ollama pull llama3.1:13b-instruct-q4_K_M

# Stage 1 — clause extraction
ollama run llama3.1:13b-instruct-q4_K_M "$(cat stage1-prompt.txt)"

# Stage 2 — risk assessment  
ollama run llama3.1:13b-instruct-q4_K_M "$(cat stage2-prompt.txt)"
```

The prompt templates are available in the experiment repository. Temperature 0.1 for both stages.

## Honest caveats

76% recall means the model misses roughly 1 in 4 risky clauses. For a triage tool — where the attorney still reads the flagged items carefully — that's a meaningful reduction in first-pass work. For autonomous review, it's not close to good enough.

A 70B model would likely improve recall significantly, particularly on jurisdiction-specific and cross-reference issues. That's a future experiment.

**This experiment answers:** can a 13B local model reduce contract review time? Yes, meaningfully. Can it replace attorney review? No, not at this tier.

## Verdict: Partial

Viable as a triage first pass for standard commercial contracts in straightforward jurisdictions. The time savings on first-pass review are real — the attorney starts with a prioritized list rather than a blank page.

Not viable as a substitute for careful attorney review, particularly for DPAs, jurisdiction-specific documents, or contracts with complex cross-references. A 70B model closes some of these gaps; that experiment is next.
