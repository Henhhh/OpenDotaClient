# Home and refresh

Home combines public data for the selected Dota account with shortcuts to other features.

```mermaid
flowchart TD
  A[Open Home] --> B[Read selected Dota ID]
  B --> C[Request stats and match history]
  C --> D{Result}
  D -->|Success| E[Show summary, performance and recent matches]
  D -->|Error| F[Show error and Retry]
  E --> G[Select hero, match or shortcut]
  G --> H[Open destination screen]
  E --> I[Refresh]
  I --> C
  F --> C
```

Route: `/main`. Recent performance uses up to 20 matches; unavailable values remain null.
Refresh reloads related query groups. API failures do not fall back to sample data.
Notifications and Search open from the header and have separate flows.

Related files:

- [frontend/src/features/home/screens/HomeScreen.tsx](../frontend/src/features/home/screens/HomeScreen.tsx)
- [frontend/src/shared/navigation/routes.ts](../frontend/src/shared/navigation/routes.ts)
- [backend/src/modules/players/service.ts](../backend/src/modules/players/service.ts)
