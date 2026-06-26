---
name: "Solo CPAs & Small Accounting Firms"
shortName: "Accounting"
regulation:
  - "FTC Safeguards Rule (Gramm-Leach-Bliley)"
  - "IRS Publication 4557 (Safeguarding Taxpayer Data)"
  - "AICPA privacy guidelines"
  - "State CPA board regulations"
  - "SOC 2 Type II (if client-facing)"
whyLocal: "Tax returns, Social Security numbers, account balances, payroll records, accounting work involves some of the most sensitive financial data in existence. The FTC Safeguards Rule requires a written information security program covering how client data is transmitted and stored. Routing client financials through a third-party AI API without a formal vendor risk assessment creates compliance exposure that's hard to remediate retroactively. A local model eliminates the third-party data flow entirely."
commonUseCases:
  - "Tax memo and planning letter drafting"
  - "Engagement letter and scope-of-work drafting"
  - "Client meeting notes to CRM (post-review)"
  - "Quarterly and annual report narrative sections"
  - "Correspondence drafting from client notes"
  - "Financial statement footnote drafting"
  - "Suitability and disclosure document assistance"
maturityNote: "Accounting AI applications are defensible for administrative and documentation tasks, not for generating tax advice or professional opinions. Every AI-drafted output must be reviewed and owned by a licensed CPA before delivery to a client."
---

The FTC Safeguards Rule doesn't get the same attention as HIPAA, but for solo CPAs and small accounting firms, it's just as load-bearing. Since January 2023, the rule requires a written information security program that specifically addresses how client financial data is transmitted, stored, and processed, including by any third-party service providers.

That last part is the problem. When you use a cloud AI to help draft a tax memo, your client's adjusted gross income, Social Security number, and account details are now in the hands of a third-party processor. The vendor has their own security posture, their own breach notification timeline, and their own terms of service that you probably didn't run past your professional liability carrier.

A local model changes the analysis. If the data never leaves your machine, the third-party-processor question never gets asked, there's no vendor to risk-assess, because there's no vendor. Your written information security program only needs to describe your own environment, which you control.

## What experiments will cover here

My accounting experiments will focus on documentation-heavy workflows where the output is a first draft, not a final professional work product. Tax memo scaffolding, engagement letter drafting, and meeting-notes-to-CRM are the natural starting points: structured tasks, clear output formats, and the CPA is always the reviewer.

The secondary question, which hardware tier handles the volume of a 200-client solo practice during tax season, is where it gets interesting. An 8B model handles simple correspondence well. Tax memos for complex situations need more.

## Before you apply any of this

Your obligations under the Safeguards Rule depend on your firm size, your state's CPA board requirements, and whether your clients include entities subject to additional oversight. Nothing here constitutes compliance or legal advice.

If you're considering local AI tools in your practice, loop in your professional liability carrier and review the AICPA's guidance on technology and client confidentiality before deployment. See the [Scope & Disclaimers](/scope) page.
