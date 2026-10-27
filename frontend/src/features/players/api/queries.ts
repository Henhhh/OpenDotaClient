import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiGet, type Page } from "@/shared/api/client";
export const validId = (id: string) => /^[1-9]\d{0,19}$/.test(id);
export const validAccount = (id: string) =>
  validId(id) && BigInt(id) <= 4294967295n;
export type Params = Record<string, string | number | undefined>;
export function usePlayerApi<T>(
  path: string,
  params: Params = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["part1", path, params],
    queryFn: ({ signal }) => apiGet<T>(path, params, signal),
    enabled,
    retry: false,
    staleTime: 60000,
  });
}
export function usePlayerPages<T>(
  path: string,
  params: Params = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ["part1", "pages", path, params],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      apiGet<Page<T>>(
        path,
        { limit: 20, ...params, offset: pageParam },
        signal,
      ),
    getNextPageParam: (last) =>
      last.data.has_more ? last.data.offset + last.data.limit : undefined,
    enabled,
    retry: false,
    staleTime: 60000,
  });
}
