# Heeva Teacher Marketplace — product design and implementation contract
Status: planned; NOT implemented or available on staging or production.
Updated: 2026-11-20
Related: docs/heeva-online-operations-platform-requirements.md

## Business model
Heeva is a multi-tutor education marketplace with both third-party tutor courses and its own courses. A tutor proposes and maintains subject offerings and a tutor price; Heeva approves the instructor, course quality, lesson offer, and customer-facing retail price. Heeva receives the difference/commission according to a versioned agreement. Exactly one free introductory lesson per eligible learner as defined by existing policy, enforced by backend.

**Important commercial choice:** do not confuse a *markup on tutor net price* with a *margin on customer selling price*.
- tutor net price T, marketplace markup rate r: customer price = T × (1 + r); margin as % of selling price = r/(1+r).
- tutor net price T, target gross margin m: customer price = T/(1-m); markup as % of net = m/(1-m).
- Example for illustration only: tutor rate £20, 25% markup -> £25 charged, Heeva gross difference £5 (20% selling-price margin). For a 25% selling-price margin -> £26.67 charged, gross difference £6.67.
- This gross difference is BEFORE tax where applicable, gateway fees, discounts, refunds, bad debt or other costs; call it gross spread/commission, not profit. Define who is merchant of record, tax invoice issuer, refund payer and contracted service provider with accountant/legal review. The exact provider, payout design, and tax treatment are unresolved.
- Store tutor rate and customer retail price independently; never calculate historical earnings using a newly edited rate. Version effective dates and display currency, lesson duration and what rate includes.
- Platform may allow percentage commission, fixed platform fee, or admin override per teacher/course, with a floor/ceiling and admin approval. Tutor should see their agreed earnings, not the platform's confidential fee configuration unless contractual terms require it.

## Roles and controls
Teacher applicant -> verified applicant -> under review -> approved/active -> suspended/archived. Public listings are **not** auto-published on registration.
Teacher: manage own profile, availability, course proposals, lesson operations, progress, materials, support, payout statements.
Admin: moderation queue, identity/qualification/child-safety checks, course and price approval, commission rules, featured placement controls, refunds and disputes.
Parent/student: browse and filter verified tutors; see final retail price per lesson/package, location/time zone, availability and approved intro video; enrol and contact/support through platform. No direct sharing of children's phone/email with teachers by default.
Finance: approve payouts, audit receipts/refunds/chargebacks and reconcile gateway transfers.

## Tutor onboarding flow
1. Register with verified email, MFA for privileged roles, accept tutor terms and policies.
2. Complete profile: display name, pronouns optional, professional headline, languages, teaching subjects, age bands, qualifications, experience, teaching approach, location/time zone, suitable age categories and available days/times.
3. Upload profile picture, CV/resume and qualifications/verification documents.
   - Public: approved portrait, public headline, vetted summary, approved demo video and approved subjects.
   - Private to reviewers: CV, ID, verification materials, safeguarding documentation and sensitive contact details. Do **not** publish raw CV or identity documents automatically.
4. Upload introductory video: secure direct-to-storage signed upload, max size and duration configured, file extension and real MIME checking, malware scanning/transcoding, consent and child-safe moderation; thumbnail and captions optional, admin approval before publication.
5. Course setup: choose Heeva category or propose a new one, structured course description, level, objectives, delivery language, duration (e.g. 30/45/60 min), 1:1/group, age category, lesson price proposal, package availability and trial inclusion.
6. Set tutor **net** earnings proposal per session, currency, effective date, and preferred availability. Heeva approves retail offer and margin rule.
7. Submit for review: show missing verification items, review status, changes requested, resubmit and history. Only approved versions appear in teacher directory.
8. Connect a secure payout onboarding method through regulated PSP; avoid accepting bank-card data in profile files.
9. Publish only after approval; revisions to pricing, video and safeguarding-sensitive information can require reapproval; historical bookings use locked rate snapshot.

