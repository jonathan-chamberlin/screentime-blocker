# Phase Workflow Reference

## Phase 1: Project Initialization (`/gsd-new-project`)

### Purpose
Set up the project foundation by capturing vision, requirements, and roadmap through conversational questioning.

### Process
1. **Conversational Discovery** — Ask the user about:
   - Project vision and goals
   - Target users and use cases
   - Technical constraints (language, framework, hosting)
   - Known requirements and features
   - Timeline and scope boundaries

2. **Human-Led Architectural Decisions** — For major technology choices, explicitly ask the user to research and decide:
   - **Framework selection** (React vs Vue vs Svelte, Express vs Fastify, etc.)
   - **Database choice** (PostgreSQL vs MongoDB vs SQLite)
   - **Hosting/deployment platform** (Vercel, AWS, Docker, etc.)
   - **Authentication approach** (JWT vs sessions, Auth0 vs Supabase vs custom)

   AI struggles with these architectural decisions because they have long-term implications and depend on team experience, existing infrastructure, and non-technical factors. Present options and trade-offs, but defer the final decision to the user.

3. **Parallel Research** (optional, for complex projects) — Launch up to 4 Explore subagents in parallel to investigate:
   - Implementation patterns for chosen technologies
   - Similar implementations and patterns
   - Common pitfalls and gotchas for selected stack
   - Integration approaches

3. **Document Generation** — Create the `.planning/` directory with:
   - `PROJECT.md` — Vision, context, constraints, tech stack decisions
   - `REQUIREMENTS.md` — All requirements organized by phase, each with a unique ID (REQ-XXX)
   - `ROADMAP.md` — Phases with goals, success criteria, and dependencies
   - `STATE.md` — Initial state (Phase 1, status: initialized)
   - `config.json` — Workflow configuration

4. **Phase Decomposition** — Break the project into phases using goal-backward methodology:
   - Start from the desired end state
   - Work backward to identify what must exist at each stage
   - Each phase should be independently verifiable
   - Phases should build on each other (no circular dependencies)

