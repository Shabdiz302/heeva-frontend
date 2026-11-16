# VPS staging deployment notes (AlmaLinux / Podman)

These steps are for the staging host only. They do not modify `/var/www/html/HeevaCourses`, the legacy `online_school` MariaDB database, production DNS, or the mail services.

## 1. Create a private environment file

Generate a strong database password on the VPS:

```bash
openssl rand -hex 32
```

Create `/etc/heeva-student-api/api.env` with the generated value substituted in both places:

```ini
NODE_ENV=production
PORT=3100
COOKIE_SECURE=true
SESSION_TTL_DAYS=30
APP_ORIGINS=https://staging.heevacourses.com
POSTGRES_DB=heeva_students
POSTGRES_USER=heeva_app
POSTGRES_PASSWORD=REPLACE_WITH_RANDOM_HEX_VALUE
DATABASE_URL=postgres://heeva_app:REPLACE_WITH_RANDOM_HEX_VALUE@heeva-postgres:5432/heeva_students
```

Protect it:

```bash
install -d -o root -g root -m 700 /etc/heeva-student-api
chmod 600 /etc/heeva-student-api/api.env
```

Do not put the environment file in Git or send it in chat.

## 2. Create isolated Podman network and volume

```bash
podman network create heeva-student-net
podman volume create heeva-student-pgdata
```

If they already exist, do not recreate or delete them; inspect them first.

## 3. Start PostgreSQL privately

```bash
podman run -d --name heeva-postgres \
  --network heeva-student-net --network-alias heeva-postgres \
  --restart unless-stopped \
  --env-file /etc/heeva-student-api/api.env \
  -v heeva-student-pgdata:/var/lib/postgresql/data \
  --health-cmd 'pg_isready -U heeva_app -d heeva_students' \
  --health-interval 5s --health-timeout 5s --health-retries 20 \
  postgres:16-alpine
```

Do **not** add `-p` or publish port 5432. The database is only reachable on the private Podman network.

Check readiness:

```bash
podman logs --tail 50 heeva-postgres
podman exec heeva-postgres pg_isready -U heeva_app -d heeva_students
```

## 4. Build and start the API

From the repository checkout:

```bash
cd services/student-api
podman build -t heeva-student-api:staging .
podman run --rm --network heeva-student-net \
  --env-file /etc/heeva-student-api/api.env \
  heeva-student-api:staging node src/migrate.js
podman run -d --name heeva-student-api \
  --network heeva-student-net \
  --restart unless-stopped \
  --env-file /etc/heeva-student-api/api.env \
  -p 127.0.0.1:3100:3100 \
  --security-opt=no-new-privileges \
  heeva-student-api:staging
```

Check locally on the VPS:

```bash
curl -i http://127.0.0.1:3100/api/health
```

The health endpoint should return JSON with status `ok` and database `connected`.

## 5. Apache reverse proxy (separate staging vhost only)

After the API is healthy, add these directives inside the **staging HTTPS VirtualHost only**, not the live `symfony.conf`:

```apache
ProxyPreserveHost On
ProxyPass        /api/ http://127.0.0.1:3100/api/
ProxyPassReverse /api/ http://127.0.0.1:3100/api/
```

Run `httpd -t` before reloading Apache. Test `https://staging.heevacourses.com/api/health` while authenticated through the existing staging Basic Auth gate.

## 6. Rollback

To stop only the new API:

```bash
podman stop heeva-student-api
podman rm heeva-student-api
```

Do not remove `heeva-student-pgdata` if you need to preserve any staging registrations. Do not remove or modify the old website or MariaDB.

## Operational notes

- Add a tested systemd/Quadlet unit for automatic startup after reboot before relying on the platform.
- Back up the new PostgreSQL volume separately before any upgrade.
- Rotate the temporary staging database password before production and keep all secrets outside Git.
