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

## Development progress update — 21 November 2026

Changes committed on development branch, not on production:
- Responsive global Student/Parent / Educator login menu and Teach with Heeva CTA.
- Verified educators can complete private profiles and propose course offers before approval, without staff/customer access.
- Heeva approves profile then account with explicit safeguarding acknowledgement; approved public snapshot is published through isolated API; admin can unpublish. Private edits do not silently replace approved snapshots.
- Public directory and educator detail frontend can load approved snapshots when same-origin API is connected; legacy teacher listing remains available.
- Optional bilingual AI writing preview (factual wording, consent, accept/discard) behind backend-only OpenAI key/model and per-educator monthly usage cap. NOT yet configured or usable from public preview.
- Nine UK primary, 11+, KS3, GCSE and A-level subjects added as coming-soon to frontend and API catalogues. No bookings for courses without confirmed teachers/pricing.
- Business enquiry: authenticated Formspree endpoint can be configured, otherwise opens an email draft and never claims delivery.
- Student trial backend already uses a unique primary key per learner and responds 409 for repeat requests. Further commercial eligibility/abuse checks and practical booking workflow pending.
- GitHub CI and Cloudflare preview provide build verification, NOT full cross-browser and real-user acceptance.
- Teacher media enhancement and video, live payment, booking integration, educator payouts, bilingual sitewide translation, B2B secure backend integration, pricing/legal/safeguarding and production cutover remain BLOCKED / NOT COMPLETE.

Never describe this draft PR as a complete launchable website. The live site has not been replaced.
