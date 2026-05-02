---
name: "MacBook Pro (M5 Max, 128 GB)"
priceUsd: 5199
ramGb: 128
chip: "Apple M5 Max"
tier: "workstation"
suitableModels:
  - "Qwen3.5 72B (Q4_K_M) — Alibaba MoE, beats GPT-5-mini on most benchmarks"
  - "Llama 3.3 70B (Q8) — full-precision 70B, highest open-weight quality"
  - "DeepSeek-R1 70B (Q4_K_M) — best open-source reasoning model"
  - "Gemma 4 27B (Q8) — Google MoE, 85 t/s, frontier performance"
  - "Qwen3.6 MoE (Q4_K_M) — 122B parameters, runs in ~60 GB"
  - "Kimi K2.6 70B (Q4_K_M) — top open-source coding + reasoning"
  - "Mistral Small 3 22B (Q8) + Qwen3 14B (Q8) simultaneously"
suitableFor:
  - "Full-speed 70B inference — ~18–22 t/s on M5 Max"
  - "Full-precision (Q8) 70B models — highest output quality"
  - "Running two 30B+ models simultaneously (hot-loaded)"
  - "Long-context tasks up to 200K tokens"
  - "Complex clinical, legal, and financial reasoning"
  - "TB5 RDMA clustering: 256 GB effective memory across two nodes"
  - "The Ground Floor lab configuration"
notSuitableFor:
  - "Entry-level price point — significant overkill for basic documentation"
  - "Large-scale serving of 10+ users without clustering"
---

The M5 Max at 128 GB is the current practical ceiling for single-machine local inference. This is the Ground Floor lab configuration: two MacBook Pro M5 Max 128 GB / 2 TB units at $5,199 each, plus AppleCare+ ($399 each) and Thunderbolt 5 cables for the RDMA cluster — connected for 256 GB effective unified memory across nodes.

## What changes at 128 GB in 2026

At 36–64 GB, you're choosing between a 70B model at Q4 or a 32B model with more headroom. At 128 GB, those tradeoffs disappear. A Q4 Llama 3.3 70B loads in ~38 GB, leaving ~85 GB free — enough to simultaneously load a second 32B model.

More importantly: **Q8 quantization of 70B models becomes practical.** Q8 is full 8-bit precision — qualitatively better than Q4, with more accurate token probabilities and fewer hallucinations on complex clinical or legal text. Q8 Llama 3.3 70B weighs ~71 GB and loads with buffer to spare.

## The models worth running at this tier

**Qwen3.5 72B** (Alibaba, Qwen License) is the current benchmark leader among open-weight models — it outperforms GPT-5-mini on most structured benchmarks as of May 2026, running at ~18 t/s on M5 Max at Q4.

**DeepSeek-R1 70B** is the reasoning model of choice when your task requires explainable chain-of-thought. For clinical documentation that needs to show its reasoning, or legal analysis where the logic chain matters, R1 shows its work in a way other models don't.

**Gemma 4 27B** (Google, Gemma License) is a Mixture-of-Experts architecture that hits ~85 t/s on M5 Max — fast enough for near-real-time use cases — while producing output quality that competes with models twice its size.

**Qwen3.6 MoE** (Alibaba) is the most interesting new entry: 122B total parameters but only ~28B active per forward pass. It loads in ~60 GB at Q4 and performs at a level that previously required much larger dense models.

## Hot-loading strategy at 128 GB

Keep three models resident simultaneously:
- **Qwen3.5 72B** — primary drafting and analysis
- **DeepSeek-R1 70B** — reasoning-intensive tasks (loads alongside the 72B at Q4)
- **Gemma 4 27B** — fast turnaround on simple structured tasks

Switch between them in memory with no reload latency. This is the pattern that makes 128 GB feel qualitatively different from 64 GB.

## TB5 RDMA clustering

Two M5 Max MacBook Pros connected over Thunderbolt 5 RDMA gives ~800 GB/s peak bandwidth at ~3 µs latency. At this bandwidth, you can distribute a single model across both machines for 256 GB effective unified memory — opening up FP16 (full precision) 70B models or Q4-quantized models in the 100–200B range.

The Ground Floor lab runs this configuration for experiments requiring maximum quality and for testing multi-model pipelines.

## Open-source model licenses

All models listed here have publicly released weights under open licenses:
- Llama 3.3 — Meta, Llama 3 Community License (commercial use permitted)
- Qwen3.5 / Qwen3.6 — Alibaba, Qwen License (commercial-friendly)
- DeepSeek-R1 — DeepSeek AI, MIT License
- Gemma 4 — Google, Gemma Terms of Use
- Kimi K2.6 — Moonshot AI, open-weight release

No API keys. No telemetry. No vendor lock-in.
