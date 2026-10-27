import { randomUUID } from "node:crypto";
import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type {
  Favorite,
  FavoriteKind,
  Notification,
  Settings,
  SettingsPatch,
} from "../../../../shared/api-contract.ts";
import { compareId, ApiError } from "../../core/http.ts";
import { transaction } from "../../database/index.ts";
type Row = Record<string, SQLOutputValue>;
const notification = (r: Row): Notification => ({
  notification_id: String(r.notification_id),
  kind: r.kind as Notification["kind"],
  title: String(r.title),
  body: String(r.body),
  created_at: String(r.created_at),
  read_at: r.read_at == null ? null : String(r.read_at),
  target:
    r.target_kind == null
      ? null
      : {
          kind: r.target_kind as NonNullable<Notification["target"]>["kind"],
          entity_id: String(r.target_id),
        },
});
export function createMeStore(
  db: DatabaseSync,
  now = () => new Date().toISOString(),
) {
  const settings = (user: string): Settings => {
    const r = db.prepare("SELECT * FROM settings WHERE user_id=?").get(user);
    if (!r) throw new ApiError(404, "NOT_FOUND", "User not found");
    return {
      theme: r.theme as Settings["theme"],
      language: r.language as Settings["language"],
      in_app_notifications: !!r.in_app_notifications,
    };
  };
  return {
    settings,
    patchSettings(user: string, patch: SettingsPatch) {
      return transaction(db, () => {
        const next = { ...settings(user), ...patch };
        db.prepare(
          "UPDATE settings SET theme=?,language=?,in_app_notifications=? WHERE user_id=?",
        ).run(
          next.theme,
          next.language,
          Number(next.in_app_notifications),
          user,
        );
        return next;
      });
    },
    favorites(user: string, kind?: FavoriteKind): Favorite[] {
      const rows = db
        .prepare(
          "SELECT kind,entity_id,created_at FROM favorites WHERE user_id=?",
        )
        .all(user)
        .map((r) => ({
          kind: r.kind as FavoriteKind,
          entity_id: String(r.entity_id),
          created_at: String(r.created_at),
        }));
      return rows
        .filter((r) => !kind || r.kind === kind)
        .sort(
          (a, b) =>
            b.created_at.localeCompare(a.created_at) ||
            a.kind.localeCompare(b.kind) ||
            compareId(a.entity_id, b.entity_id),
        );
    },
    putFavorite(user: string, kind: FavoriteKind, id: string): Favorite {
      db.prepare(
        "INSERT INTO favorites VALUES (?,?,?,?) ON CONFLICT DO NOTHING",
      ).run(user, kind, id, now());
      const r = db
        .prepare(
          "SELECT created_at FROM favorites WHERE user_id=? AND kind=? AND entity_id=?",
        )
        .get(user, kind, id)!;
      return { kind, entity_id: id, created_at: String(r.created_at) };
    },
    deleteFavorite(user: string, kind: FavoriteKind, id: string) {
      db.prepare(
        "DELETE FROM favorites WHERE user_id=? AND kind=? AND entity_id=?",
      ).run(user, kind, id);
    },
    notifications(user: string, unread?: boolean) {
      return db
        .prepare("SELECT * FROM notifications WHERE user_id=?")
        .all(user)
        .filter((r) => unread === undefined || (r.read_at === null) === unread)
        .map(notification)
        .sort(
          (a, b) =>
            b.created_at.localeCompare(a.created_at) ||
            a.notification_id.localeCompare(b.notification_id),
        );
    },
    read(user: string, id: string): Notification {
      const r = db
        .prepare(
          "UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE notification_id=? AND user_id=? RETURNING *",
        )
        .get(now(), id, user);
      if (!r) throw new ApiError(404, "NOT_FOUND", "Notification not found");
      return notification(r);
    },
    notificationBoundary() {
      return Number(
        db
          .prepare(
            "SELECT COALESCE(MAX(rowid),0) AS boundary FROM notifications",
          )
          .get()!.boundary,
      );
    },
    readAll(user: string, boundary?: number) {
      const cutoff =
        boundary ??
        Number(
          db
            .prepare(
              "SELECT COALESCE(MAX(rowid),0) AS boundary FROM notifications",
            )
            .get()!.boundary,
        );
      return transaction(db, () => ({
        updated: Number(
          db
            .prepare(
              "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL AND rowid<=?",
            )
            .run(now(), user, cutoff).changes,
        ),
      }));
    },
    /** Internal event producer only. There is no HTTP endpoint to inject notification content. */
    notify(
      user: string,
      eventKey: string,
      event: Pick<Notification, "kind" | "title" | "body" | "target">,
    ): Notification | null {
      if (
        !eventKey ||
        eventKey.length > 256 ||
        !event.title.trim() ||
        event.title.length > 200 ||
        event.body.length > 4000
      )
        throw new Error("Invalid notification event");
      return transaction(db, () => {
        const existing = db
          .prepare(
            "SELECT * FROM notifications WHERE user_id=? AND event_key=?",
          )
          .get(user, eventKey);
        if (existing) return notification(existing);
        if (!settings(user).in_app_notifications) return null;
        db.prepare(
          "INSERT INTO notifications VALUES (?,?,?,?,?,?,?,?,?,?)",
        ).run(
          randomUUID(),
          user,
          eventKey,
          event.kind,
          event.title,
          event.body,
          now(),
          null,
          event.target?.kind ?? null,
          event.target?.entity_id ?? null,
        );
        return notification(
          db
            .prepare(
              "SELECT * FROM notifications WHERE user_id=? AND event_key=?",
            )
            .get(user, eventKey)!,
        );
      });
    },
  };
}
