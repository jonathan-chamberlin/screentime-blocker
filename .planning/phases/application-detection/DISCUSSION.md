# Phase Discussion: application-detection

## Date: 2026-02-15

## Decisions

### App Input Method
- **Question**: How should productive applications be specified by the user?
- **Decision**: Curated list of ~20 common apps with checkboxes + text field for custom process names
- **Rationale**: Friendly UX for common apps (user doesn't need to know process names), flexible for power users who want unlisted apps

### UI Placement
- **Question**: Where in settings should productive apps appear?
- **Decision**: Same "What counts as productive?" section, separate list below productive sites
- **Rationale**: Keeps the concept of "what's productive" unified in one place

### Platform Support
- **Question**: Which platforms to support?
- **Decision**: Windows only
- **Rationale**: Simplest and fastest to implement; cross-platform can be added later

### Non-Productive Indicator
- **Question**: What happens visually when timer pauses?
- **Decision**: Badge text "⏸" on extension toolbar icon with red background
- **Rationale**: Subtle but always visible feedback without intrusive notifications

### Mode Behavior
- **Question**: Should apps only matter in whitelist mode?
- **Decision**: Both modes — whitelist: only listed apps count; all-except-blocked: any desktop app counts as productive
- **Rationale**: Consistent with mode philosophy — "all except blocked" means everything not blocked is productive, including apps

### Poll Frequency
- **Question**: How often should native host check focused app?
- **Decision**: Every 1 second
- **Rationale**: Very responsive, minimal resource impact on modern hardware

### Native Host Lifecycle
- **Question**: When should the native host run?
- **Decision**: Always running when browser is open
- **Rationale**: Simpler implementation, no start/stop coordination needed

### Fallback Behavior
- **Question**: What if native host isn't installed?
- **Decision**: Show warning in settings, extension works with browser-only tracking
- **Rationale**: Don't break existing functionality; make app tracking opt-in via native host install

### App Selection UI
- **Question**: How should curated apps be presented?
- **Decision**: Checkbox grid grouped by category (Development, Office, Productivity, Communication, Design)
- **Rationale**: Easy to scan, discover, and toggle; categories help find relevant apps quickly

## Preferences
- Match existing settings.html dark theme styling
- Use `data-lockable` pattern for locking during sessions
- Reuse existing `getStorage`/`setStorage` wrappers from storage.js
- Keep native host as simple as possible — no external dependencies beyond what's needed

## Open Questions
- None — all clarified
