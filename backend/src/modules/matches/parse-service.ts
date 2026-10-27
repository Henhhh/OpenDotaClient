import { z } from "zod";
import type {
  OpenDotaClient,
  ParseJobStore,
  ParseJob,
} from "../../../../shared/api-contract.ts";
import { ApiError, type Context } from "../../core/http.ts";
import { UpstreamError } from "../../integrations/opendota/errors.ts";
import { rawId } from "./schemas.ts";
import { MatchesService } from "./service.ts";
const posted = z.object({ job: z.object({ jobId: rawId }) });
const jobSchema = z
  .object({
    id: rawId.optional(),
    jobId: rawId.optional(),
    type: z.string().optional(),
    state: z.string().optional(),
    status: z.string().optional(),
    data: z.object({ match_id: rawId }).passthrough().optional(),
  })
  .passthrough()
  .nullable();
type OnCompleted = (job: ParseJob, userId: string) => void;
export class ParseService {
  private client: OpenDotaClient;
  private store: ParseJobStore;
  private matches: MatchesService;
  private onCompleted: OnCompleted;
  private polls = new Map<string, { at: number; promise: Promise<ParseJob> }>();
  constructor(
    client: OpenDotaClient,
    store: ParseJobStore,
    matches: MatchesService,
    onCompleted: OnCompleted = () => {},
  ) {
    this.client = client;
    this.store = store;
    this.matches = matches;
    this.onCompleted = onCompleted;
  }
  async request(
    matchId: string,
    userId: string,
    context: Context,
  ): Promise<ParseJob> {
    const match = await this.matches.raw(matchId, context, true);
    const reservation = await this.store.reserve(matchId, userId);
    if (typeof match.data.version === "number" && match.data.version > 0) {
      const completed = await this.store.update(reservation.job.job_id, {
        status: "completed",
        error: null,
        poll_after_seconds: 5,
      });
      this.onCompleted(completed, userId);
      return completed;
    }
    if (!reservation.created) return reservation.job;
    const jobId = reservation.job.job_id;
    try {
      const submitted = await this.client.post(
        `/request/${matchId}`,
        {},
        { ...context, validate: (raw) => posted.parse(raw) },
      );
      await this.store.setUpstreamJobId(jobId, submitted.data.job.jobId);
      return (await this.store.getForUser(jobId, userId))!;
    } catch (error) {
      const current = await this.store.getForUser(jobId, userId);
      if (current?.status === "completed") {
        this.onCompleted(current, userId);
        return current;
      }
      if (current?.status === "failed") return current;
      const rejected =
        error instanceof UpstreamError &&
        (error.kind === "rate_limited" ||
          error.kind === "not_found" ||
          error.status === 400 ||
          error.status === 403);
      await this.store.update(jobId, {
        status: rejected ? "failed" : "unknown",
        error: rejected
          ? "Parse request rejected by upstream."
          : "Submission result is uncertain; check this job before requesting again.",
        poll_after_seconds: 5,
      });
      throw error;
    }
  }
  async get(
    jobId: string,
    userId: string,
    context: Context,
  ): Promise<ParseJob> {
    const job = await this.store.getForUser(jobId, userId);
    if (!job) throw new ApiError(404, "NOT_FOUND", "Parse job not found");
    if (job.status === "completed" || job.status === "failed") {
      if (job.status === "completed") this.onCompleted(job, userId);
      return job;
    }
    const cached = this.polls.get(jobId);
    if (cached && Date.now() - cached.at < 5000) {
      // Each caller retains its own cancellation/deadline, independent of the first poll.
      return job;
    }
    const promise = this.poll(job, context);
    this.polls.set(jobId, { at: Date.now(), promise });
    if (this.polls.size > 1000)
      this.polls.delete(this.polls.keys().next().value!);
    try {
      const current = await promise;
      if (current.status === "completed") this.onCompleted(current, userId);
      return current;
    } catch (error) {
      this.polls.delete(jobId);
      const current = await this.store.getForUser(jobId, userId);
      if (current?.status === "completed") {
        this.onCompleted(current, userId);
        return current;
      }
      if (current?.status === "failed") return current;
      throw error;
    }
  }
  private async poll(job: ParseJob, context: Context): Promise<ParseJob> {
    const match = await this.matches.raw(job.match_id, context, true);
    if (typeof match.data.version === "number" && match.data.version > 0)
      return this.store.update(job.job_id, {
        status: "completed",
        error: null,
        poll_after_seconds: 5,
      });
    const upstream = await this.store.getUpstreamJobId(job.job_id);
    if (!upstream)
      return this.store.update(job.job_id, {
        status: "unknown",
        error: "No upstream job ID is available; completion is not confirmed.",
        poll_after_seconds: 5,
      });
    let data: z.infer<typeof jobSchema>;
    try {
      const r = await this.client.get(
        `/request/${encodeURIComponent(upstream)}`,
        undefined,
        {
          ...context,
          ttl_seconds: 0,
          cache_namespace: "part1:parse-poll:v1",
          validate: (raw) => jobSchema.parse(raw),
        },
      );
      data = r.data;
    } catch (error) {
      if (error instanceof UpstreamError && error.kind === "not_found")
        data = null;
      else throw error;
    }
    if (data && (data.jobId ?? data.id) !== upstream)
      throw new UpstreamError("invalid_response");
    if (data?.data && data.data.match_id !== job.match_id)
      throw new UpstreamError("invalid_response");
    const state = data?.state ?? data?.status;
    const status: ParseJob["status"] =
      state === "failed"
        ? "failed"
        : state === "active" || state === "processing"
          ? "processing"
          : data &&
              (state === "waiting" ||
                state === "queued" ||
                (state === undefined && data.type === "parse"))
            ? "queued"
            : "unknown";
    return this.store.update(job.job_id, {
      status,
      error:
        status === "failed"
          ? "Upstream parse job failed."
          : status === "unknown"
            ? "Parse completion is not confirmed."
            : null,
      poll_after_seconds: 5,
    });
  }
}