### Outputs
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/config.json`

---

## Phase 2: Phase Discussion (`/gsd-discuss-phase`)

### Purpose
Capture user preferences, decisions, and context before planning a specific phase. This shapes implementation without generating tasks.

### Process
1. **Load Context** — Read STATE.md to identify the current/target phase
2. **Read Phase Goals** — From ROADMAP.md, understand what this phase must achieve
3. **Conversational Preference Capture** — Ask about:
   - Visual/UX preferences (for UI phases)
   - API design preferences (for backend phases)
   - Library/framework preferences
   - Content and copy decisions
   - Organizational approaches
   - Any constraints or must-haves
4. **Document Decisions** — Save discussion artifacts to `.planning/phases/{phase-name}/DISCUSSION.md`
5. **Update STATE.md** — Record that discussion is complete for this phase

### Outputs
- `.planning/phases/{phase-name}/DISCUSSION.md`
- Updated `STATE.md`

---

## Phase 3: Phase Planning (`/gsd-plan-phase`)

### Purpose
Generate detailed, executable PLAN.md files with XML-structured tasks organized in dependency waves.

### Process

1. **Discovery Protocol** — Classify the effort level:
   - **Level 0** (Trivial): Single file, < 30 min → Skip to quick execution
   - **Level 1** (Simple): 1-3 files, clear path → Single plan, no research needed
   - **Level 2** (Moderate): 3-10 files, some unknowns → Research first, then plan
   - **Level 3** (Complex): 10+ files, significant unknowns → Deep research, multiple plans

2. **Load Context** — Read in order:
   - `STATE.md` — Current position and decisions
   - `ROADMAP.md` — Phase goals and success criteria
   - `REQUIREMENTS.md` — Requirements mapped to this phase
   - `PROJECT.md` — Overall context
   - Previous phase SUMMARY.md files — What's already built
   - DISCUSSION.md — User preferences (if exists)

3. **Research** (Level 2-3) — Launch Explore subagents to:
   - Investigate the existing codebase for relevant patterns
   - Research libraries or APIs needed
   - Identify integration points with existing code

4. **Task Decomposition** — Break the phase into atomic tasks:
   - Each task modifies 1-3 files maximum
   - Each task has clear verification criteria
   - Each task produces a meaningful, atomic commit
   - Tasks specify exact files to create/modify

5. **Dependency Analysis** — Build dependency graph:
   - Identify what each task needs (prerequisites) and creates (outputs)
   - Group tasks into waves: Wave 1 has no dependencies, Wave 2 depends on Wave 1, etc.
   - Tasks within the same wave can execute in parallel

6. **Plan Validation** — Check the plan for:
   - Requirement coverage (every phase requirement has a task)
   - Task completeness (no gaps between tasks)
   - Dependency correctness (no circular dependencies, no missing prerequisites)
   - Wiring (outputs from one task are consumed by dependent tasks)
   - Scope (no tasks outside the phase scope)

7. **Generate PLAN.md** — Write the plan file with XML task structure
   See plan-format.md for the exact format.

### Outputs
- `.planning/phases/{phase-name}/{phase}-{N}-PLAN.md`
- Updated `STATE.md`

### Flags
- `--gaps` — Generate a gap-closure plan after UAT failures (reads UAT.md for issues)

---

## Phase 4: Phase Execution (`/gsd-execute-phase`)

### Purpose
Execute PLAN.md files by running tasks in dependency-ordered waves with fresh context per task and atomic git commits.

### Process

1. **Load Plan** — Read the PLAN.md for the current phase
2. **Wave Execution** — For each wave (in order):
   a. Launch parallel `code-implementer` Task subagents for each task in the wave
   b. Each subagent receives:
      - The task XML (objective, files, action, verification)
      - Relevant context from PROJECT.md, STATE.md
      - Previous task outputs (if dependencies exist)
   c. Each subagent:
      - Implements the task
      - Runs the verification command
      - Creates an atomic git commit with a descriptive message
   d. Wait for all tasks in the wave to complete before starting next wave

3. **Deviation Rules** — When a subagent encounters issues:
   - **Rule 1** (Missing import/dependency): Auto-fix, continue
   - **Rule 2** (Minor bug in task scope): Auto-fix, continue
   - **Rule 3** (Small addition needed): Auto-add if < 20 lines, continue
   - **Rule 4** (Architecture concern): STOP, report back, create checkpoint

4. **Checkpoint Handling** — For tasks marked as checkpoints:
   - `checkpoint:human-verify` — Pause and ask user to verify before continuing
   - `checkpoint:decision` — Pause and ask user to make a decision
   - `checkpoint:human-action` — Pause and ask user to perform an action (e.g., configure API key)

5. **Summary Generation** — After all waves complete:
   - Create SUMMARY.md with what was built, decisions made, issues encountered
   - Update STATE.md with progress

### Outputs
- Atomic git commits (one per task)
- `.planning/phases/{phase-name}/{phase}-{N}-SUMMARY.md`
- Updated `STATE.md`

---

## Phase 5: Work Verification (`/gsd-verify-work`)

### Purpose
Verify completed work through automated checks and conversational user acceptance testing (UAT).

### Process

1. **Automated Verification** — Launch verification subagents to check:
   - **Existence**: Do all expected files/artifacts exist?
   - **Substantive**: Are implementations real (not stubs, placeholders, or TODOs)?
   - **Wiring**: Are components connected (exports used, APIs called, routes registered)?

2. **Anti-Pattern Scan** — Search for:
   - `TODO`, `FIXME`, `HACK` comments in new code
   - Empty function bodies or handlers
   - Placeholder text or dummy data
   - Console.log/print statements left in production code
   - Commented-out code blocks

3. **Conversational UAT** — Walk through the phase's success criteria with the user:
   - Demonstrate each feature/capability built
   - Ask user to verify behavior matches expectations
   - Document any issues or gaps

4. **Gap Assessment** — If issues found:
   - Document issues in UAT.md
   - Offer to run `/gsd-plan-phase --gaps` to create a fix plan
   - Execute fix plan if approved

5. **Phase Completion** — If verification passes:
   - Mark phase complete in STATE.md
   - Route to next phase or project completion

### Outputs
- `.planning/phases/{phase-name}/{phase}-UAT.md`
- Updated `STATE.md`
- Gap-closure plans (if needed)

---

## Phase Transitions

```
Initialize → Discuss → Plan → Execute → Verify
                ↑                          |
                └──────── (if gaps) ───────┘
```

After verification:
- **All phases done** → Project complete
- **More phases remain** → Move to next phase, start at Discuss
- **Gaps found** → Return to Plan with `--gaps` flag, then re-execute and re-verify
