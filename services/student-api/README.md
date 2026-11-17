# Heeva Student API — staging foundation

This service is a separate student platform API. It does not connect to or import from the legacy Symfony/MariaDB database.

## Implemented in this staging foundation

- Adult learner and parent/guardian account registration and sign-in
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

- Email verification and password recovery (requires a verified outbound email provider)
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

The API is designed to sit behind the staging Apache TLS virtual host, with API containers published only on host loopback. PostgreSQL must not publish a host port.

## Migrations and startup

Build the image from this directory and run `node src/migrate.js` using the same environment and private Podman network as the API container. Migrations are applied sequentially and recorded in `schema_migrations`. Then start `node src/server.js`.

Take a PostgreSQL backup before applying migrations to an existing staging database. Do not expose PostgreSQL or the API port directly to the internet. Use Apache as the only public entry point.

## Security notes before any production use

The staging API still needs email verification, password reset, persistent rate limiting, a verified parent/guardian workflow, child privacy and safeguarding review, an admin workflow, audit logging, and a tested backup/restore process. Configure a production origin and review privacy/terms copy before collecting real customer data.
