# Heeva frontend

A new React + Vite frontend prototype for Heeva Courses. It is intentionally separate from the existing custom PHP application.

## Current scope

- Responsive, child-first homepage
- Course category browsing and local search
- Teacher introduction and parent-facing trust content
- Consultation enquiry demo (currently local-only; no data is transmitted)
- No connection to the live PHP backend yet

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build for deployment

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## Deploy preview

This is a static frontend and can be deployed to Cloudflare Pages. Build command: `npm run build`. Output directory: `dist`.

## PHP integration plan

The current PHP application and database remain authoritative. Before integration:

1. Audit the existing PHP application and database.
2. Identify existing routes, authentication/session behaviour, course and teacher data, booking and enquiry handling.
3. Create or document stable, authenticated API endpoints in PHP.
4. Configure CORS and CSRF protections correctly.
5. Replace demo data and the local-only enquiry handler with a typed API client.
6. Test in staging before changing production routing.

Do not point this frontend at production APIs until the endpoints and security controls have been reviewed.

## Public repository safety

This repository is designed to be public. Never commit:
- `.env` or `.env.local`
- API secrets, passwords, tokens, SSH keys
- Database dumps or customer/student records
- Private teacher or child information
- Existing PHP backend source unless deliberately reviewed and approved

`.env.example` is safe to commit because it contains placeholders only.

## Brand and content notes

This is an initial design direction using the Heeva name and provisional copy. Confirm brand colours, logo, photography permissions, safeguarding wording, teacher biographies and testimonials before launch. Do not publish identifiable images or testimonials involving children without appropriate documented permission.
