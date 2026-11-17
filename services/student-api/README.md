# Heeva Student API — staging foundation

This service is a separate student platform API. It does not connect to or import from the legacy Symfony/MariaDB database.

## Implemented in this staging foundation

- Adult learner and parent/guardian account registration and sign-in
- Mandatory six-digit email verification before a new account can sign in
- Verification codes are salted-hashed in PostgreSQL, expire after 10 minutes, allow at most five attempts, and have resend throttling
- Password minimum length of 8 characters (with upper-case, lower-case and numeric characters)
- Password hashing with Node.js scrypt
- Opaque, random, hashed server-side sessions in a Secure, HttpOnly cookie
- Session logout and current-account endpoint
- Account-holder profile read/update
- Separate learner profiles owned by a parent/guardian account
- Minimal learner data for this staging phase: display name, broad age band and preferred language
- Learner-specific course enrolment requests (requests do not grant paid/active enrolments)
- One introductory-lesson request per learner, enforced by the learner ID primary key
- Read-only 39-course catalogue snapshot
- PostgreSQL migrations and health endpoint

Existing staging adult accounts are retained. Migration `002_parent_learner_profiles` creates an adult learner profile for each existing adult account and attaches existing course and introductory-lesson requests to that profile. It does not import or read data from the legacy database.

## Deliberately not enabled yet

- Password recovery (requires a verified outbound email provider and a separate reset flow)
- Full child safeguarding workflow, identity/parental-responsibility verification or child login
- Admin/teacher roles and admin APIs
- Timetable availability and confirmed lesson scheduling
- PayPal orders, captures, webhooks, refunds and financial ledger
- Live payment or course-access activation

A parent/guardian account can manage separate learner profiles. The API requires an authority confirmation when a child profile is created. This checkbox is an acknowledgement only; it is not independent verification of parental responsibility and is not a substitute for a safeguarding/legal review.

Learner profiles intentionally do not collect a date of birth, health information or free-text sensitive notes in this stage. A course request is only a request and never grants paid access. One introductory lesson may be requested per learner, subject to teacher availability and confirmation by Heeva. Courses not explicitly marked `available` cannot be requested.

The teacher directory shown in the frontend uses the published Heeva teacher biographies and explicit `relatedCourses` entries. A displayed teacher/course match is a subject match only; it is not an assignment or confirmation of availability.

## Runtime requirements

- Node.js 22+
- PostgreSQL 16+
- `DATABASE_URL`
- `COOKIE_SECURE=true`
- `APP_ORIGINS` containing the exact HTTPS site origin, for example `https://staging.heevacourses.com`
- `RESEND_API_KEY` with a send-only Resend API key
- `EMAIL_FROM` using a sender address on a domain verified in Resend

The API is designed to sit behind the staging Apache TLS virtual host, with API containers published only on host loopback. PostgreSQL must not publish a host port.

## Migrations and startup

Build the image from this directory and run `node src/migrate.js` using the same environment and private Podman network as the API container. Migrations are applied sequentially and recorded in `schema_migrations`. Then start `node src/server.js`.

Take a PostgreSQL backup before applying migrations to an existing staging database. Do not expose PostgreSQL or the API port directly to the internet. Use Apache as the only public entry point.

## Security notes before any production use

The staging API still needs password reset, persistent rate limiting beyond the current per-process resend/login controls, independent parent/guardian verification, child privacy and safeguarding review, an admin workflow, audit logging, and a tested backup/restore process. Configure a production origin and review privacy/terms copy before collecting real customer data.

## Transactional email setup

Email verification uses the Resend REST API from the backend only. Never expose `RESEND_API_KEY` to the browser, frontend build arguments, GitHub source files or logs. Create a Resend API key with sending-only permissions and verify the sending domain before configuring:

- `RESEND_API_KEY`
- `EMAIL_FROM` (for example, `Heeva Courses <accounts@your-verified-domain>`)

The application sends a six-digit code that expires after 10 minutes. Only a salted hash is stored. Verification attempts are capped at five per code; resend requests are throttled to one per minute and five per rolling 24-hour period. A new code invalidates the preceding code.

The API uses the Resend `POST /emails` endpoint with bearer authentication. No email provider credential is committed to this repository.
