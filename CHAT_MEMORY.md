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
- Owner: everything under `/owner`, in `server/src/owner-router.ts` — auth (`auth/login`, `auth/verify-totp`, `auth/logout`, `me`), orders (`orders`, `PATCH orders/:publicNumber`), and admin CRUD:
  - `categories`, `POST categories`, `PATCH categories/:id`
  - `products`, `products/:id`, `POST products`, `PATCH products/:id`
  - `POST products/:id/variants`, `PATCH variants/:id`, `POST products/:id/addons`, `PATCH addons/:id`
  - `delivery/areas`, `POST delivery/areas`, `PATCH delivery/areas/:id`
  - `delivery/slots?from&to&areaId`, `POST delivery/slots`, `PATCH delivery/slots/:id`, `DELETE delivery/slots/:id`, `POST delivery/slots/generate`
  - `production-capacity?from&to`, `PUT production-capacity`, `POST production-capacity/range`

Includes Zod validation, Helmet, CORS, per-route rate limiting, Pino HTTP logs, and request IDs.

- Owner auth is hand-rolled in `server/src/owner-auth.ts`: scrypt password hashing, AES-256-GCM-encrypted TOTP secrets, RFC-6238 TOTP, and DB-backed cookie sessions. Setup is documented in `ADMIN_SETUP.md`.
- `server/src/cart-service.ts` resolves cart lines into prices and capacity points and is the single source of that arithmetic; both `availability-service.ts` and `order-service.ts` use it. A variant **replaces** the product's capacity points and **adds** its price; add-ons and cake text add both. Lead time comes from the chosen variant.
- Orders snapshot product names, variant name, add-ons, cake text, allergens and unit price as text, so later catalog edits cannot change what the bakery reads.
- Writes use Serializable transactions with conditional `updateMany` guards on production points and slot capacity. `createReservedOrder` retries Postgres write conflicts (P2034/40001) and reports persistent contention as a 409, never a 500.
- Checkout quotes (`Quote`) and owner MFA challenges (`MfaChallenge`) are database rows, not in-process state, so an open checkout or half-finished login survives a restart and works behind more than one instance. Both are **claimed with a conditional update before** the work they authorise, so a quote cannot produce two orders and a challenge cannot be replayed.
- `server/src/owner-router.ts` mounts at `/api/v1/owner`; the session guard is one `router.use` after the auth routes. Handlers have no try/catch — Express 5 forwards a rejected promise to the app's error middleware, which is where `AdminError` (code + status) and `OrderLifecycleError` become responses. `server/src/http.ts` holds `validationError`, `unauthenticated` and `authLimiter`, shared with `app.ts`.
- `server/src/admin-service.ts` is all the admin write logic. Rules worth keeping:
  - Deletes are archive/deactivate only (`archivedAt`, `active`); nothing in the catalog is ever hard-deleted. Only an unreserved delivery slot can actually be removed.
  - A product's `capacityPoints` and `leadDays` are **derived** from its cheapest active variant whenever it has one. `PATCH /products/:id` silently drops those two fields in that case, and every variant write re-syncs them. This mirrors the seed rule.
  - A patch that ends up empty is answered from the row, because Prisma's `updateMany` matches nothing when handed no data and that would read as a 404.
  - Capacity and slot capacity can never be set below what is already reserved (409). Bulk fills skip such days instead of failing, and report them as `held`.
  - A delivery area with live orders cannot be renamed: orders store `areaName` as text and the reservation-release path looks the area back up by it.
  - P2002 becomes a 409 `CONFLICT` naming the duplicate, not a 500. Ranges are capped at 180 days.
- Expired sessions and old quotes are swept opportunistically — on successful login and on quote creation respectively. There is no scheduled job.

## Catalog

PostgreSQL is the single source of truth. `server/prisma/seed.ts` holds the whole catalog — 8 categories, 13 products with images, tags, servings, allergens and flags, and every product's variants, add-ons and cake-text limits — plus 7 Kuwait delivery areas and a 30-day capacity/slot horizon.

The storefront reads it through `src/stores/catalog.ts`, which fetches categories and products once per session and converts fils to KWD. `src/data.ts` now holds only shared types and the `img`/`money` helpers.

Seed rules worth keeping:

- A product's base `capacityPoints` and `leadDays` follow its **smallest** variant.
- Variants and add-ons use deterministic `seed-<slug>-<option>` ids, and the seed deletes options it no longer defines, so re-running it never leaves stale choices selectable.

## Bilingual English/Arabic

