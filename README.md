## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then fill in DATABASE_URL, AUTH_SECRET, Google creds…
npx auth secret             # generates AUTH_SECRET (or: openssl rand -base64 32)

# 3. Set up the database (Neon Postgres)
npm run db:generate         # generate Prisma client
npm run db:migrate          # create tables

# 4. Run
npm run dev                 # 
```

## Tests

```bash
npm test            # Vitest unit tests (CRDT merge, RBAC, validation)
npm run test:coverage
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and PR:

- **App:** `npm ci` → type-check → unit tests (coverage) → `next build`.
- **Sync-server:** install → type-check.

Continuous deployment: **Vercel** auto-deploys the app, **Render** auto-deploys
`sync-server/`. Enable branch protection requiring these checks to gate merges.

