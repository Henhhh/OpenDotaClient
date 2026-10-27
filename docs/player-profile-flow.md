# Profiles, players and comparison

Guests and signed-in users can enter a Dota ID to view public data. Selecting an ID does not verify account ownership.

```mermaid
flowchart TD
  A[Select or enter Dota ID] --> B[Load profile]
  B --> C{Data availability}
  C -->|Available| D[Overview, Matches, Heroes, Peers and Statistics]
  C -->|Private or missing| E[Show 403 or 404 state]
  D --> F[Switch tab or load more]
  F --> G[Request corresponding endpoint]
  D --> H[Compare two distinct Dota IDs]
  H --> I[Show statistics with the same scope]
```

API: `/api/v1/players/:id`, with `/stats`, `/matches`, `/heroes`, `/peers`, and `/rank-history`;
comparison uses `/api/v1/players/compare`. Routes: `/main/profile`, `/players/detail`, `/players/compare`.
`PATCH /api/v1/auth/profile` saves the signed-in user's Dota ID preference.
Peers count games played on the same team. Rank history does not convert medals into MMR;
unavailable history returns 501. Users selecting the same Dota ID retain separate private data.

Related files:

- [frontend/src/features/players](../frontend/src/features/players)
- [backend/src/modules/players](../backend/src/modules/players)
- [frontend/src/app/players](../frontend/src/app/players)
