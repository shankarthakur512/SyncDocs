# SyncDocs — Real-time Sync Server

A standalone WebSocket relay (built on [Hocuspocus](https://hocuspocus.dev), the
Yjs backend) that propagates document edits between collaborators in real time.

It is deployed **separately** from the Next.js app because Vercel's serverless
runtime cannot hold persistent WebSocket connections.

## What it does (and doesn't)

- ✅ Relays Yjs CRDT updates between connected clients with sub-second latency.
- ✅ Authenticates every connection with a signed, document-scoped access token.
- ✅ Enforces RBAC at the protocol level: **viewers connect read-only** and
  cannot broadcast changes.
- ❌ Does **not** own durable storage — persistence lives in the Next.js app
  (`/api/documents/[id]/sync` → Postgres). This relay is stateless and safe to
  restart/scale; clients re-hydrate from the app's HTTP state endpoint.

## How auth works

1. The browser asks the Next.js app for a short-lived **sync token**
   (`GET /api/documents/:id/sync-token`). The app checks the user's membership
   and signs a JWT `{ sub: userId, doc: documentId, role }` with
   `SYNC_JWT_SECRET`.
2. The browser opens a WebSocket here, passing that token.
3. This server verifies the signature with the **same** `SYNC_JWT_SECRET`,
   confirms the token is for the requested document, and (for viewers) marks the
   connection read-only. No database access required.

> `SYNC_JWT_SECRET` **must be identical** in this server and the Next.js app.

## Run locally

```bash
cp .env.example .env        # set SYNC_JWT_SECRET to match the app
npm install
npm run dev                 # ws://localhost:1234
```

In the Next.js app's `.env`, set:

```
NEXT_PUBLIC_SYNC_WS_URL="ws://localhost:1234"
SYNC_JWT_SECRET="<same value as here>"
```

## Deploy on Render (recommended)

This service lives in a subfolder of the repo but deploys on its own — Render's
**Root Directory** setting builds only this folder.

**Option A — Blueprint (one click):** the repo root has a `render.yaml`. In
Render: **New → Blueprint → select this repo**. It creates the service with
`rootDir: sync-server`. Then set `SYNC_JWT_SECRET` in the dashboard.

**Option B — manual:**
1. **New → Web Service**, select the repo.
2. **Root Directory:** `sync-server`
3. **Build:** `npm install` · **Start:** `npm start`
4. **Env:** `SYNC_JWT_SECRET` = same value as the Next.js app.
   (`PORT` is injected by Render automatically.)
5. Health check path: `/` (Hocuspocus answers HTTP 200 there).

After deploy, point the Vercel app at it (secure scheme):

```
NEXT_PUBLIC_SYNC_WS_URL="wss://<your-service>.onrender.com"
```

> Note: Render free web services sleep after inactivity; the first connection
> after idle may take a few seconds to wake. The client reconnects automatically.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Watch + run locally |
| `npm start` | Run (production) |
| `npm run typecheck` | Type-check |
