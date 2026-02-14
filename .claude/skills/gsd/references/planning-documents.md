# Planning Document Templates

All GSD projects maintain a `.planning/` directory with structured documents that provide context continuity across sessions.

## Directory Structure

```
.planning/
├── PROJECT.md
├── REQUIREMENTS.md
├── ROADMAP.md
├── STATE.md
├── config.json
└── phases/
    └── {phase-name}/
        ├── DISCUSSION.md          (optional, from /gsd-discuss-phase)
        ├── RESEARCH.md            (optional, from /gsd-research-phase)
        ├── {phase}-1-PLAN.md      (from /gsd-plan-phase)
        ├── {phase}-1-SUMMARY.md   (from /gsd-execute-phase)
        └── {phase}-UAT.md         (from /gsd-verify-work)
```

---

## PROJECT.md Template

```markdown
# Project: {Project Name}

## Vision
{One paragraph describing what this project is and why it exists}

## Target Users
{Who will use this and what problems does it solve for them}

## Tech Stack
- **Language**: {e.g., TypeScript}
- **Framework**: {e.g., React, Express}
- **Database**: {e.g., PostgreSQL, Snowflake}
- **Auth**: {e.g., Auth0}
- **Hosting**: {e.g., Vercel, AWS}
- **Other**: {any other key technologies}

## Constraints
- {Timeline constraints}
- {Technical constraints}
- {Business constraints}

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| {e.g., State management} | {e.g., Zustand} | {e.g., Simpler than Redux for this scope} |

## Out of Scope
- {Things explicitly NOT being built}
```

---

## REQUIREMENTS.md Template

```markdown
# Requirements

## Phase: {phase-name}

### REQ-001: {Requirement title}
- **Description**: {What needs to be built}
- **Acceptance Criteria**:
  - {Criterion 1}
  - {Criterion 2}
- **Priority**: {Must-have | Should-have | Nice-to-have}

### REQ-002: {Requirement title}
...

## Phase: {next-phase-name}

### REQ-003: {Requirement title}
...
```

**Rules**:
- Every requirement gets a unique ID (REQ-XXX)
- Requirements are grouped by phase
- Each requirement has testable acceptance criteria
- Priority helps with scope management if time runs short

---

## ROADMAP.md Template

```markdown
# Roadmap

## Phase 1: {phase-name}
- **Goal**: {What this phase achieves}
- **Success Criteria**:
  - {Observable outcome 1}
  - {Observable outcome 2}
- **Requirements**: REQ-001, REQ-002, REQ-003
- **Dependencies**: None (first phase)
- **Status**: {not-started | in-progress | complete}

## Phase 2: {phase-name}
- **Goal**: {What this phase achieves}
- **Success Criteria**:
  - {Observable outcome 1}
  - {Observable outcome 2}
- **Requirements**: REQ-004, REQ-005
- **Dependencies**: Phase 1
- **Status**: {not-started | in-progress | complete}

...
```

**Rules**:
- Phases are ordered by dependency (earlier phases have no or fewer dependencies)
- Success criteria are observable outcomes, not task lists
- Every requirement is mapped to exactly one phase
- Use goal-backward methodology: start from desired end state, work backward

---

## STATE.md Template

```markdown
# Project State

## Current Position
- **Phase**: {phase-name}
- **Stage**: {initialized | discussing | planning | executing | verifying | complete}
- **Plan**: {plan number, if executing}
- **Wave**: {wave number, if executing}
- **Last Updated**: {timestamp}

## Session Context
{What was just completed, what's next, any blockers}

## Key Decisions Made
| When | Decision | Rationale |
|------|----------|-----------|
| {date} | {decision} | {why} |

## Blockers
- {Any current blockers, or "None"}

## Phase Progress
| Phase | Status | Notes |
|-------|--------|-------|
| {phase-1} | {complete/in-progress/not-started} | {notes} |
| {phase-2} | {status} | {notes} |
```

**Rules**:
- STATE.md is the single source of truth for project position
- Updated at every phase transition and significant event
- Session context helps with `/gsd-resume-work`
- Key decisions accumulate over the project lifetime

---

## config.json Template

```json
{
  "project_name": "{project-name}",
  "created": "{ISO date}",
  "workflow": {
    "parallel_research": true,
    "plan_checking": true,
    "auto_verify": true,
    "atomic_commits": true
  },
  "git": {
    "commit_prefix": "feat",
    "branch_strategy": "single"
  }
}
```

---

## DISCUSSION.md Template

```markdown
# Phase Discussion: {phase-name}

## Date: {date}

## Decisions

### {Topic 1}
- **Question**: {What was discussed}
- **Decision**: {What was decided}
- **Rationale**: {Why}

### {Topic 2}
...

## Preferences
- {UI/UX preferences}
- {Library preferences}
- {Naming conventions}

## Open Questions
- {Questions that still need answers}
```

---

## SUMMARY.md Template

```markdown
# Execution Summary: {phase}-{plan-number}

## What Was Built
- {Feature/component 1}: {description}
- {Feature/component 2}: {description}

## Files Created/Modified
| File | Action | Description |
|------|--------|-------------|
| {path} | {created/modified} | {what changed} |

## Decisions Made During Execution
| Decision | Choice | Rationale |
|----------|--------|-----------|
| {decision} | {choice} | {why} |

## Issues Encountered
- {Issue 1}: {how it was resolved}
- {Issue 2}: {how it was resolved}

## Deviations from Plan
- {Any deviations and why}

## Commits
| Hash | Message |
|------|---------|
| {short hash} | {commit message} |
```

---

## UAT.md Template

```markdown
# Verification: {phase-name}

## Automated Checks

### Existence Check
| Artifact | Expected | Found | Status |
|----------|----------|-------|--------|
| {file/feature} | {yes} | {yes/no} | {PASS/FAIL} |

### Substantive Check
| Component | Has Real Implementation | Status |
|-----------|----------------------|--------|
| {component} | {yes/no — stubs, TODOs?} | {PASS/FAIL} |

### Wiring Check
| Connection | From → To | Status |
|------------|-----------|--------|
| {e.g., API call} | {frontend → backend} | {PASS/FAIL} |

### Anti-Pattern Scan
| Pattern | Occurrences | Files |
|---------|-------------|-------|
| TODO/FIXME | {count} | {files} |
| Empty handlers | {count} | {files} |
| Placeholder text | {count} | {files} |

## User Acceptance Testing

### Success Criteria Results
| Criterion | Tested | Result | Notes |
|-----------|--------|--------|-------|
| {from ROADMAP.md} | {yes/no} | {PASS/FAIL} | {notes} |

## Overall Result
- **Status**: {PASS | FAIL | PARTIAL}
- **Issues Found**: {count}
- **Gaps to Address**: {list or "None"}

## Next Steps
- {What to do next}
```
