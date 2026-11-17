# Heeva staging API deployment — required server setup

## Current state

- Public Heeva website: **must not be changed by this deployment workflow**.
- Current staging API: localhost port **3104**; do not stop or replace until authenticated browser acceptance testing is ready.
- Isolated test API: localhost port **3105** and the **heeva_students_integration_test** database; do not promote this test database to staging.
- PR #5: contains the PostgreSQL lesson-status fix and passing GitHub CI. Keep as draft until release acceptance.
- The release-candidate GitHub Action builds an image only; **it does not deploy**.

## Security boundary (required before enabling SSH deployment)

1. Record existing Apache proxy rules, Podman container names, networks, systemd units, image tags, environment files and active database names in a read-only audit. Do not output secrets or full environment files.
2. Create a dedicated unprivileged deployment account. Do not put the root SSH key, VPS password or application database password into GitHub.
3. Give the deployment account a narrowly scoped server-side command (forced SSH command or equivalent). It must **not** accept arbitrary shell commands or a user-supplied file path.
4. Configure a staging-only GitHub Environment with required reviewer approval, deployment-branch restrictions and environment-scoped secrets. Verify these controls are actually enforced by the repository plan/settings before proceeding.
5. Store the deployment private key only in GitHub Environment secrets; pin the SSH host key using a trusted fingerprint collected independently from the VPS. Never disable host-key checking.
6. Build a versioned image and verify its digest. Deploy a new candidate alongside port 3104, with a separate container name. Preserve the existing known-good container, env file, PostgreSQL data, and Apache config.
7. Run non-destructive health, origin/authentication, lesson-completion and database-persistence acceptance tests against an isolated/approved staging dataset. Never use a CI-generated administrator on the customer database.
8. Only after approval, back up the exact Apache staging virtual host configuration and switch **only** staging API routing to the validated candidate. Confirm `apachectl configtest` before a reload.
9. Provide a one-command rollback to the old staging container and proxy destination. Confirm recovery and no production-site regression.
10. Do not automate production deployment from this workflow.

## Activation gates

- [ ] Read-only VPS audit reviewed
- [ ] Deployment account/SSH forced command verified
- [ ] GitHub Environment protections verified
- [ ] Secrets installed without sharing them in chat
- [ ] Candidate image, database targeting and migration policy reviewed
- [ ] Successful browser and authenticated API acceptance test
- [ ] Backup and rollback rehearsed

**Until all gates are satisfied, staging deployment remains disabled.**
