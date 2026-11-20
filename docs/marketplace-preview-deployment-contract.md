# Isolated Marketplace Preview — staging deployment contract
Status: **build verified, deployment NOT performed**
Review branch: `design/portal-dashboards-ux`
Updated: 2026-11-20

## Verified output
Workflow `.github/workflows/heeva-marketplace-preview-build.yml` creates an artifact `heeva-marketplace-preview-candidate` from:
- `HEEVA_BASE_PATH=/marketplace-preview/`
- `VITE_STUDENT_API_BASE=/marketplace-preview-api`
The workflow verifies direct-link HTML entries for `/staff/login`, `/staff/dashboard`, `/teacher/apply`, `/student/login`, and `/student/dashboard`, and rejects a bundle that points to the older staging API routes. **This is a build artifact, NOT a deployed site**.

## Strict isolation plan
Keep the existing working portals and services unchanged:
- Production website, live PHP/backend, and production API port 3100: **untouched**.
- Working isolated student portal `/student-preview-next/` and API `/student-preview-next-api/api/` on port **3106**: **untouched**.
- Previous isolated API on port 3104: **untouched**.

New resources (not yet created; validate availability on VPS before use):
- Static files: `/var/www/heeva-marketplace-preview/`.
- Frontend URL: `https://staging.heevacourses.com/marketplace-preview/`.
- API URL: `https://staging.heevacourses.com/marketplace-preview-api/api/`.
- Local binding: `127.0.0.1:3107` -> API container port 3100, only if unused.
- New container name: `heeva-marketplace-api-candidate`.
- **Separate** PostgreSQL database and credential: `heeva_marketplace_preview`, never `heeva_students_preview`.
- **Separate** private files directory/volume: `/var/lib/heeva-marketplace-private`.
- Local secrets path: `/etc/heeva-student-api/marketplace-preview.env` (root-only, not in Git).
- Do not reuse a live registration DB, and do not point this candidate at a live mail sender.

## No-impact server preflight — inspect only
Run each command separately and compare existing resources before any changes:
```bash
ss -ltnp | grep -E ':3100 |:3104 |:3106 |:3107 ' || true
podman ps --format '{{.Names}} {{.Ports}}'
grep -nE 'student-preview-next|marketplace-preview' /etc/httpd/conf.d/heeva-staging.conf || true
```
Check ownership, SELinux policy, Podman network access to independent DB, and available disk space. Do not use global Apache search/replace, stop existing API containers, or migrate the existing `heeva_students_preview` database.

## Staging Apache configuration (proposal; not applied)
Inside the protected **staging vhost only**, preserve Basic Auth and noindex, and use unique prefixes:
```apache
Alias "/marketplace-preview/" "/var/www/heeva-marketplace-preview/"
<Directory "/var/www/heeva-marketplace-preview/">
    Require all granted
    Options -Indexes +FollowSymLinks
    AllowOverride None
    DirectoryIndex index.html
    FallbackResource /marketplace-preview/index.html
</Directory>
ProxyPass "/marketplace-preview-api/api/" "http://127.0.0.1:3107/api/"
ProxyPassReverse "/marketplace-preview-api/api/" "http://127.0.0.1:3107/api/"
```
**Important**: Directory authentication rules and Apache alias precedence depend on the current full vhost, so inspect them before applying the snippet. Ensure the staging Basic Auth is inherited by *both* routes, and verify no direct access to the internal API without a reviewer login.

## Candidate API deployment gates
1. Use the locked source commit from GitHub; build a separate Podman image rather than replacing any running image.
2. Create a new, empty Postgres DB and restricted user, with its own secrets. Do not export or clone real student records.
3. Run migrations 001–009 ONLY on the new isolated DB and inspect the migration log.
4. Configure API environment with `APP_ORIGINS=https://staging.heevacourses.com`, `COOKIE_SECURE=true`, `NODE_ENV=production`, `PORT=3100`, new independent DB connection and private resource path.
5. The server needs a real ClamAV-compatible scanner configured via `HEEVA_CLAMSCAN_PATH`; **the current Alpine Dockerfile does not install it**. Do not enable CV upload until a scanner is installed, signatures updated and malicious/clean samples are tested. The API fails closed without a scanner.
6. Bind candidate only to `127.0.0.1:3107`; deny externally accessible DB/API ports.
7. Confirm independent browser cookie sessions do not affect the current staging student API. The APIs currently share `__Host-heeva_staff_session` and `__Host-heeva_preview_session` cookie names and `Path=/`, which makes browsers send both candidate and existing cookies to either API. Tokens differ, but logins can overwrite one another. **Resolve by unique cookie names per candidate before parallel end-user tests.**
8. After reviewing vhost and backups, perform an `apachectl configtest`, then reload only if it passes.
9. Smoke test health, register/verify with synthetic emails only, teacher approval, teacher profile, portrait and CV permissions, course offer margin and lesson status regression.
10. **Do not publish public teacher profiles, process payments, or enrol real children** before policy, safeguarding and finance reviews.

## Rollback concept (not executed)
Remove ONLY the new `/marketplace-preview/` alias and `/marketplace-preview-api/api/` proxy, restore the pre-change staging vhost backup, check config and reload. Stop ONLY `heeva-marketplace-api-candidate` and restore ONLY the dedicated candidate static directory. Retain isolated DB/private files until reviewed. Existing 3106 and production services should remain functional throughout.

## Deployment authority
The existing `heeva-deploy` SSH key is constrained by a forced command that confirms connectivity but **does not execute deployments**. Do not try to bypass it. Use an authorized operator on the VPS or build a reviewed, scoped deployment gate later.
