import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { ParseJob, ParseJobStore } from '../../../shared/api-contract.ts';
import { transaction } from './index.ts';

const patchSchema = z.object({
  status: z.enum(['queued','processing','completed','failed','unknown']),
  error: z.string().max(1000).nullable(),
  poll_after_seconds: z.number().int().min(5),
}).strict();
const columns = 'job_id,match_id,status,error,poll_after_seconds';
export function createParseJobStore(db: DatabaseSync): ParseJobStore {
  return {
    async reserve(match_id, user_id) {
      if (!/^[1-9][0-9]{0,19}$/.test(match_id)) throw new Error('Invalid match ID');
      return transaction(db, () => {
        let job = db.prepare(`SELECT ${columns} FROM parse_jobs WHERE match_id=? AND status IN ('queued','processing','unknown')`).get(match_id) as unknown as ParseJob | undefined;
        const created = !job;
        if (!job) {
          job = { job_id: randomUUID(), match_id, status: 'queued', error: null, poll_after_seconds: 5 };
          db.prepare('INSERT INTO parse_jobs(job_id,match_id,status,created_at) VALUES (?,?,?,?)').run(job.job_id, match_id, job.status, new Date().toISOString());
        }
        db.prepare('INSERT INTO parse_job_users VALUES (?,?) ON CONFLICT DO NOTHING').run(job.job_id, user_id);
        return { job, created };
      });
    },
    async getForUser(job_id, user_id) {
      return (db.prepare(`SELECT ${columns} FROM parse_jobs WHERE job_id=? AND EXISTS (SELECT 1 FROM parse_job_users WHERE job_id=parse_jobs.job_id AND user_id=?)`).get(job_id, user_id) as unknown as ParseJob) ?? null;
    },
    async update(job_id, patch) {
      const p = patchSchema.parse(patch);
      return transaction(db, () => {
        const previous = db.prepare('SELECT status FROM parse_jobs WHERE job_id=?').get(job_id);
        if (!previous) throw new Error('Parse job not found');
        if (['completed','failed'].includes(String(previous.status)) && p.status !== previous.status) throw new Error('Terminal parse job cannot be reopened');
        db.prepare('UPDATE parse_jobs SET status=?,error=?,poll_after_seconds=? WHERE job_id=?').run(p.status, p.error, p.poll_after_seconds, job_id);
        return db.prepare(`SELECT ${columns} FROM parse_jobs WHERE job_id=?`).get(job_id) as unknown as ParseJob;
      });
    },
    async setUpstreamJobId(job_id, upstream_job_id) {
      if (!upstream_job_id.length || upstream_job_id.length > 128) throw new Error('Invalid upstream job ID');
      const result = db.prepare('UPDATE parse_jobs SET upstream_job_id=? WHERE job_id=? AND (upstream_job_id IS NULL OR upstream_job_id=?)').run(upstream_job_id, job_id, upstream_job_id);
      if (!result.changes) throw new Error('Parse job missing or upstream ID already assigned');
    },
    async getUpstreamJobId(job_id) {
      const row = db.prepare('SELECT upstream_job_id FROM parse_jobs WHERE job_id=?').get(job_id);
      return row?.upstream_job_id == null ? null : String(row.upstream_job_id);
    },
  };
}
