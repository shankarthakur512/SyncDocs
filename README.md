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
npm run dev                 # open http://localhost:3000
```
