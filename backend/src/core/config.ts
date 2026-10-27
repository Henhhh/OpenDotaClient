import { z } from "zod";
import type { AuthConfig } from "../modules/auth/service.ts";
const bool = (value: string | undefined, fallback = false) =>
  z.enum(["true", "false"]).parse(value ?? String(fallback)) === "true";
const origin = z.string().refine((value) => {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) && u.origin === value;
  } catch {
    return false;
  }
}, "Use an exact HTTP(S) origin without a trailing slash");
const csv = (value: string) =>
  value.trim() === "" ? [] : value.split(",").map((v) => v.trim());
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const mode = z
    .enum(["development", "test", "production"])
    .parse(env.NODE_ENV ?? "development");
  const port = z
    .string()
    .regex(/^(0|[1-9]\d*)$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(65535))
    .parse(env.PORT ?? "3000");
  const host = z
    .string()
    .trim()
    .min(1)
    .refine((v) => !/[\s/]/.test(v))
    .parse(env.HOST ?? "127.0.0.1");
  const databasePath = z
    .string()
    .trim()
    .min(1)
    .parse(env.DATABASE_PATH ?? "./data/opendota.sqlite");
  const allowedWebOrigins = z
    .array(origin)
    .parse(
      csv(env.WEB_ORIGINS ?? "http://localhost:8081,http://127.0.0.1:8081"),
    );
  const enabled = bool(env.ENABLE_ACCOUNT_FEATURES);
  let auth: AuthConfig | undefined;
  if (enabled) {
    const publicBaseUrl = origin.parse(
      env.PUBLIC_BASE_URL ?? "http://localhost:3000",
    );
    if (mode === "production" && !publicBaseUrl.startsWith("https://"))
      throw new Error("Production auth requires an HTTPS PUBLIC_BASE_URL");
    auth = {
      production: mode === "production",
      webOrigins: allowedWebOrigins,
    };
  }
  return {
    mode,
    port,
    host,
    databasePath,
    allowedWebOrigins,
    auth,
    enableRankings: bool(env.ENABLE_HERO_RANKINGS),
    enableMatchParse: bool(env.ENABLE_MATCH_PARSE),
  };
}
