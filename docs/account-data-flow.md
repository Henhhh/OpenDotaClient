# Favorites, settings and notifications

Private account screens require a session and store user-scoped data in SQLite.

```mermaid
flowchart TD
  A[Open account screen] --> B{Valid session?}
  B -->|No| C[Show sign-in form]
  B -->|Yes| D[GET private data]
  D --> E[Favorite, update settings or read notifications]
  E --> F[Mutation with ownership checks]
  F --> G[Persist to SQLite]
  G --> H[Update or invalidate query]
  H --> D
  F -->|401| I[Clear session cache and request sign-in]
```

Routes: `/account/favorites`, `/account/settings`, `/account/notifications`.
API: `/api/v1/me/favorites`, `/me/settings`, `/me/notifications`, and their mutation endpoints.
Favorites are unique by user/kind/id; repeated additions do not create duplicates.
Settings PATCH merges only supplied fields. Read-all stops at the request's captured boundary,
preserving notifications arriving afterward as unread.
Backend events create deduplicated notifications and respect notification preferences.
Notifications are in-app only; no push service or background poller monitors every match.
Sign-in, sign-out and account switching clear private query caches.

Related files:

- [frontend/src/features/favorites](../frontend/src/features/favorites)
- [frontend/src/features/settings](../frontend/src/features/settings)
- [frontend/src/features/notifications](../frontend/src/features/notifications)
- [backend/src/modules/me](../backend/src/modules/me)
