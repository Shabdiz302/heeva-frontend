# Heeva Educator Studio — onboarding and AI media release contract

Status: **design specification only**. These features are NOT live or available in the Cloudflare preview yet. Implement exclusively on the draft Marketplace branch and isolated VPS database/API, never on production before release review.

## Target lifecycle
1. Adult educator registers; email verification required.
2. Verified but unapproved educator can sign in **only** to a private onboarding workspace. No student, lesson, payment, admin or public data access.
3. Educator completes factual profile, submits courses and pricing proposals, attaches portrait and optional private evidence, then explicitly submits for review.
4. Heeva reviews identity, eligibility, appropriate safeguarding for work with children, qualifications, proposed courses, pricing, biography and media.
5. Approval enables a **reviewed public snapshot**, not publication of unreviewed drafts. Approved profile goes live automatically only when identity/safeguarding/publication requirements are satisfied and the public API is operational.
6. Later profile edits create a new private revision. Existing reviewed public snapshot remains unchanged until Heeva accepts the revision. Heeva can unpublish immediately.
7. Course offers are approved separately; no instructor may advertise an unapproved course or price.

## AI Writing Assistant (initial release)
- Edit *headline*, *bio*, *teaching method*, *course description*. EN/FA.
- Educator provides their own factual notes. Show suggestions in a compare/review panel with **Accept**, **Edit**, **Discard**. Never silently overwrite, save, submit or publish.
- Do not invent degrees, credentials, affiliations, years of experience, DBS clearance, prices, testimonials, student outcomes, or endorsements.
- API access only behind authenticated isolated Marketplace server. No browser-held provider key. Opt-in consent; minimize payloads and do not send CVs, private documents, children or student data to models.
- Rate limit per account, cap output and spending, log metadata without private notes, return actionable errors when unavailable.

## AI Portrait Studio (separate image processing release)
- Upload original photo privately, scan/type-check and size-limit it. Create nondestructive variants.
- Allow crop, subject centring, exposure, subtle colour correction and unobtrusive background cleanup or neutral replacement; offer a professional square headshot.
- Do not change facial identity, age, ethnicity, hair/eyes substantially, body proportions, or represent a fabricated photograph as a real unedited portrait.
- Show **Before/After**, **Use this version**, **Keep original**. Human chooses; Heeva checks and approves public version. Keep private original with retention/deletion controls.
- Never put an educator's uploaded photo into a publicly accessible generative URL or prompt without explicit consent.
- Candidate implementation: private uploads + processor via secure API, Cloudflare Images bindings for deterministic transformations; evaluate a consented image-edit model separately for background changes. Check pricing and data processing before selection.

## Video Intro Studio (later release)
- Educator records/uploads their **real** 30–60 second introduction; optional script coach, subtitles, transcription/translation, trim, audio normalization, compression, title-card and captions.
- No synthetic likeness/voice, face-swap, fabricated teaching demonstrations or false testimonial. AI-avatar content, if ever permitted, requires conspicuous disclosure and educator consent.
- Private upload, malware/content validation, transcode, moderation and Heeva human approval before publication.
- Consider Cloudflare Stream for private upload/transcoding and a moderation/review workflow; verify actual cost and capabilities.
- Draft remains private; public access only to approved version. Original revisions never silently replace approved public media.

## Safety and release gates
- Protect child-facing directory: enhanced Heeva verification/safeguarding review before a profile can advertise child lessons.
- Restrict file access using server authorization and storage isolation. Signed URLs must be short-lived and scoped; do not expose private CVs or application data in public API.
- Explicit public/private state and versioned snapshot; audit approval and unpublish.
- Strict MIME/file-signature/size validation; malware scanning fail closed for private document uploads.
- Integration tests: rejected/unverified users cannot log in; verified unapproved users cannot reach staff/student resources; drafts unpublished; approved snapshot public; edits pending remain private; unpublish immediate; AI suggestions never auto-save/publish; billing caps enforced.
- Staging Basic Auth/noindex remains active; never deploy or merge into live Heeva site until manual review.

## Current implementation gap
The existing code currently approves educator login before allowing profile completion, and the public teacher directory is static. Both must change in a deliberately reviewed backend/API migration. Do not present design as already implemented.
