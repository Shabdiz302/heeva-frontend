# Heeva dashboards — functional release checklist
Updated 21 November 2026. Draft branch `design/portal-dashboards-ux`. Live Heeva production unchanged.

## Three roles and their required navigation

### Student / Parent
- [x] Frontend foundations: secure account login, guardian/learner profiles, enrolment requests, lesson summaries, course materials, one introductory lesson request
- [x] Functional API foundation and one-trial-per-learner database uniqueness constraint
- [x] Visual review: clearer separate dashboard tabs and branded KPI cards
- [ ] Email verification and account recoverability fully configured and verified in real isolated staging
- [ ] Confirmed teaching schedules and actual bookings; cancellation, rescheduling, notices and timezones
- [ ] Real checkout, payment receipts, refunds, invoices and VAT where applicable
- [ ] Guardrails for child data, privacy requests, parental controls and safeguarding acceptance

### Educator
- [x] Frontend foundations: email verification, private profile creation, portrait/CV upload, course proposals, review status
- [x] Scoped preapproval dashboard with educator profile and proposed courses
- [x] Optional bilingual AI biography suggestions with explicit consent, no automatic publication
- [x] Clear task shortcuts and graphical review experience
- [ ] Secure photo-enhancement and real-video processing, consent and moderation
- [ ] Confirmed lessons, availability calendar, materials, lesson outcomes and communications
- [ ] Payment reconciliation and earnings/payout histories
- [ ] On-server publication and versioned edit/reapproval end-to-end verification

### Heeva Admin
- [x] Frontend/API foundations: application review, profile and course-price approval, enrolment and lesson management
- [x] Explicit safeguarding signoff before educator publishing, with unpublish endpoint
- [x] Overview navigation shortcuts to approval and pricing workflows
- [ ] Review queue with realistic real-data staging credentials and role-by-role acceptance tests
- [ ] Real lesson scheduling, financial records, refund processing and support cases
- [ ] Safeguarding evidence workflow, audit, backups and retention policies
- [ ] Reporting, analytics and operational notifications tied to actual verified data

## Visual demonstration vs real accounts
`/demo` is deliberately **visual-only** on preview hosts with fictional personas, graphical status cards, task menus, calendar mock-up and clearly-labelled unreleased modules. Its credentials never authenticate through the Marketplace API. The real paths are `/student/login` and `/staff/login`; actual data will require live isolated staging API and provisioned accounts. Never put demonstration values in production metrics or use them as proof of working finance, messaging or bookings.

## Release gate
1. All relevant GitHub CI checks green on the same head commit.
2. Cloudflare build successful for the same head commit.
3. Isolated VPS API routes configured and data migrations applied with rollback plan.
4. Real end-to-end browser testing of registration, approval, profile updates and course proposals.
5. Payments, safeguarding, data handling and tutor contracts reviewed and tested before activating them.
6. Explicit approval for live domain cutover after backup/restore validation.

This checklist is an honest engineering progress tracker, **not** a claim of production readiness.
