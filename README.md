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

The course list contains published course names, session counts and lesson lengths. Fees and course suitability are discussed during consultation. Teacher portraits and biographies come from Heeva’s public directory. The public portrait files are 263×223 pixels; cards preserve that landscape ratio, do not crop or enlarge them, and use WebP conversions. Re-encoded JPEG copies with image metadata removed are retained separately. `public/images/teachers/asset-manifest.json` lists every portrait source URL, source dimensions, local filename, and display treatment. No customer reviews are reproduced; the home page links to Heeva’s published Trustpilot profile.

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

## GitHub Pages preview

The Pages workflow publishes from `preview/github-pages`. The build emits route entry files so course, teacher and Business links can be opened directly. The original edited Business portrait in commit `d161208` is truncated; this branch uses the previous Business page’s Royal Holloway portrait as a local JPEG until the edited original is available.

Course and Business enquiry previews use topic selections only. They require a dedicated staging destination before submissions can be enabled. The chat launcher requires a verified preview Worker URL in the GitHub Pages environment variable `VITE_HEEVA_CHAT_URL`. See the [Worker setup](workers/heeva-ai-assistant/README.md) for the protected configuration.
