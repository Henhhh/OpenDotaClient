import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { ApiError } from "../../core/http.ts";
let active = 0;
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
async function bounded<T>(run: () => Promise<T>): Promise<T> {
  if (active >= 4)
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many authentication requests. Retry shortly.",
      5,
    );
  active++;
  try {
    return await run();
  } finally {
    active--;
  }
}
export const hashPassword = (password: string) =>
  bounded(async () => {
    const salt = randomBytes(16).toString("hex"),
      key = await derive(password, salt);
    return "scrypt$32768$" + salt + "$" + key.toString("hex");
  });
export const verifyPassword = (password: string, stored: string | null) =>
  bounded(async () => {
    // Fixed dummy derivation gives unknown accounts the same expensive work.
    const valid =
      stored !== null &&
      /^scrypt\$32768\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored);
    const parts = valid
      ? stored!.split("$")
      : ["", "", "0".repeat(32), "0".repeat(128)];
    const key = await derive(password, parts[2]),
      expected = Buffer.from(parts[3], "hex");
    return timingSafeEqual(key, expected) && valid;
  });
