import { router } from "expo-router";
import { routePath } from "./routes";

let navigationOrigin = "home";

export function setNavigationOrigin(origin: string) {
  navigationOrigin = origin;
}

export function go(name: string, params: Record<string, string | number> = {}) {
  const pathname = routePath(name);
  if (["home", "matches", "heroes", "pro", "profile"].includes(name)) {
    router.navigate({ pathname: pathname as never, params });
    return;
  }
  router.push({
    pathname: pathname as never,
    params: { origin: navigationOrigin, ...params },
  });
}
