---
title: "Can a local model turn client meeting voice memos into CRM-ready notes for an RIA?"
date: 2026-05-16
week: 3
industry: "financial"
hardware: "m4-mini"
task: "document-drafting"
model: "Llama-3.1-8B-Instruct-Q4_K_M"
verdict: "viable"
hypothesis: "A local 8B model can convert rough voice memo transcripts from client financial meetings into structured CRM notes — capturing action items, discussed topics, and follow-up commitments — at sufficient quality to eliminate the advisor's transcription burden."
description: "A base Mac mini running a local 8B model converted 12 de-identified client meeting transcripts into structured CRM notes. The model captured action items and follow-ups accurately and produced clean structured output — making it a strong fit for the RIA's most time-consuming administrative task."
---

## Background

Independent financial advisors spend a disproportionate share of their administrative time on meeting documentation. After a 45-minute client review meeting, the advisor needs to: update the CRM with topics discussed, log action items, draft follow-up tasks, and sometimes write a brief client-facing summary. That documentation burden often adds 20–30 minutes per meeting.

For an RIA with 80–120 client households, this compounds into hours per week of non-billable administrative work. It's also the task with the most sensitive data: account numbers, Social Security numbers, beneficiary information, health situations affecting financial planning.

The local model test here is not about accuracy of financial advice — the advisor provides that. It's about whether the model can eliminate the transcription-to-structure step.

## Setup

**Hardware:** M4 Mac mini (base) — 16 GB unified memory. $599.

**Model:** `Llama-3.1-8B-Instruct-Q4_K_M` via Ollama. Identical to the Week 1 medical experiment.

**Transcripts:** 12 de-identified client meeting transcripts from an RIA, provided with all identifying information removed. Meeting types: annual reviews (4), mid-year check-ins (3), new client onboarding (2), estate planning discussions (2), ad-hoc planning calls (1).

**Target output:** Structured CRM note with sections: Meeting Type, Key Topics Discussed, Decisions Made, Client Action Items, Advisor Action Items, Follow-Up Date, Compliance Notes (regulatory topics mentioned).

**Evaluation:** The RIA reviewed each output on a 1–5 scale for completeness and accuracy, where 1 = "post as-is" and 5 = "write from scratch."

## Results

| Meeting type | Avg. score | Notes |
|---|---|---|
| Annual review | 1.9 | Excellent. Captured all agenda items and action items. |
| Mid-year check-in | 2.1 | Strong. Minor formatting cleanup needed. |
| New client onboarding | 2.7 | Good on topics, occasional gaps in follow-up items. |
| Estate planning | 3.1 | More variable — sensitive to complexity of discussion. |
| Ad-hoc planning call | 1.7 | Best performance. Short structured meetings translate well. |

**Overall average: 2.3** — the RIA's job is editing, not authoring, for 10 of 12 transcripts.

**Speed:** 22–28 t/s on the 8B model. A 500-word transcript produces a 400-600 token CRM note in 15–25 seconds.

**Compliance Notes field:** The model reliably flagged transcripts where fiduciary discussions, suitability conversations, or product recommendations appeared — useful for the RIA's compliance file.

## What worked well

The model's performance on structured meeting types (annual reviews, mid-year check-ins) was strong. These meetings follow a predictable format and the model learned to mirror that structure cleanly. The advisor noted that action item capture was "better than my own notes" for routine meetings.

The compliance flagging behavior was a positive surprise. Without explicit prompting, the model identified discussions that an RIA's compliance program should document — referencing suitability language and flagging product conversations.

## Where it struggled

Estate planning discussions were the weakest category. These meetings involve complex, emotionally sensitive conversations that don't follow a predictable structure, and the 8B model occasionally missed nuanced follow-up items or misattributed which party (advisor vs. client) was responsible for an action item.

Long, discursive meetings (the 90-minute onboarding calls) also showed more gaps. The model's effective context window handled them fine, but the output required more editing to capture everything discussed.

## Privacy note

This is the experiment where the local architecture matters most. These transcripts contain exactly the information that Regulation S-P and GLBA protect — Social Security numbers, account values, health situations affecting financial planning. Running the transcription and summarization locally means none of this ever reaches a third-party server.

For an RIA, that's not a nice-to-have. It's the only compliant architecture for this task without a formal vendor due diligence process and updated privacy procedures.

## Verdict: Viable

For routine client meeting documentation — annual reviews, check-ins, planning calls — a base Mac mini running an 8B local model is a credible CRM note generator. The advisor's time on post-meeting documentation drops from 20–30 minutes to 5–10 minutes of editing.

Estate planning and complex onboarding meetings need more editing, but still save time. A 13B or 70B model would likely close that gap. Base model, base hardware: the threshold is cleared for the majority of an RIA's weekly documentation volume.
