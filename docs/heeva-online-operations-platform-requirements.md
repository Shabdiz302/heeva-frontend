# Heeva Courses — Complete Online Operations Platform
Status: product requirements and implementation roadmap (not implemented)
Owner: Heeva Courses
Last revised: 2026-11-20

## Product objectives and invariants
- A single graphical, mobile-first platform for administrators, tutors, parents and learners to run the course marketplace.
- Preserve existing production website/API, deployment isolation, and current working staging behaviour until each release is verified.
- Exactly **one** free introductory lesson per eligible learner/account under a centrally enforced policy (do not advertise or implement two).
- Existing Heeva model: third-party tutors, marketplace commission, and Heeva-owned courses.
- The business and enterprise consultancy area can later share customer/support infrastructure but needs distinct commercial workflows.
- English and Persian, with real right-to-left layout support.
- Do not introduce unverified financial totals, fake user analytics, or placeholder financial numbers on live dashboards.

## UX and navigation
Common: role-specific home page, searchable sidebar, task inbox, global course/learner search (permission-scoped), activity notifications, clear breadcrumbs, consistent status chips, confirm dialogs for consequential actions, form validation, loading/empty/error states, keyboard support, readable 14–16px body type, responsive mobile and tablet views.
Sections:
- Admin: Overview, Enquiries & Leads, Enrolments, Courses, Tutors, Students/Parents, Schedule, Lessons, Progress, Payments & Finance, Support Tickets, Documents, Communications, Reports, Settings & Audit.
- Tutor: Overview, My Students, My Courses, Calendar & Online Classes, Attendance, Progress & Feedback, Materials, Messages & Tickets, Earnings & Payouts, Profile.
- Student/Parent: Overview, My Courses, Upcoming Lessons & Join, Calendar, Progress & Feedback, Files & Homework, Invoices & Payments, Messages, Support Tickets, Profile.
- Heeva finance/operations staff: permission-scoped Payments, Refunds, Tutor Payouts, Reports; cannot access unrelated child data.

## Scheduling and video conferencing (Microsoft Teams / Google Meet)
- Admin/tutor creates a scheduled class attached to a specific course, enrolled student(s), tutor, timezone, start/end, and delivery mode.
- Default to Google Meet or Microsoft Teams per organisation/tutor; provider choice is saved on the lesson.
- Option A, manual MVP: authorised staff can paste a pre-created HTTPS meeting URL, validated and restricted to approved provider domains when the configured policy requires it. Never claim a meeting was created.
- Option B, integrated: connect a consenting host account via OAuth to Google Calendar/Meet or Microsoft Graph/Teams, generate and update actual calendar events and conference links, persist provider event ID, handle refresh/revoke scopes, synchronize cancellations and time changes.
- Show Join Lesson only to authorised enrolled participants, with join window; avoid exposing private URLs in public pages or open listings. Send calendar invites/reminders with approved notification channels.
- Timezones, daylight saving, cancellations, reschedules, tutor substitutions, no-show rules and meeting-link regeneration all need handling.
- Record lesson participation/attendance separately from joining a video call; a meeting link itself is not proof of attendance.

## Lessons, attendance, progress
- Lesson status transitions: scheduled, completed, missed, cancelled, rescheduled as supported by backend; audit before/after; prevent unauthorized status changes.
- Tutor attendance records (student present, late, absent), structured lesson notes, topics covered, homework, attachments, next steps.
- Course-level package progress: agreed lessons / completed / remaining; milestones, competencies, tutor assessment and optional feedback to parent.
- Progress charts must derive from verified lesson and assessment records. Do not present simplistic 'percent learned' as objective learning attainment.
- Distinguish free introductory session from paid lessons, with one-free-lesson policy enforced server-side.
- Parent visibility for children with age-appropriate protection, limited student messaging, safeguarding reporting workflow.
- Programme and tutor completion certificates only when completion criteria are formally met.

## Billing, finance and marketplace accounting
- GBP pricing first, currency/FX extension only if needed. Per-course and per-package prices, discounts, one-free-intro policy and promo controls.
- Secure hosted payments via selected regulated payment provider; no raw card storage in Heeva.
- Invoice and receipt generation, payment status: pending, paid, failed, overdue, refunded, partially refunded.
- Parent/student payment history and payment links; reminders, manual bank-transfer reconciliation when relevant.
- Tutor commission rules, rate effective dates, per-lesson or per-package allocation, gross sales, refunds, platform fee, payout eligibility, payout batches, tutor statements, adjustments and approval workflow.
- Clear distinction between money collected, revenue recognised, tutor liability, fees, refunds and cash movement.
- Webhook signature checking, idempotency, double-payment prevention, audit trail, least-privilege refunds, export to bookkeeping, reconciliation reports.
- Tax/VAT treatment and invoice requirements to be specified by UK accountant before go-live; avoid hardcoding assumptions.

