# Deployment Notes

## Required Environment

- `DATABASE_URL`: production PostgreSQL connection string.
- `CLIENT_ORIGIN`: exact storefront origin, for example `https://www.onebite.example`.
- `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_TOTP_SECRET`, `OWNER_TOTP_ENCRYPTION_KEY`: owner dashboard auth.
- `SITE_ORIGIN`: replace `https://onebite.example` in `public/sitemap.xml` before deploying.

`CLIENT_ORIGIN` cannot be `*`. Owner auth uses credentialed CORS so browser cookies can travel to the API.

## Object Storage

Product and category image URLs are currently external URLs stored in PostgreSQL. Production uploads should use object storage, such as S3/R2/Supabase Storage, with database rows storing the resulting public or signed URL.

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

The test command now refuses to run without `TEST_DATABASE_URL`, so CI needs a disposable PostgreSQL database.

## Release Order

1. Apply the manual SQL migrations in `server/prisma/manual-migrations/`.
2. Run `npm run prisma:generate`.
3. Run `npm run build`.
4. Bootstrap the owner with `npm run owner:bootstrap`.
5. Deploy the API and storefront with `CLIENT_ORIGIN` set to the real storefront URL.
