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

## Implemented frontend work

- Removed fabricated ratings, reviews, static category counts, card payment UI, free-delivery threshold messaging, and same-day delivery promises.
- Product pages now expose predefined size/variant choices, fixed packaging add-ons, and short cake-text UI.
- Checkout is COD-only and collects written delivery, recipient, gift, and delivery-window request data.
- Success UI says **Awaiting bakery confirmation** and does not claim an automated notification.
- Added a typed frontend API-client foundation at `src/api/client.ts`.

## Backend foundation

- Express API source is in `server/src/`.
- Implemented endpoints:
  - `GET /api/v1/health`
  - `GET /api/v1/catalog/categories`
  - `GET /api/v1/catalog/products`
  - `GET /api/v1/catalog/products/:slug`
  - `POST /api/v1/availability/earliest`
  - `POST /api/v1/checkout/quote`
  - `POST /api/v1/orders`
  - Tracking placeholders.
- Includes Zod validation, Helmet, CORS, rate limiting, Pino HTTP logs, and request IDs.
- Availability uses combined cart points and treats pending reservations as capacity-consuming.
- The API currently uses in-memory catalog and reservation data. Prisma persistence is the next required implementation step.

## PostgreSQL and Prisma

- Docker database service is configured in `docker-compose.yml`.
- Prisma schema: `server/prisma/schema.prisma`.
- Local environment: `.env` (ignored by Git). Its `DATABASE_URL` must match the password currently in `docker-compose.yml`.
- The local database has been initialized and verified with these 11 tables:
  `User`, `Category`, `Product`, `ProductVariant`, `ProductAddon`, `DeliveryArea`, `DeliverySlot`, `ProductionCapacity`, `Order`, `OrderItem`, and `CapacityReservation`.
- Verify tables:

  ```powershell
  docker compose exec postgres psql -U onebite -d onebite -c "\dt"
  ```

- Prisma CLI migration commands currently report a generic local **Schema engine error** on this Windows machine, even with valid schema and reachable PostgreSQL. The initial schema was therefore applied through Prisma-generated SQL (`prisma migrate diff ... --script`) piped to `psql`.
- Do not reset the Docker volume if it contains wanted data. `docker compose down -v` deletes the database volume.

## Verification completed

```powershell
npm.cmd run build
npm.cmd run server:test
```

Both passed after dependencies were installed.

## Git history from this work

- `e2bb108 feat: add one bite v1 storefront and api foundation`
- `abc3481 fix: configure local prisma postgres schema`

## Known work remaining

- Replace in-memory API data with real Prisma/PostgreSQL transactions and seeds.
- Add migrations/history strategy after resolving the local Prisma schema-engine issue.
- Owner authentication, secure sessions, mandatory 2FA, and audit logging.
- Admin dashboard and CRUD for catalog, capacity, delivery, promotions, content, reviews, and orders.
- Customer accounts, addresses, wishlists, true order tracking, cancellations, COD workflows, and reviews.
- Full English/Arabic localized routes and complete RTL behavior.
- SEO metadata/sitemap, object storage, CI, and deployment.

## Working-tree note

Generated `dist/`, `tsconfig.app.tsbuildinfo`, and tracked `node_modules` files may show as modified after local builds/dependency installation. They were intentionally not included in the focused commits above.
