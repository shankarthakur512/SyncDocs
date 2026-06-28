import { Server } from "@hocuspocus/server";
import { verifySyncToken } from "./auth";

/**
 * SyncDocs real-time collaboration relay.
  * This server is a relay for the Hocuspocus real-time collaboration protocol. It
 * does not store any data itself, but instead relays changes between clients and
 * the main SyncDocs backend (which stores the actual document data).
 */

const port = Number(process.env.PORT ?? 1234);

// Hocuspocus v4: instantiate the Server directly (the old `Server.configure`
// static was removed).
const server = new Server({
  port,

  // Hocuspocus calls this hook when a client connects and presents a sync token.
  async onAuthenticate(data) {
    const claims = await verifySyncToken(data.token);

    // The token must grant access to THIS document.
    if (claims.doc !== data.documentName) {
      throw new Error("Token does not grant access to this document.");
    }

    // Viewers may observe live changes but never broadcast their own.
    if (claims.role === "VIEWER") {
      data.connectionConfig.readOnly = true;
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
