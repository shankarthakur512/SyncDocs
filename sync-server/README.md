# SyncDocs — Real-time Sync Server

A standalone WebSocket relay (built on [Hocuspocus](https://hocuspocus.dev), 
It is deployed **separately** from the Next.js app because Vercel's serverless
runtime cannot hold persistent WebSocket connections.


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


Deployed on Render (separately)
After deploy, point the Vercel app at it (secure scheme):



> Note: Render free web services sleep after inactivity; the first connection
> after idle may take a few seconds to wake. The client reconnects automatically.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Watch + run locally |
| `npm start` | Run (production) |
| `npm run typecheck` | Type-check |