## Support tickets and communications
- Authenticated student/parent/tutor ticket creation; subject, category (payments, scheduling, technical, safeguarding, other), description, priority, attachments, ticket owner/status, timeline and replies.
- Ticket states: new, open, waiting on customer, escalated, resolved, closed. Email notifications and SLA reminders.
- Staff can link tickets to a course/enrolment/lesson/payment; preserve access rules for sensitive tickets. Safeguarding cases need restricted access and escalation beyond ordinary support.
- Optional email-to-ticket and human handoff from Heeva AI chatbot; bot cannot invent prices, confirm payments or alter records without authorized workflow.
- Templates for booking confirmations, video links, reminders, failed payments, lesson follow-up and ticket replies. Email delivery logs and opt-in/opt-out for marketing.

## Users, onboarding and safety
- Account registration with verified email; student/parent relationship with guardian authorisation where required; teachers reviewed/approved before active use.
- Roles and granular permissions enforced by API, not only hidden UI elements; staff invitation, session revocation, admin MFA, password reset, access/audit logs.
- Teacher onboarding: bio, qualification checks, approval, course expertise, timezone/availability, payout details through secure provider, safeguarding eligibility checks where applicable.
- Privacy by design: personal data minimisation, consent/legitimate basis evaluation, retention policies, data export/deletion workflow, private storage, encrypted transport, secure backups and disaster recovery.
- In particular protect children's data, document access and private meeting links; UK data-protection and safeguarding obligations require review before production launch.

## Admin reporting
- Funnel: enquiries → intro booked → intro completed → paid enrolment.
- Operational: requests awaiting action, today's lessons, overdue tasks, cancelled lessons, no-shows, support backlog.
- Commercial: collected payments, outstanding invoices, refunds, tutor payouts due, marketplace commission, sales by course/time, active learners.
- Drill-down and date filters, CSV exports with access controls; distinguish historical from live or estimated metrics.

## Required architecture / dependencies
- Continue existing React frontend + current Student API and PostgreSQL; separate staging from production and preserve rollback.
- New backend modules/migrations: meeting_providers, bookings/events, attendance, progress_records, invoices, payment_transactions, payment_webhooks, tutor_commissions, payouts, tickets, ticket_messages, notifications, audit; schema design to be reviewed against existing tables before writing migrations.
- Job queue for reminder/email retries and failed webhook handling; structured error logs and monitoring, with no secrets or children's personal data logged.
- Integrations are *proposals*, not connected: Google Workspace (Calendar/Meet), Microsoft 365 (Graph/Teams), hosted payment processor, transactional email service.
- Do not use API keys in frontend, GitHub commits, chat messages or screenshots. Use protected secrets/environment and scoped OAuth credentials.

## Delivery plan and acceptance gates
### Release 1 — Navigation and operational usability
- Staff graphical home, role-aware navigation, responsive design, login visibility, lesson management, enrolment management, existing private file flow.
- Student and parent dashboard improvements, progress readouts from existing records.
- Do not ship with broken class completion, login, existing resource permissions, or teacher scoping.
### Release 2 — Online classes and progress
- Scheduling/calendar with manual Meet/Teams links first, links attached to lessons; availability, reminders, attendance, homework and progress.
- Provider-generated meetings only after OAuth, token lifecycle, and cancellation tests work.
### Release 3 — Commerce and finance
- Hosted checkout, invoicing, payment history, webhook reconciliation, refunds and tutor commission/payout accounting.
- Run payment-provider sandbox and accountant review before any live charge.
### Release 4 — Helpdesk and communications
- Ticketing with staff queues, notifications, security checks, restricted safeguarding categories, AI handover.
### Release 5 — Analytics and automation
- Reliable reporting, tutor quality metrics, automated operational follow-ups and optional marketplace growth integrations.

## Acceptance criteria before production
- Each role sees only authorized records and links (API-enforced).
- Mobile, desktop, keyboard, English/Persian RTL tested.
- Create/reschedule/cancel lesson, join link, attendance, progress and course completion survive refresh.
- Payment totals reconcile across provider, invoices, refunds, tutor liabilities and statements; no duplicate webhook effect.
- Tickets persist, replies/notifications are delivered, attachments restricted.
- Automated tests, security review, staging sign-off, database backup and rollback procedures completed.
