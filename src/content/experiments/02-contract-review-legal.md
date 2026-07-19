---
title: "Can a local model make first-pass contract review faster without hiding the misses?"
date: 2026-07-18
week: 2
industry: "legal"
hardware: "24–64 GB Mac"
task: "document-review"
model: "14B–32B open-weight model, selected at run time"
verdict: "not-yet"
evidenceStatus: "protocol"
hypothesis: "A local model may organize contract issues for attorney review, but usefulness depends on measured recall, cross-reference handling, and jurisdictional failure rates."
description: "A contract-triage protocol with explicit precision, recall, cross-reference, and jurisdictional failure tests."
---

## Current status and correction

This is a protocol, not a completed legal study. An earlier draft named “Llama 3.1 13B,” a model size Meta did not release. That claim and the associated outcome are withdrawn.

## What the test asks

Can a local model produce an issue list that helps a licensed attorney review a bounded contract faster without creating false confidence about what was missed?

## Required test record

- Public, synthetic, or properly sanitized agreements with attorney-authored issue keys.
- Exact hardware, runtime, model artifact, quantization, context, chunking, and prompts.
- Every raw issue list, including false positives and false negatives.
- Attorney scoring for precision, recall, defined-term errors, cross-references, unsupported law, and jurisdictional assumptions.
- Review-time measurements with and without the tool.

## Pass conditions

Thresholds for recall, critical misses, false positives, and attorney time must be set before running the test. Triage never replaces complete attorney review.

## Out of scope

Legal advice, autonomous contract approval, jurisdiction-specific conclusions without attorney verification, and privilege or compliance determinations.

## Help run it

If you are a licensed attorney with a repeatable review workflow, [tell Ground Floor about the task](/pilot). Do not submit client material.
