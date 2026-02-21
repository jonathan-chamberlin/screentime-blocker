# Phase Discussion: per-list-modes (Per-List Blocking Modes + Scheduled Blocking)

## Date: 2026-02-20

## Decisions

### Per-List Blocking Modes
- **Question**: How should each break list define its blocking behavior?
- **Decision**: Add a `mode` field to each break list object: `'off' | 'manual' | 'scheduled' | 'always-on'`. Default: `'manual'` for backward compat.
- **Rationale**: Each list independently chooses its blocking behavior. Coexists with Nuclear Block (separate, permanent) and manual sessions (existing).

### Schedule Data Location
- **Question**: Where should schedule data live?
- **Decision**: Co-located on break list objects: `breakLists[i].schedules = [{days, startTime, endTime}, ...]`. Schedule travels with the list.
- **Rationale**: Delete list = delete schedules. One storage read gets everything. No orphaned schedule data.

### Scheduler Runtime Architecture
- **Question**: How should the scheduler enforce blocking during scheduled windows?
- **Decision**: DNR + in-memory cache (Option C). declarativeNetRequest rules are the source of truth for blocking (persist even when service worker sleeps). In-memory cache for fast popup/tab queries. Both re-synced on every alarm tick + service worker startup.
- **Rationale**: DNR rules persist across service worker restarts. In-memory cache avoids async storage reads on every tab change.

### Schedule Transitions
- **Question**: Should there be a grace period or notification when a schedule window ends?
- **Decision**: Schedule transitions are immediate. When a schedule window ends, blocking rules are removed on the next alarm tick. No notification or grace period.
- **Rationale**: Simple, predictable behavior. Users set the schedule they want.

### Mode Strength Ordering
- **Question**: What happens when a schedule window overlaps with a manual session?
- **Decision**: Schedule takes precedence. If a list is in "scheduled" mode and the window is active, it blocks regardless of manual session state.
- **Rationale**: Scheduled = automatic commitment. Manual session adds additional blocking on top.

### UI for Mode Selection
- **Question**: How should users select the mode for each break list?
- **Decision**: Replace the "active" checkbox on each break list in the "Choose your active lists" section with a mode dropdown (Off / Manual / Scheduled / Always-On). When "Scheduled" is selected, show schedule editor inline.
- **Rationale**: Mode dropdown is compact, familiar UI pattern. Inline schedule editor avoids navigating to a separate page.

### isActive Backward Compatibility
- **Question**: How to handle the existing `isActive` boolean on break lists?
- **Decision**: Keep `isActive` but derive it from `mode !== 'off'`. Migration: `isActive: true` → `mode: 'manual'`, `isActive: false` → `mode: 'off'`.
- **Rationale**: Minimizes breakage. Existing code that reads `isActive` still works.

## Preferences
- Schedule editor: day checkboxes (Mon-Sun) + time range inputs (HH:MM) + "Add window" button for multiple windows per list
- Time inputs use 24-hour format for unambiguous schedule definitions
- Mode badges shown in the active lists section to indicate each list's blocking mode
- Existing session flow (start/stop/reward) unchanged — scheduled blocking runs independently

## Open Questions
- None — all key decisions captured.
