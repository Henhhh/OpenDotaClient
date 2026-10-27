import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/shared/api/client";
import type {
  Page,
  Hero,
  HeroDetail,
  HeroStats,
  HeroMatchup,
  HeroRanking,
  Item,
  ItemPopularity,
  Success,
} from "@/shared/api/client";
export function useApi<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["part2", path, params],
    queryFn: ({ signal }) => apiGet<T>(path, params, signal),
    enabled,
    staleTime: 60000,
    retry: false,
  });
}
export function useHeroList(
  params: Record<string, string | number | undefined>,
) {
  return useInfiniteQuery({
    queryKey: ["part2", "heroes", params],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      apiGet<Page<Hero>>(
        "/heroes",
        { ...params, limit: 40, offset: pageParam },
        signal,
      ),
    getNextPageParam: (last) =>
      last.data.has_more ? last.data.offset + last.data.limit : undefined,
    staleTime: 60000,
    retry: false,
  });
}
async function allPages<T>(
  path: string,
  signal: AbortSignal,
  params: Record<string, string | number | undefined> = {},
): Promise<Success<T[]>> {
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const result = await apiGet<Page<T>>(
      path,
      { ...params, limit: 100, offset },
      signal,
    );
    rows.push(...result.data.items);
    if (!result.data.has_more) return { data: rows, meta: result.meta };
    offset += 100;
    if (offset > 10000) throw new Error("Catalog exceeds supported size");
  }
}
export function useCatalog() {
  return useQuery({
    queryKey: ["part2", "hero-catalog"],
    queryFn: ({ signal }) => allPages<Hero>("/heroes", signal),
    staleTime: 3600000,
    retry: false,
  });
}
export function useStats(bracket?: number, enabled = true, sort = "picks") {
  return useQuery({
    queryKey: ["part2", "stats", bracket, sort],
    queryFn: ({ signal }) =>
      allPages<HeroStats>("/heroes/stats", signal, { bracket, sort }),
    enabled,
    staleTime: 60000,
    retry: false,
  });
}
export function useItems(enabled = true) {
  return useQuery({
    queryKey: ["part2", "items"],
    queryFn: ({ signal }) => allPages<Item>("/constants/items", signal),
    enabled,
    staleTime: 3600000,
    retry: false,
  });
}
export const useHero = (id: number) =>
  useApi<HeroDetail>(`/heroes/${id}`, {}, Number.isSafeInteger(id) && id > 0);
function usePaged<T>(path: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["part2", "paged", path],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      apiGet<Page<T>>(path, { limit: 40, offset: pageParam }, signal),
    getNextPageParam: (last) =>
      last.data.has_more ? last.data.offset + last.data.limit : undefined,
    enabled,
    staleTime: 60000,
    retry: false,
  });
}
export const useMatchups = (id: number, enabled: boolean) =>
  usePaged<HeroMatchup>(`/heroes/${id}/matchups`, enabled);
export const useRankings = (id: number, enabled: boolean) =>
  usePaged<HeroRanking>(`/heroes/${id}/rankings`, enabled);
export const usePopularity = (id: number, enabled = true) =>
  useApi<ItemPopularity>(`/heroes/${id}/items`, {}, enabled);
