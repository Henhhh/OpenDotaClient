import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "@/features/auth/SessionProvider";
import {
  apiGet,
  apiRequest,
  ApiError,
  type Page,
  type Favorite,
  type Settings,
  type Notification,
  type FavoriteKind,
} from "@/shared/api/client";
export function useAccountQuery<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
) {
  const { session } = useSession(),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["account", session?.user.user_id, path, params],
    queryFn: ({ signal }) => apiGet<T>(path, params, signal),
    enabled: !!session,
    retry: false,
    staleTime: 30000,
  });
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401)
      void client.invalidateQueries({ queryKey: ["session"] });
  }, [query.error, client]);
  return query;
}
export function useAccountMutation<T, V>(action: (value: V) => Promise<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => client.invalidateQueries({ queryKey: ["account"] }),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401)
        void client.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
export function useFavorites() {
  const { session } = useSession(),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["account", session?.user.user_id, "favorites"],
    enabled: !!session,
    retry: false,
    staleTime: 30000,
    queryFn: async ({ signal }) => {
      const rows: Favorite[] = [];
      for (let offset = 0; offset <= 10000; offset += 100) {
        const result = await apiGet<Page<Favorite>>(
          "/me/favorites",
          { offset, limit: 100 },
          signal,
        );
        rows.push(...result.data.items);
        if (!result.data.has_more) return rows;
      }
      throw new Error("Too many favorites to load.");
    },
  });
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401)
      void client.invalidateQueries({ queryKey: ["session"] });
  }, [query.error, client]);
  return query;
}
export const setFavorite = (kind: FavoriteKind, id: string, remove: boolean) =>
  apiRequest<Favorite>(`/me/favorites/${kind}/${id}`, {
    method: remove ? "DELETE" : "PUT",
    body: {},
  });
export const useSettings = () => useAccountQuery<Settings>("/me/settings");
export const useUnread = () =>
  useAccountQuery<Page<Notification>>("/me/notifications", {
    unread: "true",
    limit: 1,
  });
