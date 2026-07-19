---
title: "Can a local model reduce SOAP-note drafting time without inventing clinical facts?"
date: 2026-07-18
week: 1
industry: "medical"
hardware: "16–24 GB Mac"
task: "document-drafting"
model: "8B–14B open-weight model, selected at run time"
verdict: "not-yet"
evidenceStatus: "protocol"
hypothesis: "A clinician-reviewed local model may reduce drafting time on structured notes without adding unacceptable factual errors."
description: "A reproducible protocol for measuring edit burden, omissions, and invented clinical detail. No completed clinical result is claimed."
---

## Current status

This is a protocol, not a completed clinical study. Ground Floor does not currently have the retained raw fixtures, outputs, timing logs, or clinician evaluation needed to publish a result.

## What the test asks

Can a local model turn approved, properly sanitized encounter material into a structured first draft that takes less time to review than writing from scratch?

## Required test record

- At least 20 synthetic, public, or properly sanitized fixtures representing routine and complex encounters.
- Exact Mac, memory, operating system, runtime, model artifact, quantization, context settings, and prompt.
- Every raw output, including failures and inconvenient examples.
- Clinician scoring for unsupported facts, omissions, negations, attribution, structure, and edit time.
- Repeated timing with the measurement method and variance stated.

## Pass conditions

The thresholds must be fixed before the run. A result cannot be called useful merely because some examples look good. Unsupported clinical facts are a critical failure and every final note remains clinician-owned.

## Out of scope

Diagnosis, treatment selection, autonomous charting, clinical decision-making, and any claim that a local runtime creates HIPAA compliance.

## Help run it

If you are a qualified clinician who can help define a safe fixture and review rubric, [tell Ground Floor about the task](/pilot). Do not submit patient information.
