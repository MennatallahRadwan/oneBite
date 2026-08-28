# Deploying to Railway

One Railway service runs Express, which also serves the built storefront from
`dist/`, plus one Railway PostgreSQL database. This is the same single-origin
shape as the Render blueprint and for the same reason: the owner and customer
session cookies are `sameSite: 'lax'`, so the SPA and the API must share an
origin. See [DEPLOYMENT.md](DEPLOYMENT.md) for the full rationale.

Config lives in [`railway.json`](railway.json). Node is pinned to 22 by
[`.nvmrc`](.nvmrc).

## Cost

Railway has no usable free tier. New accounts get a **$5 trial credit valid for
30 days**, no card required; the ongoing free plan grants only $1/month of usage
credits, which will not run a web service and a database. Budget for **Hobby at
$5/month**.

Unlike Render's free tier, Railway services do not sleep when idle.

## Steps

### 1. Generate the owner secrets

See [ADMIN_SETUP.md](ADMIN_SETUP.md). In PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "const c=require('crypto'),a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';console.log([...c.randomBytes(20)].map(b=>a[b%32]).join(''))"
```

The first value is `OWNER_TOTP_ENCRYPTION_KEY`, the second `OWNER_TOTP_SECRET`.
Put both, plus `OWNER_EMAIL` and `OWNER_PASSWORD`, into your local `.env` **and**
into Railway in step 4. They must match exactly — `owner:bootstrap` runs locally
and writes the account, while the deployed server decrypts it with the key from
Railway. A mismatch fails login with no useful error.

Add `OWNER_TOTP_SECRET` to your authenticator app now (manual entry, time-based).

### 2. Create the project and the database

In the Railway dashboard: **New Project → Deploy from GitHub repo**, pick
`oneBite`, branch `main`. Then **New → Database → Add PostgreSQL** in the same
project.

Railway reads `railway.json` for the build and start commands. Do not set them
in the UI as well.

### 3. Give the service a public URL

Railway does not expose a service publicly by default. Open the app service →
**Settings → Networking → Generate Domain**. You get something like
`onebite-production.up.railway.app`. Note it — steps 4 and 6 need it.

### 4. Set the environment variables

On the **app service** (not the database), Variables tab:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — a reference variable, typed literally. Railway resolves it to the private URL. |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | `https://<your-domain>` — exact, no trailing slash, never `*` |
| `SITE_ORIGIN` | same value |
| `OWNER_EMAIL` | from step 1 |
| `OWNER_PASSWORD` | from step 1 |
| `OWNER_TOTP_SECRET` | from step 1 |
| `OWNER_TOTP_ENCRYPTION_KEY` | from step 1 |

Do not set `PORT`; Railway injects it and `server/src/index.ts` reads it. Leave
`TRUST_PROXY` and `SERVE_CLIENT` unset — the defaults are what this layout wants.

### 5. Populate the database from your machine

`DATABASE_URL` above is Railway's *private* URL and is unreachable from your
laptop. For local commands use the database service's **`DATABASE_PUBLIC_URL`**,
found under the Postgres service → Variables.

```powershell
$env:DATABASE_URL="<DATABASE_PUBLIC_URL>"
npm.cmd run prisma:seed      # catalog, 7 delivery areas, 30-day capacity
npm.cmd run owner:bootstrap  # creates the owner account from .env
```

`railway.json` runs `npm run deploy:db` as Railway's pre-deploy command, so each
GitHub deploy syncs the Prisma schema before the new container starts. There is
no migrations directory — see the Schema Changes section of
[DEPLOYMENT.md](DEPLOYMENT.md).

### 6. Redeploy

`SITE_ORIGIN` is baked into `dist/sitemap.xml` during the build by
[`scripts/apply-site-origin.ts`](scripts/apply-site-origin.ts), so setting it in
step 4 has no effect until the app is rebuilt. Trigger a redeploy from the
Deployments tab. A restart is not enough.

### 7. Verify

1. `https://<your-domain>/api/v1/health` returns `{"ok":true}`.
2. The storefront loads and shows the catalog.
3. Log in at `/admin`, then **refresh the page**. Surviving the refresh is what
   proves the session cookie is working — that is the whole reason this is one
   service and not two.

## Known Constraints

Everything under "Known Constraints" in [DEPLOYMENT.md](DEPLOYMENT.md) still
applies, except the free-plan sleeping and the 30-day database expiry, which are
Render-specific. In particular the seeded capacity horizon is only 30 days, and
several seeded product images point at unrelated Unsplash photos.
