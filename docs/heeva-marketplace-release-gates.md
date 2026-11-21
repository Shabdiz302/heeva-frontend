# Heeva marketplace release gate — Teacher onboarding and document storage
Status: DEVELOPMENT ONLY (not deployed to staging or production)
Date: 2026-11-20

## Implemented
- Teacher account registration, email verification and resend.
- New staff account stays suspended until admin approves verified application.
- Teacher profile draft, proposed tutor rate and admin profile moderation.
- Private teacher portrait upload and owner/admin previews.
- Private CV upload (PDF only, 5 MB max) and owner/admin restricted download. Security scanner must return clean before DB metadata is committed.
- Teacher offer proposals and admin pricing reviews. All marketplace records remain private, no public directory sync.
- Build, API and isolated PostgreSQL integration workflows.

## Deployment prerequisites — MUST verify before enabling this feature
1. Apply migration 006, 007, 008, 009 ONLY to isolated disposable integration DB first; verify rollback and backups.
2. Use a separate isolated candidate API/container/volume, not production API on 3100 or existing production database.
3. Configure actual malware scanning utility in the candidate image. Set `HEEVA_CLAMSCAN_PATH` to its *absolute* executable path. **Never** configure a mock scanner outside CI.
4. Ensure scanner definitions auto-update and scanner runs with low privilege, restricted filesystem/network and upload timeouts. Test clean PDF, EICAR synthetic test signature, scanner outage and oversized upload.
5. Confirm private mount directories exist and have least-privilege ownership. Teacher-CVs and portraits are not world readable.
6. Confirm API authorization: applicant cannot sign in before approval; teacher cannot view another teacher's profile, CV, or photo; only admin can see all applications and approve.
7. Verify 6-digit code handling and resend limits using a real test email service, never send real children or customer records.
8. Complete tutor agreement/privacy/legal review, safeguarding workflow and manual verification policy. Admin account approval alone is not a DBS/reference check.
9. Test mobile/frontend routes under `/student-preview-next/`, cookie auth, noindex staging and API base environment.
10. Approve release only after integration, security and accessibility checks pass; preserve rollback and backup.

## Known limitations / do not claim delivered
- Existing public teacher directory is still static. No teacher profile auto-publishing.
- No direct intro video uploads/transcoding. Need secure external video hosting, file scanning, moderation and encoding rules.
- No self-service course availability/calendar or Meet/Teams link generation yet.
- Pricing is a PRIVATE proposal and approval, not an actual charged checkout price; merchant-of-record/VAT/fees require review.
- No payments, receipts, teacher payouts, support tickets or customer booking ledger.
- Current new teacher signup requires configured email sender, otherwise registration fails closed.
- Profile photo verification checks only signature/type and size; public publishing must eventually require image processing/re-encoding, moderation and alt text.
- CV scanner integration uses `clamscan`-compatible CLI; do not deploy unless actual installed scanner and definitions verified.
- File replacement currently leaves old private files until retention/secure cleanup is implemented. Build cleanup before public release.
- Current tests include a CI-only mocked email transport and scanner; these verify application flow and access control, not the effectiveness of real antivirus detection.
