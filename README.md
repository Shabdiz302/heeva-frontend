# Heeva Courses frontend

A responsive React and Vite frontend preview for Heeva Courses. The site is a static single-page application configured for Cloudflare Workers Static Assets. It remains separate from Heeva’s PHP application and does not send consultation form data to a backend.

## Pages

- Home
- All courses and individual course details
- Searchable teacher directory and individual teacher profiles
- How Heeva works
- Information for parents
- About Heeva
- Free consultation preview
- FAQ
- Contact information

The course list contains published course names, session counts and lesson lengths. Fees and course suitability are discussed during consultation. The teacher directory uses portraits and biography information published by Heeva; original portrait copies are retained separately and stripped of image metadata, while optimized WebP files are used on pages. No customer reviews are reproduced; the home page links to Heeva’s published Trustpilot profile.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and pnpm.

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

Open the local URL printed by Vite.

To create and preview a production build locally:

```bash
pnpm run build
pnpm run preview
```

The production build is written to `dist/`.

## Cloudflare Workers Builds

The repository uses `wrangler.jsonc` for a static assets deployment with SPA fallback. In Cloudflare Workers Builds, use:

- Build command: `pnpm run build`
- Deploy command: `pnpm run deploy`

The deploy script is intended for the configured Cloudflare build workflow. Do not connect this frontend to the production PHP system until an API and security review has been completed.

## Consultation preview

The form validates required fields in the browser and displays a confirmation state. It does not transmit or persist personal information. A reviewed, secure integration with Heeva’s existing PHP backend is required before accepting enquiries.

## Content and safeguarding

The site uses published course details, teacher names, roles, biographies, and credentials only where the profiles state them, along with company contact information and existing policy links. It does not claim course age suitability, course outcomes, pricing, availability, DBS checks or accreditations. Parents are invited to ask Heeva for current safeguarding information before enrolment.

## Public repository safety

Do not commit `.env` files, API credentials, database dumps, customer or student records, private teacher details, or unreviewed PHP backend source. `.env.example` contains a blank public configuration placeholder only. `node_modules`, `dist` and `.pnpm-store` are ignored by Git.
