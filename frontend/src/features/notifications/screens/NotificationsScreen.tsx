import { useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { AccountGate } from "@/features/auth/AccountGate";
import { useSession } from "@/features/auth/SessionProvider";
import { useAccountMutation, useUnread } from "@/features/account/api";
import {
  apiGet,
  ApiError,
  apiRequest,
  type Page,
  type Notification,
} from "@/shared/api/client";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Button } from "@/shared/ui/Button";
import { Txt } from "@/shared/ui/Txt";
import { Notice } from "@/shared/ui/Notice";
import { ApiState } from "@/shared/ui/ApiState";
import { C } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
function AccountNotifications() {
  const { session } = useSession(),
    [filter, setFilter] = useState("All"),
    unread = useUnread(),
    client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["account", session?.user.account_id, "notifications", filter],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      apiGet<Page<Notification>>(
        "/me/notifications",
        {
          offset: pageParam,
          limit: 20,
          unread:
            filter === "Unread"
              ? "true"
              : filter === "Read"
                ? "false"
                : undefined,
        },
        signal,
      ),
    getNextPageParam: (last) =>
      last.data.has_more ? last.data.offset + last.data.limit : undefined,
    enabled: !!session,
    retry: false,
  });
  const read = useAccountMutation((id: string) =>
      apiRequest<Notification>(`/me/notifications/${id}`, {
        method: "PATCH",
        body: { read: true },
      }),
    ),
    all = useAccountMutation(() =>
      apiRequest("/me/notifications/read-all", { method: "POST", body: {} }),
    );
  const rows = query.data?.pages.flatMap((p) => p.data.items) ?? [];
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401)
      void client.invalidateQueries({ queryKey: ["session"] });
  }, [query.error, client]);
  return (
    <View style={{ gap: 12 }}>
      <Txt>{unread.data?.data.total ?? "—"} unread</Txt>
      <Button
        onPress={() => {
          if (!all.isPending) all.mutate(undefined);
        }}
      >
        {all.isPending ? "Saving…" : "Mark all read"}
      </Button>
      <Notice>
        In-app notifications from your account. Live match alerts and push
        notifications are not available yet.
      </Notice>
      <Choices
        items={["All", "Unread", "Read"]}
        value={filter}
        onChange={setFilter}
      />
      <ApiState
        pending={query.isPending}
        error={query.error}
        retry={() => {
          void query.refetch();
          void client.invalidateQueries({ queryKey: ["session"] });
        }}
      />
      {!query.isPending && !query.error && !rows.length && (
        <Txt>All caught up</Txt>
      )}
      {rows.map((n) => (
        <Pressable
          key={n.notification_id}
          onPress={() => {
            if (read.isPending) return;
            read.mutate(n.notification_id, {
              onSuccess: () => {
                if (n.target) go(n.target.kind, { id: n.target.entity_id });
              },
            });
          }}
        >
          <Card>
            <Txt bold color={n.read_at ? C.muted : C.text}>
              {n.title}
            </Txt>
            <Txt muted>{n.body}</Txt>
            <Txt muted size={10}>
              {new Date(n.created_at).toLocaleString()}
            </Txt>
          </Card>
        </Pressable>
      ))}
      {query.hasNextPage && (
        <Button
          onPress={() => {
            if (!query.isFetchingNextPage) void query.fetchNextPage();
          }}
        >
          Load more notifications
        </Button>
      )}
      {(read.error || all.error) && (
        <Notice>{(read.error ?? all.error)!.message}</Notice>
      )}
    </View>
  );
}
export function Notifications() {
  return (
    <AccountGate>
      <AccountNotifications />
    </AccountGate>
  );
}
