# One Bite Vue Frontend

Complete Vue 3 customer-facing frontend converted from the supplied Figma Make / React prototype.

## Stack
- Vue 3 + TypeScript
- Vue Router
- Pinia with localStorage cart and wishlist persistence
- Lucide Vue icons
- Vite

## Run
```bash
npm install
docker compose up -d postgres
npm run db:setup
npm run server:dev
```

In another terminal:

```bash
npm run dev
```

The catalog, delivery areas, slots, and capacity are seeded into PostgreSQL from
`server/prisma/seed.ts`. Update that seed whenever you change the shared product
data, then commit it so everyone who pulls the project gets the same database
state after running `npm run db:setup`.

## Build
```bash
npm run build
```

## Routes
Home, shop, categories, product detail, best sellers, seasonal collection, gift boxes, search, wishlist, cart, multi-step checkout, order tracking, profile, about, FAQ, contact, and 404.
