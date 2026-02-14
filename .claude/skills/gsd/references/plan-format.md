# PLAN.md Format Reference

PLAN.md files are the core execution artifacts of the GSD framework. They contain XML-structured tasks organized in dependency waves.

## PLAN.md Structure

```markdown
---
phase: {phase-name}
plan: {plan-number}
type: execute
total_waves: {N}
total_tasks: {N}
requirements_covered: [REQ-001, REQ-002, ...]
files_modified: [path/to/file1.ts, path/to/file2.ts, ...]
---

# Plan: {Phase Name} — Plan {N}

## Objective
{What this plan achieves — ties to phase goals from ROADMAP.md}

## Context
- Project: {from PROJECT.md}
- Phase goals: {from ROADMAP.md}
- Prerequisites: {what must exist before this plan runs}
- Key decisions: {from DISCUSSION.md or STATE.md}

## Wave 1 — {Wave Description}

<task type="auto">
  <name>{Descriptive task name}</name>
  <files>{file paths this task creates or modifies}</files>
  <action>
    {Detailed implementation instructions.
    Include WHAT to build and WHY specific choices are made.
    Reference specific patterns, APIs, or conventions.}
  </action>
  <verify>{Command to verify the task — e.g., npm test, npx tsc --noEmit}</verify>
  <done>{Acceptance criteria — observable outcome that proves the task is complete}</done>
</task>

<task type="auto">
  <name>{Another task in the same wave — can run in parallel}</name>
  <files>{paths}</files>
  <action>{instructions}</action>
  <verify>{verification command}</verify>
  <done>{acceptance criteria}</done>
</task>

## Wave 2 — {Wave Description}
{Depends on Wave 1 completion}

<task type="auto">
  <name>{Task that depends on Wave 1 outputs}</name>
  <files>{paths}</files>
  <action>{instructions — may reference files created in Wave 1}</action>
  <verify>{verification command}</verify>
  <done>{acceptance criteria}</done>
</task>

## Success Criteria
{How to verify the entire plan succeeded — maps to ROADMAP.md success criteria}
```

---

## Task Types

### `type="auto"`
Standard task. The executor implements it autonomously, creates a commit, and moves on.

```xml
<task type="auto">
  <name>Create database schema</name>
  <files>src/db/schema.sql, src/db/migrations/001_initial.sql</files>
  <action>
    Create the initial database schema with users and sessions tables.
    Use UUID for primary keys. Add created_at/updated_at timestamps.
    Create a migration file that can be run with `npm run migrate`.
  </action>
  <verify>npm run migrate -- --dry-run</verify>
  <done>Schema file exists, migration runs without errors in dry-run mode</done>
</task>
```

### `type="checkpoint:human-verify"`
Pause after implementation and ask the user to verify before continuing.

```xml
<task type="checkpoint:human-verify">
  <name>Implement dashboard layout</name>
  <files>src/components/Dashboard.tsx, src/styles/dashboard.css</files>
  <action>
    Build the main dashboard layout with sidebar navigation and content area.
    Use the color scheme from DISCUSSION.md preferences.
  </action>
  <verify>npm run dev (user visually inspects)</verify>
  <done>User confirms dashboard layout matches expectations</done>
</task>
```

### `type="checkpoint:decision"`
Pause and ask the user to make a decision before proceeding.

```xml
<task type="checkpoint:decision">
  <name>Choose authentication strategy</name>
  <files>none</files>
  <action>
    Present options for authentication:
    Option A: JWT with refresh tokens (simpler, stateless)
    Option B: Session-based with Redis (more control, revocable)
    Ask user to choose, then document decision in STATE.md.
  </action>
  <verify>Decision documented in STATE.md</verify>
  <done>User has chosen authentication strategy</done>
</task>
```

### `type="checkpoint:human-action"`
Pause and ask the user to perform an action (e.g., configure credentials, set up external service).

```xml
<task type="checkpoint:human-action">
  <name>Configure Auth0 application</name>
  <files>none</files>
  <action>
    Ask user to:
    1. Create an Auth0 application at https://manage.auth0.com
    2. Set callback URL to http://localhost:3000/callback
    3. Provide the Client ID and Client Secret
    4. Store credentials in .env file (never commit)
  </action>
  <verify>cat .env | grep AUTH0_CLIENT_ID (exists and non-empty)</verify>
  <done>Auth0 credentials are configured in .env</done>
</task>
```

