---
name: "MacBook Pro (M5 Max, 128 GB)"
priceUsd: 5199
ramGb: 128
chip: "Apple M5 Max"
tier: "workstation"
suitableModels:
  - "Kimi K2.6 Q4_K_M — #1 open-weight benchmark (54/100 on AA Intelligence Index)"
  - "Kimi K2.6 Q8 — full 8-bit precision, highest output quality (~18 t/s)"
  - "Llama 3.3 70B Q8 — full-precision Meta flagship"
  - "DeepSeek-R1 70B Q8 — full-precision reasoning with explicit CoT"
  - "Qwen3.5 122B A10B Q4_K_M — 122B MoE, fits in ~61 GB"
  - "MiMo-V2.5-Pro Q4_K_M — Xiaomi, ties #1 on benchmark"
  - "Three 70B models simultaneously (hot-loaded via Ollama)"
suitableFor:
  - "Full-speed 70B inference — ~16–22 t/s on M5 Max"
  - "Full-precision (Q8) 70B models — highest output quality"
  - "Running two 70B models simultaneously (hot-loaded)"
  - "Long-context tasks up to 262K tokens"
  - "Complex clinical, legal, and financial reasoning"
  - "TB5 RDMA clustering: 256 GB effective memory across two nodes"
  - "The Ground Floor lab configuration"
notSuitableFor:
  - "Entry-level price point — significant overkill for basic documentation"
  - "Large-scale serving of 10+ users without clustering"
---

The M5 Max at 128 GB is the current practical ceiling for single-machine local inference. This is the Ground Floor lab configuration: two MacBook Pro M5 Max 128 GB / 2 TB units at $5,199 each, plus AppleCare+ ($399 each) and Thunderbolt 5 cables for the RDMA cluster — connected for 256 GB effective unified memory across nodes.

## What changes at 128 GB in 2026

At 36–64 GB, you're choosing between a 70B model at Q4 or a 32B model with more headroom. At 128 GB, those tradeoffs disappear. Kimi K2.6 at Q4 loads in ~38 GB, leaving ~85 GB free — enough to simultaneously load a second 70B model.

More importantly: **Q8 quantization of 70B models becomes practical.** Q8 is full 8-bit precision — qualitatively better than Q4, with more accurate token probabilities and fewer hallucinations on complex clinical or legal text. Kimi K2.6 Q8 weighs ~72 GB and loads with room to spare.

## The models worth running at this tier

**Kimi K2.6** (Moonshot AI) is the current #1 open-weight model by the Artificial Analysis Intelligence Index — scoring 54/100 — within 6 points of GPT-5.5 (60/100, current world ceiling). It is specifically strong on coding and long-context structured reasoning. Running at ~18 t/s on M5 Max at Q8.

**MiMo-V2.5-Pro** (Xiaomi) ties Kimi K2.6 at 54/100 and has a 1M-token context window — the largest available in open-weight models as of May 2026. Strong on math and reasoning tasks.

**DeepSeek-R1 70B** is the reasoning model of choice when your task requires explainable chain-of-thought. For clinical documentation that needs to show its reasoning, or legal analysis where the logic chain matters, R1 shows its work in a way other models don't.

**Qwen3.5 122B A10B** (Alibaba) is the most efficient large model: 122B total parameters but only ~10B active per forward pass. It loads in ~61 GB at Q4 and performs at a level that previously required much larger dense models.

## Hot-loading strategy at 128 GB

Keep three models resident simultaneously:
- **Kimi K2.6 Q4** — primary drafting and analysis (best benchmark score)
- **DeepSeek-R1 70B Q4** — reasoning-intensive tasks (loads alongside Kimi at Q4)
- **Qwen3.5 27B Q8** — fast turnaround on simple structured tasks (~60 t/s)

Switch between them in memory with no reload latency. This is the pattern that makes 128 GB feel qualitatively different from 64 GB.

## TB5 RDMA clustering

Two M5 Max MacBook Pros connected over Thunderbolt 5 RDMA gives ~800 GB/s peak bandwidth at ~3 µs latency. At this bandwidth, you can distribute a single model across both machines for 256 GB effective unified memory — opening up FP16 (full precision) 70B models or the largest MoE models in the 200B+ range.

The Ground Floor lab runs this configuration for experiments requiring maximum quality and for testing multi-model pipelines.

## Open-source model licenses

All models listed here have publicly released weights under open licenses:
- Kimi K2.6 — Moonshot AI, open-weight release
- MiMo-V2.5-Pro — Xiaomi, open-weight release
- Llama 3.3 — Meta, Llama 3 Community License (commercial use permitted)
- DeepSeek-R1 — DeepSeek AI, MIT License
- Qwen3.5 — Alibaba, Qwen License (commercial-friendly)

No API keys. No telemetry. No vendor lock-in.
