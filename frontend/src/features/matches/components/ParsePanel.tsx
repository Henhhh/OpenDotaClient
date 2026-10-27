import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError, type ParseJob } from "@/shared/api/client";
import { useSession } from "@/features/auth/SessionProvider";
import { ApiState } from "@/shared/ui/ApiState";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Notice } from "@/shared/ui/Notice";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
export function ParsePanel({ id }: { id: string }) {
  const { session } = useSession(),
    client = useQueryClient();
  const owner = session?.user.user_id ?? "guest";
  const remembered = useMemo(
    () => ["account", "parse-active", owner, id],
    [owner, id],
  );
  const [job, setJob] = useState<ParseJob | null>(
    () => client.getQueryData<ParseJob>(remembered) ?? null,
  );
  const [stopped, setStopped] = useState(false),
    notified = useRef("");
  const submit = useMutation({
    mutationFn: () =>
      apiRequest<ParseJob>(`/matches/${id}/parse`, {
        method: "POST",
        body: {},
      }),
    retry: false,
    onSuccess: (r) => {
      setJob(r.data);
      client.setQueryData(remembered, r.data);
      setStopped(false);
    },
  });
  const poll = useQuery({
    queryKey: ["account", "parse-job", owner, job?.job_id],
    queryFn: ({ signal }) =>
      apiRequest<ParseJob>(`/parse-jobs/${job!.job_id}`, { signal }),
    enabled:
      !!session &&
      !!job &&
      !stopped &&
      job.status !== "completed" &&
      job.status !== "failed",
    refetchInterval: (q) =>
      q.state.error ||
      q.state.data?.data.status === "completed" ||
      q.state.data?.data.status === "failed"
        ? false
        : Math.max(
            5,
            q.state.data?.data.poll_after_seconds ??
              job?.poll_after_seconds ??
              5,
          ) * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const current = poll.data?.data ?? job;
  const error = submit.error ?? poll.error;
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401)
      void client.invalidateQueries({ queryKey: ["session"] });
  }, [error, client]);
  useEffect(() => {
    if (!job) return;
    const timer = setTimeout(() => setStopped(true), 120000);
    return () => clearTimeout(timer);
  }, [job]);
  useEffect(() => {
    if (!current) return;
    client.setQueryData(remembered, current);
    if (current.status === "completed" && notified.current !== current.job_id) {
      notified.current = current.job_id;
      void client.invalidateQueries({ queryKey: ["part1"] });
      void client.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "account" && q.queryKey[2] === "/me/notifications",
      });
    }
  }, [current, client, remembered]);
  if (!session)
    return (
      <Card>
        <Txt muted>Sign in to request match parsing.</Txt>
        <Button onPress={() => go("settings")}>Account settings</Button>
      </Card>
    );
  return (
    <Card>
      <Txt bold>Match parsing</Txt>
      <ApiState
        error={submit.error ?? poll.error}
        retry={() => {
          if (current) void poll.refetch();
          else submit.reset();
        }}
      />
      {current && (
        <>
          <Txt>Parse status: {current.status}</Txt>
          {current.error && <Txt muted>{current.error}</Txt>}
          <Txt muted>Job {current.job_id}</Txt>
        </>
      )}
      {(!current || current.status === "failed") && (
        <Button
          onPress={() => {
            if (!submit.isPending) submit.mutate();
          }}
        >
          {submit.isPending ? "Requesting parse…" : "Request parse"}
        </Button>
      )}
      {(current?.status === "unknown" || stopped) && (
        <Notice>
          {stopped
            ? "Automatic polling stopped after 2 minutes."
            : "Submission or completion is not yet confirmed."}{" "}
          Checking status does not submit a new parse request.
        </Notice>
      )}
      {current &&
        current.status !== "completed" &&
        current.status !== "failed" && (
          <Button
            onPress={() => {
              if (!poll.isFetching) void poll.refetch();
            }}
          >
            Check parse status
          </Button>
        )}
    </Card>
  );
}
