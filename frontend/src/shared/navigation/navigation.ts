import { router } from "expo-router";
import type { Route } from "@/shared/navigation/types";

let navigationOrigin = "home";

export function setNavigationOrigin(origin: string) {
  navigationOrigin = origin;
}

export function go(name: string, params: Record<string, string | number> = {}) {
  const pathname = name === "home" ? "/" : `/${name}`;
  if (["home", "matches", "heroes", "pro", "profile"].includes(name)) {
    router.navigate({ pathname: pathname as never, params });
    return;
  }
  router.push({
    pathname: pathname as never,
    params: { origin: navigationOrigin, ...params },
  });
}

export function openRoute(r: Route) {
  const { name, ...rest } = r;
  go(
    name,
    Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Record<string, string | number>,
  );
}
