# Command Reference

## Core Workflow Commands

### `/gsd-new-project`

Initialize a new project with the GSD framework.

**When to use**: Starting a new project or adding GSD to an existing codebase.

**Process**:
1. Check if `.planning/` already exists — if so, warn and confirm overwrite
2. Ask the user conversational questions about the project:
   - What are you building?
   - Who is it for?
   - What technology/framework?
   - What are the key features?
   - Any constraints (timeline, APIs, hosting)?
3. For complex projects (Level 2-3), launch parallel research agents
4. Generate planning documents:
   - `.planning/PROJECT.md` — Project vision, context, tech stack
   - `.planning/REQUIREMENTS.md` — Requirements with IDs (REQ-001, REQ-002, ...)
   - `.planning/ROADMAP.md` — Phases with goals and success criteria
   - `.planning/STATE.md` — Initial state
   - `.planning/config.json` — Configuration
5. Create `.planning/phases/` directory
6. Update STATE.md with current phase

**Output**: Complete `.planning/` directory structure

---

### `/gsd-discuss-phase`

Capture preferences and decisions before planning a phase.

**When to use**: Before `/gsd-plan-phase`, to shape implementation decisions.

**Process**:
1. Read STATE.md to identify current phase
2. Read ROADMAP.md for phase goals
3. Ask the user about preferences relevant to this phase:
   - UI/UX choices
   - API design decisions
   - Library preferences
   - Content decisions
   - Organizational approaches
4. Document decisions in `.planning/phases/{phase}/DISCUSSION.md`
5. Update STATE.md

**Arguments**:
- `[phase-name]` (optional) — Specify which phase to discuss. Defaults to current phase from STATE.md.

---

### `/gsd-plan-phase`

Generate executable PLAN.md files with XML-structured tasks.

**When to use**: After discussion (or directly if discussion isn't needed), to create a detailed execution plan.

**Process**:
1. Read all context: STATE.md, ROADMAP.md, REQUIREMENTS.md, PROJECT.md, previous summaries
2. Run discovery protocol to classify effort level (0-3)
3. For Level 2-3: launch research agents
4. Decompose phase into atomic tasks with dependencies
5. Assign tasks to waves based on dependency graph
6. Validate the plan (requirement coverage, dependency correctness, wiring)
7. Write PLAN.md

**Arguments**:
- `[phase-name]` (optional) — Specify which phase. Defaults to current phase.
- `--gaps` — Generate a gap-closure plan from UAT.md failures instead of a fresh plan

**Output**: `.planning/phases/{phase}/{phase}-{N}-PLAN.md`

---

### `/gsd-execute-phase`

Execute PLAN.md files in dependency-ordered waves.

**When to use**: After a plan is generated and ready to implement.

**Process**:
1. Read the PLAN.md for current phase
2. For each wave:
   a. Launch parallel code-implementer subagents (one per task)
   b. Each subagent implements the task and creates an atomic git commit
   c. Wait for all tasks in wave to complete
   d. Handle any checkpoints or deviations
3. Generate SUMMARY.md
4. Update STATE.md

**Arguments**:
- `[phase-name]` (optional) — Specify which phase. Defaults to current phase.
- `[plan-number]` (optional) — Specify which plan to execute. Defaults to latest.

**Output**: Atomic git commits, SUMMARY.md, updated STATE.md

---

### `/gsd-verify-work`

Run automated verification and user acceptance testing.

**When to use**: After execution completes, to validate the work.

**Process**:
1. Run three-level automated verification (existence, substantive, wiring)
2. Run anti-pattern scan
3. Walk through success criteria with user
4. Document results in UAT.md
5. If issues found: offer to generate gap-closure plan
6. If passed: mark phase complete in STATE.md

**Arguments**:
- `[phase-name]` (optional) — Specify which phase. Defaults to current phase.

**Output**: UAT.md, updated STATE.md

---

## Navigation Commands

### `/gsd-progress`

Show current project state and suggest next action.

**Process**:
1. Read STATE.md
2. Read ROADMAP.md
3. Display:
   - Current phase and status
   - Completed phases
   - Remaining phases
   - Next recommended action
4. Route user to the appropriate next command

---

### `/gsd-help`

Display all available GSD commands with descriptions.

**Process**: Display the command reference table from SKILL.md.

---

### `/gsd-quick`

Execute an ad-hoc task without full planning ceremony.

**When to use**: Small, self-contained tasks that don't warrant a full plan-execute-verify cycle.

**Process**:
1. Ask user what they want to do
2. If `.planning/STATE.md` exists, read it for context
3. Implement the task directly
4. Create an atomic git commit
5. Update STATE.md if it exists

---

## Phase Management Commands

### `/gsd-add-phase`

Add a new phase to the roadmap.

**Process**:
1. Read current ROADMAP.md
2. Ask user about the new phase: name, goals, success criteria, where it fits in the sequence
3. Add phase to ROADMAP.md
4. Map any new requirements to this phase in REQUIREMENTS.md
5. Update STATE.md

---

### `/gsd-research-phase`

Research a phase without generating a plan.

**When to use**: When you need to understand what a phase involves before committing to planning.

**Process**:
1. Read ROADMAP.md for phase goals
2. Launch Explore subagents to investigate:
   - Existing codebase patterns
   - Libraries and APIs needed
   - Integration points
   - Complexity assessment
3. Present research findings to user
4. Save findings to `.planning/phases/{phase}/RESEARCH.md`

---

### `/gsd-debug`

Scientific debugging with hypothesis testing.

**When to use**: When something isn't working and the cause isn't obvious.

**Process**:
1. **Observe** — Ask user to describe the issue, reproduce it
2. **Hypothesize** — Form 2-3 possible causes based on symptoms
3. **Test** — Design minimal experiments to distinguish between hypotheses
4. **Diagnose** — Identify root cause from test results
5. **Fix** — Apply minimal, targeted fix
6. **Verify** — Confirm fix works, no regressions
7. Create atomic git commit for the fix

---

## Session Commands

### `/gsd-pause-work`

Save current state for later resumption.

**Process**:
1. Update STATE.md with:
   - Current phase and task
   - What was just completed
   - What's next
   - Any blockers or open questions
   - Session timestamp
2. Confirm state saved

---

### `/gsd-resume-work`

Reload state and continue where you left off.

**Process**:
1. Read STATE.md
2. Read ROADMAP.md for context
3. Read latest PLAN.md and/or SUMMARY.md
4. Display:
   - Where we left off
   - What's next
   - Any blockers from last session
5. Route to appropriate next action
