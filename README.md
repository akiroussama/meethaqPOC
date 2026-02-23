# E-Commerce Backend POC (NestJS + Prisma + PostgreSQL)

## Installation
1. `cp .env.example .env`
2. `npm install`
3. `docker compose up -d db`
4. `npm run prisma:generate`
5. `npm run prisma:migrate`
6. `npm run prisma:seed`
7. `npm run start:dev`

Swagger docs: `http://localhost:3000/docs`

## API endpoints (planned module routing)
- `/auth/*` JWT login/register
- `/users/*`
- `/products/*`
- `/inventory/*`
- `/pricing/*`
- `/promotions/*`
- `/cart/*`
- `/orders/*`
- `/payments/*`
- `/shipping/*`
- `/loyalty/*`
- `/notifications/*`

## Business rules implemented (matching specification)
1. VAT by category + TTC display + HT calculations.
2. Quantity-based pricing tiers.
3. Cost-price floor protection.
4. Promo validation and application constraints.
5. Flash-sale interactions in pricing engine.
6. Cart constraints (distinct lines, quantity cap, expiration).
7. Stock reservation model and release on expiry.
8. Order lifecycle transitions + cancellation eligibility.
9. Refund policy (DELIVERED only, 30 days, partial).
10. Shipping price engine (zones, weight, free-shipping).
11. Loyalty point accrual logic.
12. Loyalty tier thresholds.
13. Points usage cap (30% max of cart).
14. Low-stock behavior hooks in inventory service.
15. Role and status enums + architecture hooks for permissions.

## Tests
- Unit tests per critical service module (`pricing`, `promotions`, `cart`, `orders`, `shipping`, `loyalty`).
- Integration test for `cart -> order -> delivery -> refund` flow.

Run all tests: `npm test`

## CBC Analysis (Phase 2)

### Files
- `.cbc/constitution.yaml`: corpus complet des règles métier.
- `.cbc/jurisprudence.yaml`: cas positifs/négatifs/edge de référence.
- `.cbc/cadastre.yaml`: mapping règles ↔ chemins de code.
- `.cbc/config.yaml`: configuration modèle et analyse.

### Commandes
```bash
# Analyser une branche
npx ts-node scripts/cbc-analyze.ts --branch bug/tax-rate-hygiene

# Analyser toutes les branches bug/*
npx ts-node scripts/cbc-analyze.ts --all

# Voir le prompt sans appeler l'API
npx ts-node scripts/cbc-analyze.ts --branch bug/tax-rate-hygiene --dry-run
```

### Prérequis
```bash
export ANTHROPIC_API_KEY=sk-...
```

Les rapports JSON sont générés dans `.cbc/reports/*.json`.
