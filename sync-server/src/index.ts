import { Server } from "@hocuspocus/server";
import { verifySyncToken } from "./auth";

/**
 * SyncDocs real-time collaboration relay.
 *
 * ROLE IN THE ARCHITECTURE
 * ------------------------
 * This is a low-latency RELAY: it propagates Yjs updates between connected
 * clients in real time. Durable persistence is handled by the Next.js app
 * (HTTP `/sync` → Postgres `DocumentState`), so this server is intentionally
 * stateless/in-memory and can scale or restart without data loss — clients
 * re-hydrate from the app's HTTP state endpoint and re-broadcast.
 *
 * SECURITY
 *  - Every connection must present a valid sync token (see src/auth.ts). The
 *    token is checked against the requested document, so a user can only join
 *    a document they were granted access to.
 *  - VIEWERS connect read-only: Hocuspocus drops any update they try to send,
 *    enforcing the RBAC rule that viewers cannot push state — at the protocol
 *    level, independent of the UI.
 */

const port = Number(process.env.PORT ?? 1234);

const server = Server.configure({
  port,

/// Hocuspocus calls this hook when a client connects and presents a sync token.
  async onAuthenticate(data) {
    const claims = await verifySyncToken(data.token);

    // The token must grant access to THIS document.
    if (claims.doc !== data.documentName) {
      throw new Error("Token does not grant access to this document.");
    }

    // Viewers may observe live changes but never broadcast their own.
    if (claims.role === "VIEWER") {
      data.connection.readOnly = true;
    }

    // Stored on the connection context (available to later hooks / presence).
    return { userId: claims.sub, role: claims.role, name: claims.name };
  },

  async onListen() {
    // eslint-disable-next-line no-console
    console.log(`[sync-server] listening on :${port}`);
  },
});

server.listen();
