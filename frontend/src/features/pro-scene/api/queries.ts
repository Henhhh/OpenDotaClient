import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiGet, type Page } from "@/shared/api/client";
export function usePro<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: ["part3", path],
    queryFn: ({ signal }) => apiGet<T>(path, {}, signal),
    enabled,
    retry: false,
    staleTime: 60000,
  });
}
export function useProList<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ["part3", path, params],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      apiGet<Page<T>>(
        path,
        {
          ...params,
          offset: pageParam,
          limit: path.endsWith("/matches") ? 5 : 20,
        },
        signal,
      ),
    getNextPageParam: (last) =>
      last.data.has_more ? last.data.offset + last.data.limit : undefined,
    enabled,
    retry: false,
    staleTime: 60000,
  });
}
