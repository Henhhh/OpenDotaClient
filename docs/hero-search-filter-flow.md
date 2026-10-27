# Heroes, statistics and builds

Browse heroes in grid or list view, filter results, then open details, bracket statistics or builds.

```mermaid
flowchart TD
  A[Open Heroes] --> B[Search name or select attribute and role]
  B --> C[Grid or list results]
  C --> D[Select hero]
  D --> E[Details, abilities, talents and matchups]
  C --> F[Bracket statistics]
  F --> G[Switch win rate, pick rate or table view]
  D --> H[Builds and item popularity]
  E --> I[Favorite with a valid session]
```

Routes: `/main/heroes`, `/heroes/detail`, `/heroes/ranks`, `/heroes/build`.
Backend routes use `/api/v1/heroes` and its child endpoints; the frontend receives normalized DTOs.
Pick rate remains null when the source denominator is unavailable. Builds represent source item popularity,
not recommended-build win rates. Hero rankings depend on a feature flag and return 501 when disabled.

Related files:

- [frontend/src/features/heroes](../frontend/src/features/heroes)
- [frontend/src/features/builds](../frontend/src/features/builds)
- [backend/src/modules/heroes](../backend/src/modules/heroes)
