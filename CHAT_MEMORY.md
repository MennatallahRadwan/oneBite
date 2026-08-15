# One Bite — Chat Memory

## Product decisions locked for V1

- Bilingual English/Arabic, Kuwait-only bakery storefront.
- Cash on delivery only. No cards, KNET, Apple Pay, deposits, or payment gateway.
- Catalog-only ordering with predefined variants, packaging add-ons, and optional short cake text.
- Guest checkout and optional customer accounts are intended.
- Delivery uses written Kuwait address fields and owner-managed areas/fees; no map pin.
- The owner confirms or rejects every order.
- Pending orders reserve production capacity indefinitely until confirmed, rejected, or cancelled.
- Availability is based on total cart capacity points, lead time, operating dates, ingredient availability, existing reservations, and delivery-slot capacity.
- Order, fulfilment, cancellation, and COD collection are independent states.
- No automated SMS, WhatsApp, email, browser push, recipe subscriptions, fake reviews, ratings, counts, or delivery promises.

## Stack

- Frontend: Vue 3 + Vite + vue-router + Pinia, hand-written CSS in `src/style.css`. No Tailwind, no i18n library.
- Backend: Express 5 + Zod + Prisma 6 + PostgreSQL, in `server/src/`.
- Tests: Vitest + supertest, integration only, in `server/src/*.test.ts`. They run against the **development database**.
- Single root `package.json`. Sources are formatted multi-line; the original single-line style was removed.

## Backend

Endpoints under `/api/v1`:

- `GET /health`
- `GET /catalog/categories` — bilingual names, descriptions, image, published-product count
- `GET /catalog/products`, `GET /catalog/products/:slug` — full storefront fields plus active variants and add-ons
- `GET /delivery/areas` — active areas with fees
- `POST /availability/earliest`, `POST /checkout/quote`, `POST /orders`
- `GET /tracking/:token`, `POST /tracking/lookup`
- Owner: `POST /owner/auth/login`, `POST /owner/auth/verify-totp`, `POST /owner/auth/logout`, `GET /owner/me`, `GET /owner/orders`, `PATCH /owner/orders/:publicNumber`

Includes Zod validation, Helmet, CORS, per-route rate limiting, Pino HTTP logs, and request IDs.

- Owner auth is hand-rolled in `server/src/owner-auth.ts`: scrypt password hashing, AES-256-GCM-encrypted TOTP secrets, RFC-6238 TOTP, and DB-backed cookie sessions. Setup is documented in `ADMIN_SETUP.md`.
- `server/src/cart-service.ts` resolves cart lines into prices and capacity points and is the single source of that arithmetic; both `availability-service.ts` and `order-service.ts` use it. A variant **replaces** the product's capacity points and **adds** its price; add-ons and cake text add both. Lead time comes from the chosen variant.
- Orders snapshot product names, variant name, add-ons, cake text, allergens and unit price as text, so later catalog edits cannot change what the bakery reads.
- Writes use Serializable transactions with conditional `updateMany` guards on production points and slot capacity.

## Catalog

PostgreSQL is the single source of truth. `server/prisma/seed.ts` holds the whole catalog — 8 categories, 13 products with images, tags, servings, allergens and flags, and every product's variants, add-ons and cake-text limits — plus 7 Kuwait delivery areas and a 30-day capacity/slot horizon.

The storefront reads it through `src/stores/catalog.ts`, which fetches categories and products once per session and converts fils to KWD. `src/data.ts` now holds only shared types and the `img`/`money` helpers.

Seed rules worth keeping:

- A product's base `capacityPoints` and `leadDays` follow its **smallest** variant.
- Variants and add-ons use deterministic `seed-<slug>-<option>` ids, and the seed deletes options it no longer defines, so re-running it never leaves stale choices selectable.

## PostgreSQL and Prisma

- Docker database service is configured in `docker-compose.yml` (untracked; it is in `.gitignore`).
- Prisma schema: `server/prisma/schema.prisma`. Local environment: `.env` (ignored by Git); see `.env.example`.
- Verify tables:

  ```powershell
  docker compose exec postgres psql -U onebite -d onebite -c "\dt"
  ```

- Prisma CLI **migrate** commands report a generic local **Schema engine error** on this Windows machine. Schema changes are therefore applied as SQL scripts kept in `server/prisma/manual-migrations/`:

  ```powershell
  npx prisma migrate diff --from-schema-datasource server/prisma/schema.prisma --to-schema-datamodel server/prisma/schema.prisma --script > server\prisma\manual-migrations\<name>.sql
  docker compose exec -T postgres psql -U onebite -d onebite -v ON_ERROR_STOP=1 < server\prisma\manual-migrations\<name>.sql
  npm.cmd run prisma:generate
  ```

  Re-running the diff afterwards should print an empty migration; that is the drift check.

- `prisma generate` fails with `EPERM` while any `npm run server:dev` process is running, because it holds the query-engine DLL. Stop the dev server first.
- Do not reset the Docker volume if it contains wanted data. `docker compose down -v` deletes it.

## Verification

```powershell
npm.cmd run build
npm.cmd run server:test
```

`server:test` seeds the development database first, so seed changes must stay idempotent upserts.

## Known work remaining

- Full English/Arabic localized routes and complete RTL behavior. The backend already stores both languages; the storefront renders only English and has no locale toggle.
- Customer accounts, addresses, wishlist sync, cancellations, and COD workflows. `Order.userId` is always null and the wishlist is localStorage-only.
- Admin CRUD beyond order confirm/reject: catalog, production capacity, delivery areas and slots, promotions, content.
- The checkout quote store and the MFA challenge store are in-process `Map`s in `app.ts` and `owner-auth.ts`. They do not survive a restart and break with more than one instance; both belong in the database.
- Expired sessions are never purged.
- The API's error handler swallows the error without logging it.
- Gift details collected at checkout are still not sent to the bakery, and the UI says so.
- CORS does not set `credentials: true` and the API client does not send `credentials: 'include'`, so owner auth only works same-origin through the Vite dev proxy.
- SEO metadata/sitemap, object storage, CI, and deployment.
- `dist/` and `node_modules/` are tracked in Git and always show as modified. Stage commits with explicit paths; never `git add -A`.
