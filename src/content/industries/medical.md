---
name: "Solo & Small Medical Practices"
shortName: "Medical"
regulation:
  - "HIPAA"
  - "HITECH Act"
  - "State medical privacy laws"
  - "21st Century Cures Act"
whyLocal: "Patient data — transcripts, notes, intake forms, voice memos — is some of the most heavily regulated information in the US. Every call to a cloud API is a potential BAA question, a new breach surface, and an audit trail on someone else's server. A model that processes data locally eliminates the third-party processor entirely. That doesn't automatically satisfy HIPAA, but it dramatically simplifies the compliance conversation."
commonUseCases:
  - "SOAP note drafting from voice memos"
  - "Intake form summarization"
  - "Patient education material generation (non-diagnostic)"
  - "Referral letter drafting"
  - "Administrative email drafting"
  - "Prior authorization letter assistance"
  - "Clinical documentation gap analysis"
maturityNote: "Medical use cases have the tightest accuracy requirements of any vertical. Experiments focus on tasks where a licensed clinician reviews and edits AI output — not tasks where the model acts autonomously or makes clinical judgments."
---

Running a local model doesn't make you HIPAA-compliant by itself. What it does is remove one of the more complicated variables from the equation: the third-party processor.

When patient data leaves your building to reach a cloud API, you take on new obligations — a BAA with the vendor, reliance on their security posture, their breach notification timeline. Large health systems have compliance teams for this. A solo physician doesn't.

The practices that benefit most are doing high-volume, structured tasks — drafting notes from voice, summarizing intake packets, generating template-based patient education materials. The model handles the formatting. The clinician handles the judgment.

## What experiments cover here

My medical experiments focus on tasks with high documentation volume, clear quality standards, and a human-in-the-loop review step. SOAP notes are the natural starting point: the format is well-defined, a bad first draft just gets edited, and the time savings compound quickly.

Future experiments will cover intake summarization, referral drafting, and the practical tradeoffs between model size and output quality for clinical text.

## What you need to know before reading these experiments

Every experiment on this site is a technical test, not a compliance recommendation. The results tell you whether local hardware can do the job at sufficient quality and speed. Whether any of these setups belongs in your specific practice — given your state, your specialty, your malpractice coverage, and your EHR system — is a question for your compliance team and legal counsel.

Read the [Scope & Disclaimers](/scope) page before making any decisions based on this content.
