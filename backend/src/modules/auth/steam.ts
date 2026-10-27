import { ApiError } from "../part2/http.ts";
const NS = "http://specs.openid.net/auth/2.0";
export const STEAM_ENDPOINT = "https://steamcommunity.com/openid/login";
export const opaqueToken = /^[A-Za-z0-9_-]{43}$/;
export interface SteamAssertion {
  account_id: string;
  nonce: string;
}
export function authorizationUrl(returnTo: string, realm: string) {
  const url = new URL(STEAM_ENDPOINT);
  url.search = new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  }).toString();
  return url.href;
}
/** Fixed Steam provider + direct check_authentication, never fetch a URL supplied by callback. */
export function createSteamVerifier(
  transport: typeof fetch = fetch,
  now = Date.now,
) {
  return async (
    params: Record<string, string>,
    expectedReturnTo: string,
  ): Promise<SteamAssertion> => {
    const fail = () =>
      new ApiError(401, "UNAUTHORIZED", "Invalid Steam assertion");
    if (
      params["openid.ns"] !== NS ||
      params["openid.mode"] !== "id_res" ||
      params["openid.op_endpoint"] !== STEAM_ENDPOINT ||
      params["openid.return_to"] !== expectedReturnTo
    )
      throw fail();
    const signed = new Set((params["openid.signed"] ?? "").split(","));
    for (const key of [
      "op_endpoint",
      "claimed_id",
      "identity",
      "return_to",
      "response_nonce",
      "assoc_handle",
    ])
      if (!signed.has(key) || !params[`openid.${key}`]) throw fail();
    const claimed = params["openid.claimed_id"];
    if (params["openid.identity"] !== claimed) throw fail();
    const match =
      /^https:\/\/steamcommunity\.com\/openid\/id\/([1-9][0-9]{16})$/.exec(
        claimed ?? "",
      );
    if (!match) throw fail();
    const account = BigInt(match[1]) - 76561197960265728n;
    if (account < 1n || account > 4294967295n) throw fail();
    const nonce = params["openid.response_nonce"];
    const timestamp = Date.parse(nonce.slice(0, 20));
    if (
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ.+$/.test(nonce) ||
      nonce.length > 255 ||
      !Number.isFinite(timestamp) ||
      Math.abs(now() - timestamp) > 300000
    )
      throw fail();
    const body = new URLSearchParams(
      Object.entries(params).filter(([k]) => k.startsWith("openid.")),
    );
    body.set("openid.mode", "check_authentication");
    let response: Response;
    try {
      response = await transport(STEAM_ENDPOINT, {
        method: "POST",
        body,
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ApiError(
        502,
        "UPSTREAM_ERROR",
        "Steam verification unavailable",
      );
    }
    if (!response.ok)
      throw new ApiError(
        502,
        "UPSTREAM_ERROR",
        "Steam verification unavailable",
      );
    let message: string;
    try {
      message = await response.text();
    } catch {
      throw new ApiError(
        502,
        "UPSTREAM_ERROR",
        "Steam verification unavailable",
      );
    }
    if (message.length > 16384 || !/^is_valid:true\r?$/m.test(message))
      throw fail();
    return { account_id: account.toString(), nonce };
  };
}
