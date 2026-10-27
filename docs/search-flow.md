# Global search

Search players, heroes or teams, or enter a match ID. Search history is stored on the device.

```mermaid
flowchart TD
  A[Open Search] --> B[Enter query and select category]
  B --> C[Debounce for 400 ms]
  C --> D[Request Search API]
  D --> E{Result}
  E -->|Available| F[Show results for current query]
  E -->|Empty or error| G[Show empty state or Retry]
  F --> H[Select result and save history]
  H --> I[Open player, hero, team or match]
```

Route: `/search`. API: `/api/v1/search`.
Changing query or category clears obsolete results. An entered match ID is an unverified suggestion;
the details screen validates it against real data. Keep IDs as strings to avoid numeric precision loss.
All-category search does not substitute sample results when a source fails.

Related files:

- [frontend/src/features/search](../frontend/src/features/search)
- [backend/src/modules/search](../backend/src/modules/search)
- [frontend/src/shared/navigation/routes.ts](../frontend/src/shared/navigation/routes.ts)
