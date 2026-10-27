import type { OpenDotaClient } from "../../shared/api-contract.ts";
import { openDatabase } from "./database/index.ts";
import { createSessionStore } from "./database/session-store.ts";
import { createParseJobStore } from "./database/parse-job-store.ts";
import { requireSession } from "./modules/auth/session.ts";
import { createTeamCatalogSearch } from "./modules/pro/team-search.ts";
import { createMeStore } from "./modules/me/store.ts";
import { createAuthService } from "./modules/auth/service.ts";
import type { AuthConfig } from "./modules/auth/service.ts";
import { createRouter as proRouter } from "./modules/pro/index.ts";
import { createRouter as meRouter } from "./modules/me/index.ts";
import { createRouter as authRouter } from "./modules/auth/index.ts";
import type { createSteamVerifier } from "./modules/auth/steam.ts";

/** Composition helper for the main app owner. Does not listen, register routes or create tokens. */
export function createPart3Foundation(options: {
  client: OpenDotaClient;
  databasePath: string;
  allowedWebOrigins: readonly string[];
  auth?: AuthConfig;
  verifySteam?: ReturnType<typeof createSteamVerifier>;
}) {
  const origins = new Set(options.allowedWebOrigins);
  for (const origin of origins) {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin)
      throw new Error(
        "Use exact HTTP(S) origins without paths or trailing slashes",
      );
  }
  const db = openDatabase(options.databasePath);
  const sessions = createSessionStore(db);
  const guard = requireSession(sessions, origins);
  const me = createMeStore(db);
  let auth: ReturnType<typeof createAuthService> | undefined;
  try {
    if (options.auth)
      auth = createAuthService(db, sessions, options.auth, options.verifySteam);
  } catch (error) {
    db.close();
    throw error;
  }
  return {
    teams: createTeamCatalogSearch(options.client),
    sessions,
    parseJobs: createParseJobStore(db),
    me,
    auth,
    proRouter: proRouter({ client: options.client }),
    meRouter: meRouter({ store: me, requireSession: guard }),
    authRouter: auth
      ? authRouter({
          service: auth,
          sessions,
          requireSession: guard,
          production: options.auth!.production,
          webOrigins: options.auth!.webOrigins,
        })
      : undefined,
    requireSession: guard,
    close: () => db.close(),
  };
}