## Teacher Dashboard information architecture
A. Home — real upcoming classes, new lesson requests, profile completion state, payout amount eligible vs pending, messages needing attention.
B. My profile — portrait crop/edit, display name, education, career summary, CV private upload, public qualification list, intro video preview/upload and moderation status; public profile preview.
C. My courses & pricing — per-course subject, description, class format, length, proposed tutor price, approved selling price (as authorised), visibility and approval state; submit for review.
D. Availability & bookings — calendar with daylight-saving aware timezone, weekly schedule, blackout dates, rescheduling, Teams/Meet link workflow.
E. Students & lessons — only assigned learners, course progress, attendance, notes, homework, shared resources; safeguarding restrictions.
F. Earnings & payouts — completed eligible sessions, agreed tutor rate per booking, payout holds/adjustments, invoice/statement exports, amounts paid and next eligible payout window.
G. Support & settings — create ticket, reply to staff, notifications, language, password and session controls.

## Public directory and tutor detail pages
- Search/filter by subject, teacher language, student age group, time zone/availability, lesson length, online format, approved retail price range and verified status.
- Cards: approved photo, name, subject, summary, starting **customer price** with explicit basis (e.g. per 60-minute lesson), intro video thumbnail, verified badge ONLY if verified under defined policy, short call to action.
- Detail: approved bio, approved teaching background, course list with customer retail prices, teaching approach, approved video with accessible captions, availability, booking/request free introductory lesson (one per eligible learner), FAQs and contact via marketplace.
- Do not invent star ratings or reviews. Show only genuine verified reviews if and when that moderated product feature exists.
- No public view of private teacher resume, credentials, bank details, student records or unapproved videos.

## Marketplace workflow: student booking -> settlement
1. Student/guardian selects teacher/course/slot; server checks eligibility, slot concurrency and tutor/course approval.
2. Customer sees final GBP price, duration, taxes/fees disclosures, cancellation policy and total payable.
3. Secure external checkout handled by chosen PSP. Booking confirmed only after validated payment event or explicit approved admin payment arrangement.
4. Server snapshots retail price, tutor net amount, platform fee, PSP costs and applicable tax/currency metadata per transaction.
5. Meeting link/calendar invited to authorised participants; session status and attendance recorded.
6. Completion and relevant no-show/refund rules determine payout eligibility; payment dispute can place hold; system prevents duplicate payout.
7. Tutor sees statement and receives provider payout after reconciliation; customer gets receipt/invoice as legally appropriate.
8. Refunds/chargebacks reverse proportional liabilities under actual tutor agreement, with audit and approvals.

## Database/API requirements (proposal, validate against actual schema)
- teacher_accounts (tie to authenticated staff identity), teacher_profiles, teacher_documents (private), media_assets (photo/video approval and scan state), qualifications, teacher_course_offers, course_pricing_versions, commission_agreements, availability_windows, booking_slots, bookings, price_snapshots, attendance_records, payment_events, invoices, refunds, payout_accounts, payout_items, payout_batches, teacher_review_events, audit_logs, support_tickets.
- API endpoints should be auth-enforced and scoped to current tutor ID; never trust a client-supplied tutor ID for write access.
- Draft/edit/submit-for-review/approve/publish/reject endpoints separated by role; approval must not be possible with teacher-only credentials.
- Secure object storage for images, private CV and intro videos; signed expiring access; media validation and lifecycle cleanup.
- Test edge cases: competing bookings, timezone/DST, cancelled class, changed price after booking, partial refund, missed lesson, blocked video upload, cross-tutor access, old CV leaked, unapproved self-publishing, duplicate payment webhook, incorrectly calculated commission.

## Recommended delivery slices
M1: **Graphical tutor dashboard + profile editor** with saved drafts, approved photo upload, public preview, admin moderation queue.
M2: **Intro video + private resume/qualification review** with safe uploads and moderation; public teacher directory migrated from static data to approved records.
M3: **Course proposals, tutor net rates and pricing approval** with marketplace price simulator, versioned commission and public final price.
M4: **Availability, bookings, Meet/Teams links and attendance** tied to course/session.
M5: **Hosted payment, invoice, commission ledger and regulated payouts**, verified with sandbox reconciliations and accountant approval.
M6: Search/filter improvement, genuine verified reviews, tutor reporting, robust support and dispute resolution.

Release rule: UI features are not 'complete' if database/API authorization, file security, moderation or end-to-end tests are missing. Never deploy new unreviewed teacher uploads or payments to production.