- Arabic is served from a `/ar` path prefix; English from the root. Routes are declared once in `src/router/index.ts` and mounted twice.
- **Every internal link must use `AppLink`, not `RouterLink`.** It prefixes paths from the active locale, which is what keeps a visitor browsing in Arabic inside Arabic. Programmatic navigation uses `localePath()`.
- Locale lives in `src/i18n/index.ts`, outside Pinia, because the router guard reads it before any component exists. It is derived from the path, applied to `<html lang/dir>` before mount, and remembered in localStorage.
- `src/i18n/en.ts` is the source of truth for the key set; `ar.ts` is typed against it, so a missing key fails the build.
- Catalog content is translated in `src/stores/catalog.ts` getters from the En/Ar column pairs. Products and categories expose `name` (active language) and `nameAlt` (the other), which drives the two-line treatment in both directions.
- Money, counts and dates go through `Intl` with an `ar-KW` locale, so Arabic pages use Arabic-Indic digits and the Arabic currency symbol.
- Server error messages are English. The API client throws `ApiError` carrying the error code and `src/i18n/errors.ts` translates from that code.
- RTL is mostly handled by `dir=rtl` on flex/grid. `src/style.css` covers the rest: Arabic typeface stack, directional rows, `.dir-icon` for arrows that mean forward/back, and `dir="auto"` on mixed-language lines.
- The owner dashboard (`/admin`) is deliberately English only — internal tool, not customer-facing. It is a tab shell in `src/views/Admin.vue` over `src/components/admin/`: `OrdersPanel`, `ProductsPanel`, `CategoriesPanel`, `DeliveryPanel`, `CapacityPanel`, with shared helpers in `admin-ui.ts`. Each panel is keyed on the active tab and loads its own data on mount, so switching tabs picks up another tab's writes. The owner types KWD; `toFils`/`toKwd` convert. Styles are the `.admin-*` block at the end of `src/style.css`.

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

`server/src/test-support/owner-session.ts` signs a throwaway owner in through the real login flow and returns the session cookie. Each test file passes its **own** email — files share one database and a shared owner would have its rows deleted mid-run. The admin tests work on dates ~120 days out, well clear of the seeded 30-day horizon the order tests reserve against.

Test files run **one at a time** (`fileParallelism: false`). They share one database and reserve real production capacity and delivery slots, so in parallel they contend for the same earliest slots and interleave with each other's cleanup. That produced two distinct flakes: valid orders coming back 409, and connection-pool exhaustion surfacing as 500. The suite takes about 36s as a result.

Any test that places an order **must release its capacity in `afterAll`** — the reservation, the order rows, `ProductionCapacity.usedPoints` and `DeliverySlot.reserved`. If slot counters ever drift, rebuild them from the active reservations rather than adjusting by hand:

```sql
UPDATE "DeliverySlot" s SET reserved = (
  SELECT count(*) FROM "Order" o
    JOIN "DeliveryArea" a ON a."nameEn" = o."areaName"
    JOIN "CapacityReservation" r ON r."orderId" = o.id AND r.active
   WHERE a.id = s."areaId" AND r.date = s.date
     AND o."deliveryWindow" = s."windowStart" || '–' || s."windowEnd");
```

## Known work remaining

- 2026-08-21 implementation pass: admin order lifecycle controls now set fulfilment and COD status and can cancel pending orders; gift details are sent with orders and shown in admin; categories explain the zero-product storefront visibility rule; client SEO now sets titles/descriptions/canonical/hreflang and `public/sitemap.xml` exists; `server:test` uses `TEST_DATABASE_URL` via `server/scripts/prepare-test-db.ts` and ran 43 tests in ~2.6s against `onebite_test`; promotions and content blocks now have Prisma models, manual migrations, owner API CRUD and a Marketing admin tab; checkout email now links orders to a customer `User` and stores a customer address, with schema foundations for server-side wishlist rows; pending tracking pages can cancel an order. `DEPLOYMENT.md` documents `CLIENT_ORIGIN`, object storage, CI and release order. Full customer auth/account UI and real checkout promotion application still need design work. In-app browser verification was attempted but the browser connector failed with a tool-side sandbox metadata error, so only build/API tests were verified.
- Full customer authentication/account UI is still not designed. Checkout email now links orders to users and stores addresses, but there is no customer login/session flow yet and wishlist sync still stays localStorage-only until that exists.
- Promotions can be administered, but they are not applied to checkout totals yet. That still needs business rules for eligible products, date windows, stacking, and COD receipt text.
- `server:test` now uses `TEST_DATABASE_URL`, but test files still run serially because they share seeded capacity/slot fixtures. Parallel test execution needs per-file fixture isolation.
- Admin browser verification is still not completed because the in-app browser connector failed during setup with a tool-side sandbox metadata error. Build and API tests are green.
- `public/sitemap.xml` uses the placeholder origin `https://onebite.example`; replace it with the real production domain before deployment.
- Several seeded products point at Unsplash photo IDs that resolve to unrelated images (a clock, a pile of sale tags). The image URLs are seed data, not code.
- `docker-compose.yml` is listed in `.gitignore` yet still tracked. It is the only database setup in the repo, so untracking it would leave a fresh clone unable to start PostgreSQL — decide deliberately whether to track it properly or document setup elsewhere.
- Object storage, CI service configuration, and production deployment are documented in `DEPLOYMENT.md` but not provisioned in an external platform.
