# Deployment Notes

Target: **Render**, one web service plus one managed PostgreSQL instance,
described by [`render.yaml`](render.yaml).

For Railway instead, see [RAILWAY.md](RAILWAY.md) — same single-service shape,
configured by [`railway.json`](railway.json). The rationale below about origins,
cookies and schema changes applies to both platforms.

## Why one service, not two

Owner and customer sessions are cookies set with `sameSite: 'lax'`
(`server/src/owner-auth.ts`, `server/src/customer-router.ts`). A browser will
not send a lax cookie on a cross-site request, so hosting the SPA on its own
origin and the API on another would let login *appear* to succeed and then fail
on the next request. The Express app therefore serves the built storefront from
`dist/` in production, and the storefront calls `/api/v1` on its own origin.

Splitting them anyway means changing both cookies to `sameSite: 'none'; secure`,
setting `VITE_API_URL` at build time, and setting `SERVE_CLIENT=false`. Do not
do this without testing owner login end to end.

## Required Environment

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Render database | Wired automatically by the blueprint. |
| `CLIENT_ORIGIN` | you | Exact storefront origin, e.g. `https://onebite.onrender.com`. Never `*` — CORS runs with credentials. |
| `SITE_ORIGIN` | you | Substituted into `dist/sitemap.xml` at **build** time. Changing it needs a rebuild, not a restart. |
| `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_TOTP_SECRET`, `OWNER_TOTP_ENCRYPTION_KEY` | you | Owner dashboard auth. See `ADMIN_SETUP.md`. |
| `NODE_ENV=production` | blueprint | Also what makes the session cookies `secure`. |
| `PORT` | Render | Injected. |

Optional escape hatches, both documented in `.env.example`: `SERVE_CLIENT=false`
(API only) and `TRUST_PROXY=false` (not behind a proxy).

`trust proxy` is on by default. Without it every request appears to come from
Render's proxy address and the per-route rate limits would be shared by all
callers instead of applied per client.

## Schema Changes

There is no Prisma migrations directory — schema changes live as SQL scripts in
`server/prisma/manual-migrations/`, because `prisma migrate` fails locally on
Windows with a schema engine error. Production therefore syncs with
`npm run deploy:db` (`prisma db push`).

**This is a manual step.** Render does not support `preDeployCommand` on free
instances, so the blueprint does not declare one. Run it yourself against the
database's external connection string before the first deploy and after every
schema change:

```bash
DATABASE_URL="<external connection string>" npm run deploy:db
```

`db push` has no down-migration and will warn before dropping a column. Read its
output rather than forcing it.

## First Deploy

1. Push this branch, then create a Blueprint on Render pointed at the repo. It
   creates `onebite-db` and the `onebite` web service.
2. Let the first build run. It will start but the database is still empty.
3. Sync the schema: `DATABASE_URL="<external url>" npm run deploy:db`.
4. Seed the catalog: `DATABASE_URL="<external url>" npm run prisma:seed`.
   The seed is idempotent upserts and is the source of truth for the catalog,
   the 7 delivery areas and a 30-day capacity horizon.
5. Bootstrap the owner: `DATABASE_URL="<external url>" npm run owner:bootstrap`.
6. Set `CLIENT_ORIGIN` and `SITE_ORIGIN` to the service's real URL, then
   **redeploy** — `SITE_ORIGIN` is only read during the build.
7. Verify: `/api/v1/health` returns `{"ok":true}`, the storefront loads, and
   owner login at `/admin` survives a page refresh (that is the cookie check).

## Known Constraints

- **Free plans sleep.** A free Render web service spins down after inactivity;
  the first request afterwards takes ~50s.
- **Free PostgreSQL expires on day 30 and is deleted on day 44.** At 30 days the
  database becomes *inaccessible* — the storefront breaks — and a 14-day grace
  period begins during which upgrading to a paid instance restores it with the
  data intact. After the grace period Render deletes the database and its data
  permanently. Upgrade before day 30 to avoid downtime entirely.
- **The capacity horizon is finite.** The seed fills 30 days. Once it lapses,
  checkout finds no available slots until the owner extends capacity from the
  dashboard.
- **Images are external URLs**, not uploads. The CSP allows `img-src https:` for
  this reason. Several seeded products point at Unsplash IDs that resolve to
  unrelated images — fix the seed data before launch.
- **No CI yet.** See below.

## Object Storage

Product and category image URLs are external URLs stored in PostgreSQL.
Production uploads should use object storage, such as S3/R2/Supabase Storage,
with database rows storing the resulting public or signed URL.

Suggested future env:

```env
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
```

## CI

A useful first CI workflow should run:

```bash
npm ci
npm run prisma:generate
npm run build
TEST_DATABASE_URL="$CI_TEST_DATABASE_URL" npm run server:test
```

The test command refuses to run without `TEST_DATABASE_URL`, so CI needs a
disposable PostgreSQL service. `server/scripts/prepare-test-db.ts` pushes the
schema and seeds it; test files run serially because they share seeded capacity
and slot fixtures.
