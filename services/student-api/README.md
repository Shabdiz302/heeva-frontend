# Heeva Student API — staging foundation

This service is a separate student platform API. It does not connect to or import from the legacy Symfony/MariaDB database.

## Implemented in this foundation

- Student registration and sign-in
- Password hashing with Node.js scrypt
- Opaque, random, hashed server-side sessions in a Secure, HttpOnly cookie
- Session logout and current-account endpoint
- Student profile read/update
- Read-only 39-course catalogue snapshot
- Course enrolment requests (not paid/active enrolments)
- One introductory-lesson request per account, enforced by a database primary key
- PostgreSQL migrations and health endpoint

## Deliberately not enabled yet

- Email verification and password recovery (requires a verified outbound email provider)
- Admin/teacher roles and admin APIs
- Timetable availability and confirmed lesson scheduling
- PayPal orders, captures, webhooks, refunds, and financial ledger
- Live payment or course-access activation

A course request is only a request. It never grants paid access. A trial request is limited to one per student account. “Coming soon” courses cannot be requested.

## Runtime requirements

- Node.js 22+
- PostgreSQL 16+
- `DATABASE_URL`
- `COOKIE_SECURE=true`
- `APP_ORIGINS` containing the exact HTTPS site origin, for example `https://staging.heevacourses.com`

The API is designed to sit behind the existing Apache TLS virtual host at `/api/`, with the API container published only on host loopback. The PostgreSQL container should not publish a host port.

## Migrations and startup

Build the image from this directory, run `node src/migrate.js` once using the same environment and network as the API container, then start `node src/server.js`.

Do not expose PostgreSQL or the API port directly to the internet. Use Apache as the only public entry point.

## Security notes before any production use

The staging API still needs email verification, password reset, persistent rate limiting, an admin workflow, audit logging, and a tested backup/restore process. Configure a production origin and review privacy/terms copy before collecting real customer data.