---

## Wave System

### Rules
1. **Wave 1** contains tasks with NO dependencies — they can all run in parallel
2. **Wave N+1** contains tasks that depend on Wave N outputs
3. All tasks within a wave execute in parallel (as separate Task subagents)
4. Waves execute sequentially — Wave 2 starts only after all Wave 1 tasks complete
5. A plan should have 2-5 waves (if more, consider splitting into multiple plans)

### Dependency Resolution
Tasks declare dependencies implicitly through their `<files>` tags:
- If Task B's `<action>` references a file that Task A's `<files>` creates → B depends on A
- Tasks with no such references go in Wave 1
- Use the `<files>` tag to make dependencies explicit

### Wave Design Principles
- **Wave 1**: Foundation — schemas, types, configuration, utility functions
- **Wave 2**: Core logic — services, handlers, components that use Wave 1 outputs
- **Wave 3**: Integration — connecting components, routes, API endpoints
- **Wave 4**: Polish — error handling, edge cases, styling
- **Wave 5**: Testing — integration tests, E2E tests (if not TDD)

---

## Deviation Rules

When an executor encounters issues during task implementation:

### Rule 1: Missing Import/Dependency
**Trigger**: A required import, package, or type doesn't exist
**Action**: Auto-fix (add import, install package)
**Report**: Not required — continue silently

### Rule 2: Minor Bug in Task Scope
**Trigger**: Small bug discovered in the code being modified
**Action**: Auto-fix if within task's file scope
**Report**: Note in commit message

### Rule 3: Small Addition Needed
**Trigger**: Task needs a small addition (< 20 lines) not explicitly specified
**Action**: Auto-add if clearly necessary for the task to work
**Report**: Note in commit message

### Rule 4: Architecture Concern
**Trigger**: Task requires changes that affect system architecture or other tasks' assumptions
**Action**: STOP. Do not implement. Report back to orchestrator.
**Report**: Return detailed explanation of the concern and proposed alternatives
**Resolution**: User/orchestrator decides, then either revise plan or proceed with guidance

---

## Plan Size Guidelines

- **Target**: 50% of available context per task (leave room for implementation thinking)
- **Maximum tasks per plan**: 10-15
- **Maximum waves per plan**: 5
- **If the phase needs more**: Split into multiple plans (plan-1, plan-2, ...)
- **Each task should modify**: 1-3 files maximum

---

## Commit Message Format

Each task produces one atomic commit:

```
{type}: {task name}

{Brief description of what was implemented and why}

GSD: {phase}/{plan}-{wave}-{task}
```

**Types**:
- `feat` — New feature or capability
- `fix` — Bug fix
- `refactor` — Code restructuring without behavior change
- `test` — Adding or updating tests
- `chore` — Configuration, setup, dependencies
- `docs` — Documentation

**Example**:
```
feat: Create user authentication middleware

Implement Express middleware that validates JWT tokens from Auth0.
Extracts user_id from token and attaches to req.user.
Returns 401 for invalid/expired tokens.

GSD: 02-backend-auth/plan-1-wave-2-task-1
```

---

## TDD Variant

For phases flagged as TDD candidates, the plan type changes:

```yaml
type: tdd
```

In TDD mode, tasks come in pairs:
1. **Test task** (Wave N): Write the test that defines expected behavior
2. **Implementation task** (Wave N+1): Write the code that makes the test pass

```xml
<!-- Wave 1: Write test -->
<task type="auto">
  <name>Test: user authentication middleware</name>
  <files>src/middleware/__tests__/auth.test.ts</files>
  <action>
    Write tests for auth middleware:
    - Valid token: attaches user_id to req, calls next()
    - Missing token: returns 401
    - Expired token: returns 401
    - Malformed token: returns 401
  </action>
  <verify>npm test -- --grep "auth middleware" (tests exist but fail)</verify>
  <done>Tests are written, run, and fail (red phase)</done>
</task>

<!-- Wave 2: Make tests pass -->
<task type="auto">
  <name>Implement: user authentication middleware</name>
  <files>src/middleware/auth.ts</files>
  <action>
    Implement the auth middleware to pass all tests from Wave 1.
    Validate JWT using Auth0 JWKS endpoint.
  </action>
  <verify>npm test -- --grep "auth middleware" (all pass)</verify>
  <done>All auth middleware tests pass (green phase)</done>
</task>
```
