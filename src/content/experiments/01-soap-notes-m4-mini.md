---
title: "Can an $800 Mac Mini draft SOAP notes for a solo medical practice?"
date: 2026-05-04
week: 1
industry: "medical"
hardware: "m4-mini"
task: "document-drafting"
model: "Llama-3.1-8B-Instruct-Q4_K_M"
verdict: "viable"
hypothesis: "An 8B quantized model on a base M4 Mac mini can draft SOAP notes from voice memos at sufficient quality for a clinician to edit rather than write from scratch."
description: "A base M4 Mac mini running a quantized Llama 3.1 8B model can draft structured SOAP notes from rough voice transcripts at a speed and quality that makes editing faster than writing from scratch — for most visit types."
---

## Background

The average primary care physician spends roughly two hours per day on documentation — much of it transcribing their own thoughts into the structured formats that EHRs demand. The work isn't cognitively hard; it's just friction.

The obvious solution until recently was to pipe voice recordings to a cloud API. The obvious problem: those recordings contain protected health information. Even with a Business Associate Agreement in place, you've now created a dependency on an external processor, a new breach surface, and a conversation with your malpractice carrier about AI-assisted documentation.

This experiment tests whether that tradeoff is necessary.

## Setup

**Hardware:** M4 Mac mini (base model) — 16GB unified memory, 10-core GPU, 512GB SSD. $799 at the Apple Store.

**Model:** `Llama-3.1-8B-Instruct-Q4_K_M` via [Ollama](https://ollama.com). Download size: ~4.7GB. Loaded entirely into unified memory with headroom to spare.

**Interface:** Ollama running as a local service on port 11434. Prompt sent via a simple shell script. No network calls after initial model download.

**Input source:** Three voice memo transcripts from a collaborating clinician — de-identified before I received them. Transcription handled separately by Apple's on-device Whisper implementation (also local, also no cloud call).

**Prompt template:**
```
You are a clinical documentation assistant. Given a rough transcript of a patient encounter, 
produce a structured SOAP note. Use standard medical terminology. Flag anything unclear rather 
than guessing. Do not infer diagnoses not stated in the transcript.

Transcript:
{transcript}
```

## Results

I ran each of three transcripts five times, varying temperature (0.1 and 0.3). Outputs were reviewed by the collaborating clinician on a 1–5 scale for edit burden, where 1 = "would publish as-is" and 5 = "easier to write from scratch."

| Visit type | Avg. score | Notes |
|---|---|---|
| Follow-up, chronic condition | 2.1 | Strong. Captured medication adjustments accurately. |
| New patient, complex history | 3.4 | Reasonable structure but required significant Assessment rewriting. |
| Acute, straightforward | 1.8 | Essentially publish-ready with minor formatting edits. |

**Generation speed:** 22–28 tokens/second on M4 Mac mini. A typical SOAP note (400–600 tokens) generated in 15–25 seconds. Fast enough for use between patients.

**Memory footprint:** Model loaded into ~5.5GB of the 16GB unified memory. The Mac remained responsive with Safari and Finder open. No fan noise under sustained use.

## What worked well

The model was surprisingly disciplined about not hallucinating clinical details. When the transcript was ambiguous, it consistently used phrases like "per patient report" and "as documented" rather than inventing specifics. This is important: the failure mode in clinical documentation isn't bad prose, it's false precision.

For straightforward and follow-up visits — which represent the majority of a solo practice's volume — the output quality was good enough that the clinician's job became editing, not authoring.

## Where it struggled

The Assessment section was the weakest link. For complex patients, the model sometimes produced overly generic assessment language that a physician would need to rewrite substantially. This correlates with visit complexity: the more reasoning the transcript requires, the more the 8B model's limitations show.

It also occasionally produced inconsistent formatting when the transcript was long or fragmented — paragraph breaks in the wrong places, or an Objective section that bled into Subjective.

## Replication notes

To run this yourself:

1. Install [Ollama](https://ollama.com): `brew install ollama`
2. Pull the model: `ollama pull llama3.1:8b-instruct-q4_K_M`
3. Transcribe your voice memo locally — I used the macOS Shortcuts app with the "Transcribe Audio" action, which routes to on-device Whisper
4. Pipe the transcript to Ollama: `ollama run llama3.1:8b-instruct-q4_K_M "$(cat prompt.txt)"`

The model download (~4.7GB) happens once. After that, it runs fully offline.

## Honest caveats

This was a small, informal test — three transcripts, one reviewer. It is not a clinical study. Results will vary based on transcript quality, visit type, and the specific needs of your documentation workflow.

More importantly: **the technical viability of this setup is a separate question from its compliance status in your practice.** Whether using a local LLM for documentation assistance satisfies your state's regulations, your malpractice carrier's requirements, or your EHR vendor's terms is a question for your attorney and compliance team, not for this experiment.

What this experiment answers: can the hardware do the job? Yes. Whether it should be part of your workflow is a question with more parties at the table.

## Verdict: Viable

For routine and follow-up visit documentation in a solo practice, a base M4 Mac mini running a quantized 8B model is a credible first draft machine. The edit-not-write dynamic holds for the majority of visit types.

The case weakens for complex new patient encounters. A larger model (13B or 70B with a Mac Pro) would likely close that gap. That's a future experiment.
