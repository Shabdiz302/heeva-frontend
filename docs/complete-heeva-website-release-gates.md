# Heeva Complete Website — Release Gates (21 November 2026)

Status: DEVELOPMENT ONLY. Do not replace the existing PHP website until all release gates are verified on isolated staging and Heeva authorises cutover.

## Entire-site scope and required acceptance

| Area | Required capability | Status |
|---|---|---|
| Public website | Responsive home, courses, teachers, parents, organisations, about, FAQ, contact, legal policies | Preview built; full QA pending |
| Catalogue | School subjects, GCSE/A-level, music, languages, creative, AI, business and healthcare; accurate pricing and eligibility | Partial preview; real availability pending |
| Educator onboarding | Email verify, private profile completion, CV/photo/course proposals, submit, approve/reject/change requests | Draft backend changes; full acceptance pending |
| Public educator listings | Publish only human-approved, safeguarding-cleared snapshots; revision review and immediate unpublish | Not implemented |
| AI writing | Consent-based factual suggestions in English/Persian; approve/edit/discard, per-user limits | Not implemented |
| Photos and videos | Identity-preserving photo enhancement, authentic intro video, private processing, review before publication | Private portrait foundation only |
| Student/parent | Secure verified accounts and guardian-managed children | Foundation built; testing pending |
| Booking | Availability, timezone, scheduling, cancellations, reminders, no double booking | Not production complete |
| Free trial | Exactly one free introductory lesson enforced on server | Not yet verified end-to-end |
| Payments | UK payment processor, correct prices, VAT/refunds/webhook idempotency, reconciled payouts | Not implemented |
| Admin | Approvals, moderation, course/content management, support, reporting, audit | Partial |
| Business | B2B advisory/AI/healthcare services with functioning secure enquiries | Landing exists; backend outstanding |
| AI support | Protected bilingual chatbot with knowledge, usage caps, human handover | Worker prototype; full integration pending |
| Operations | Working email delivery, malware scanning, data retention, privacy, safeguarding, backups/restore, rollback | Outstanding |

## Non-negotiable rules

- Keep production PHP and all existing VPS services untouched until final signoff.
- Preserve existing technical teacher identifiers; user-facing terminology is Educator, or contextual Teacher/Tutor/Instructor.
- Only email-verified applicants can use a private onboarding dashboard before Heeva approval. They must not access customer, lesson, pricing or administrative data.
- Public profiles and media must be approved, versioned and explicitly publishable. No unreviewed update may replace an approved public snapshot.
- Safeguarding and appropriate background checks are mandatory before educators are made visible for child-facing work.
- Do not fabricate qualifications, credentials, image identity, teaching demonstrations, ratings or availability with AI.
- No browser OpenAI secrets, insecure document upload, unsupported payment claims or fake success screens.
- Exactly one free introductory lesson under Heeva's published eligibility rules.
- Complete automated tests, security review, end-to-end staging tests, mobile and bilingual review, then backup and rollback rehearsal before replacing the website.

## Next engineering milestones

1. Verify complete educator onboarding/approval permissions and snapshots.
2. Implement public approved directory and verified course association.
3. Finish booking, one-free-lesson enforcement, payments and administrator workflows.
4. Implement properly consented AI writing/photo/video services with costs and moderation.
5. Complete multilingual content, B2B enquiries, chatbot, accessibility and SEO audit.
6. Deploy isolated staging API and website, perform full acceptance and only then propose production switch.

Draft PR #6 is NOT a production release.
