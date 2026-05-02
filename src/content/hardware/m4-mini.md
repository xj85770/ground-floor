---
name: "Mac mini (M4, 16 GB)"
priceUsd: 599
ramGb: 16
chip: "Apple M4"
tier: "entry"
suitableModels:
  - "Qwen3 7B (Q4_K_M) — best overall under 8B, 76 HumanEval"
  - "Gemma 3 4B (Q8) — fast, structured tasks, Google open-weight"
  - "Phi-4-mini 3.8B (Q8) — Microsoft, exceptional reasoning per watt"
  - "Llama 3.2 3B (Q8) — Meta, lightweight, great for simple drafts"
  - "Mistral 7B v0.3 (Q4_K_M) — reliable general-purpose workhorse"
  - "DeepSeek-R1 7B (Q4_K_M) — strong chain-of-thought reasoning"
suitableFor:
  - "Solo practitioner documentation workflows (SOAP notes, CRM entries, letters)"
  - "High-speed drafting of structured documents from voice transcripts"
  - "Single-user always-on inference — silent, under 30W"
  - "Proving out a workflow before investing in more hardware"
notSuitableFor:
  - "Complex multi-step legal or financial reasoning"
  - "Long-context tasks over 32K tokens"
  - "Multi-user serving"
  - "13B or larger models"
---

The $599 Mac mini is the entry point for serious local LLM use in a regulated practice. At 16 GB unified memory it runs Q4-quantized 7–8B models with room for the OS and other apps — no dedicated GPU, no fan noise, no cloud dependency.

## What 16 GB gets you in May 2026

The open-source model landscape has compressed dramatically. **Qwen3 7B** (Alibaba, May 2026) posts a 76.0 HumanEval score — higher than models twice its size from 18 months ago. **Phi-4-mini** from Microsoft is 3.8B and punches well above its weight on structured reasoning. On the M4's 120 GB/s memory bandwidth these models hit 30–45 tokens/second — faster than you read.

For documentation workflows in regulated practices, the gap between an 8B and a 70B model is much smaller than it was in 2024. A solo physician drafting SOAP notes or an RIA logging meeting summaries will find this tier handles the job.

## Hot-loading multiple models

With 16 GB you can keep one 7B model loaded and swap to another in under 10 seconds. A useful pattern: **Qwen3 7B** for general drafting, **DeepSeek-R1 7B** when you need explicit chain-of-thought reasoning (it shows its work), **Phi-4-mini** when you want the fastest turnaround on simple templates. Hot-loading via Ollama is instant after the first pull — the model stays on disk and loads into unified memory on demand.

## Why open-source matters here

Every model listed here has publicly available weights. You can inspect the architecture, verify no telemetry, and run it fully air-gapped. No model vendor agreement, no usage terms that restrict health or legal data, no dependency on a company's continued operation. The weights you download today run the same way in five years.

## The honest ceiling

At 16 GB you cannot run 70B models, Q8-quantized 13B models, or anything requiring more than ~12 GB of weights. For complex tasks — detailed legal analysis, multi-document reasoning, long clinical narratives — the M4 Pro is the next step.

## Cost reality

At $0.01 per typical document interaction with cloud APIs, you won't recoup this hardware on token savings. The argument is the data: patient transcripts, client portfolios, legal documents processed entirely on hardware you own, with no third-party processor in the chain.
