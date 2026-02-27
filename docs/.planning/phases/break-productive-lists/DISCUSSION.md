# Break & Productive Lists — Discussion

## Feature Summary
Replace the flat "Break Only Sites" / "Productive Sites" sections with named, reusable **break lists** and **productive lists**. Each list can contain both sites and apps. Users can create multiple lists and activate any combination.

## Decisions

| # | Topic | Decision | Rationale |
|---|-------|----------|-----------|
| 1 | List contents | Each list holds both sites AND apps | Simpler mental model; one list = one activity context |
| 2 | Category checkboxes | Checking/unchecking a category header toggles all items in that category | Faster bulk selection |
| 3 | Relationship to work/break sessions | Lists are a data model only in this phase; time-limit timer feature comes later | Incremental delivery; lists must exist before timers can reference them |
| 4 | Multiple active lists | Users can activate multiple break lists AND multiple productive lists simultaneously | Composability — e.g., "Social Media" + "Gaming" both blocked |
| 5 | Productive mode rework | Radio options become: "All sites (except blocked)" + one option per user-created productive list; multiple productive lists selectable | Replaces the old whitelist/all-except-blocked binary |
| 6 | Popup display | Show active break list NAME(s) only, not contents | Keep popup clean |
| 7 | Default break list | Ship with a "Default" break list containing: Instagram, Facebook, YouTube, Steam (site + app), Adult Sites, Gambling Sites, News Sites | Out-of-box useful experience |
| 8 | Migration | No migration of existing `rewardSites`/`productiveSites` — start fresh | Simplicity; avoid edge cases |
| 9 | UI placement | List selection at top of settings (below Strict Mode). List creation/editing further down, replacing current flat site/app sections | Selection prominent; editing in detail sections |
| 10 | Nuclear Block | Remains a completely separate section, unchanged | Different purpose and UX |

## Open Items
- Time-limit timer feature will be a subsequent phase that builds on these lists
- How the active list selection interacts with session locking (likely: locked during session, same as current behavior)
