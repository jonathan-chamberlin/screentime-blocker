# Agent Reference

The GSD framework uses specialized agents for different workflow stages. In Claude Code, these are implemented using the Task tool with specific subagent types.

## Planning Agents

### Project Researcher
- **Purpose**: Investigate the domain, technology stack, and architecture for a new project
- **Claude Code subagent**: `research-explorer`
- **When used**: During `/gsd-new-project` for complex projects
- **Invocation pattern**: Launch up to 4 in parallel, each with a specific research focus:
  1. **Stack Researcher** — Technology options, framework comparisons, compatibility
  2. **Feature Researcher** — Similar implementations, best practices, common patterns
  3. **Architecture Researcher** — System design options, scalability considerations, data flow
  4. **Pitfall Researcher** — Common mistakes, security concerns, performance gotchas

```
// Example: Parallel research launch
Task(subagent_type: "research-explorer", prompt: "Research stack options for [project]...")
Task(subagent_type: "research-explorer", prompt: "Research similar implementations of [feature]...")
Task(subagent_type: "research-explorer", prompt: "Research architecture patterns for [type]...")
Task(subagent_type: "research-explorer", prompt: "Research common pitfalls with [technology]...")
```

### Phase Researcher
- **Purpose**: Investigate specific implementation details for a single phase
- **Claude Code subagent**: `Explore`
- **When used**: During `/gsd-plan-phase` for Level 2-3 effort
- **Prompt should include**: Phase goals, existing codebase context, specific questions to answer

### Research Synthesizer
- **Purpose**: Consolidate findings from multiple parallel researchers into a unified summary
- **Claude Code implementation**: Done inline (no subagent needed) — read researcher outputs and synthesize
- **Output format**:
  ```
  ## Research Summary
  ### Consensus Findings (HIGH confidence)
  - ...
  ### Likely Approaches (MEDIUM confidence)
  - ...
  ### Open Questions (LOW confidence)
  - ...
  ### Recommendations
  - ...
  ```

### Planner
- **Purpose**: Decompose a phase into atomic tasks with dependency analysis
- **Claude Code subagent**: `Plan`
- **When used**: During `/gsd-plan-phase`
- **Prompt must include**:
  - Phase goals from ROADMAP.md
  - Requirements from REQUIREMENTS.md
  - Discussion decisions (if any)
  - Research findings (if any)
  - Existing codebase structure
- **Output**: PLAN.md file content (see plan-format.md)

### Plan Checker
- **Purpose**: Validate that a plan achieves its phase goals
- **Claude Code implementation**: Done inline after plan generation
- **Validation checklist**:
  1. Every requirement for this phase has at least one task addressing it
  2. No task references files that don't exist and aren't created by a prior task
  3. Dependencies form a DAG (no cycles)
  4. Every task has verification criteria
  5. Wave assignments respect dependency order
  6. No tasks outside phase scope
  7. Success criteria from ROADMAP.md are all testable after plan completion

### Codebase Mapper
- **Purpose**: Analyze an existing codebase to understand structure, patterns, and integration points
- **Claude Code subagent**: `Explore`
- **When used**: During `/gsd-new-project` for brownfield (existing) projects, or `/gsd-plan-phase` to understand current code
- **Prompt should request**:
  - File tree structure
  - Key exports and entry points
  - Patterns used (component structure, API patterns, state management)
  - Test infrastructure
  - Build/deploy configuration

## Execution Agents

### Executor
- **Purpose**: Implement a single task from a PLAN.md
- **Claude Code subagent**: `code-implementer`
- **When used**: During `/gsd-execute-phase`, one per task
- **Critical**: Each executor gets fresh context to prevent degradation
- **Prompt must include**:
  - The full task XML block
  - Relevant project context (PROJECT.md summary, key decisions from STATE.md)
  - File contents that the task depends on (from prior wave outputs)
  - Instruction to create an atomic git commit on completion
- **Deviation rules the executor must follow**:
  - Rule 1 (Missing import): Fix silently, continue
  - Rule 2 (Minor bug in scope): Fix silently, continue
  - Rule 3 (Small addition < 20 lines): Add silently, continue
  - Rule 4 (Architecture concern): STOP, return report

```
// Example: Executor invocation
Task(
  subagent_type: "code-implementer",
  prompt: `Execute this GSD task and create an atomic git commit when done.

## Task
<task type="auto">
  <name>Create user authentication middleware</name>
  <files>src/middleware/auth.ts</files>
  <action>Create Express middleware that validates JWT tokens from Auth0...</action>
  <verify>npm test -- --grep "auth middleware"</verify>
  <done>Auth middleware validates tokens, rejects invalid tokens with 401, and attaches user_id to req</done>
</task>

## Project Context
[paste relevant context]

## Instructions
- Implement the task exactly as specified
- Run the verify command to confirm it works
- Create a git commit with message: "feat: [task name]"
- If you encounter a Rule 4 deviation (architecture concern), STOP and report back
`
)
```

### Debugger
- **Purpose**: Diagnose and fix issues using scientific methodology
- **Claude Code subagent**: `node-debugger` (for Node.js) or `Bash` (for general)
- **When used**: During `/gsd-debug` or when executor encounters persistent issues
- **Methodology**:
  1. **Observe** — Reproduce the issue, collect error output
  2. **Hypothesize** — Form 2-3 possible causes
  3. **Test** — Design minimal experiments to distinguish between hypotheses
  4. **Diagnose** — Identify root cause
  5. **Fix** — Apply minimal fix
  6. **Verify** — Confirm fix resolves issue without regressions

## Verification Agents

### Verifier
- **Purpose**: Check that completed work meets quality standards
- **Claude Code subagent**: `test-runner`
- **When used**: During `/gsd-verify-work`
- **Three-level assessment**:
  1. **Existence** — Do all expected files/artifacts exist?
  2. **Substantive** — Are implementations real (not stubs/placeholders)?
  3. **Wiring** — Are components properly connected?

### Integration Checker
- **Purpose**: Verify cross-component integration
- **Claude Code subagent**: `Explore`
- **When used**: During `/gsd-verify-work` for multi-component phases
- **Checks**:
  - Exports are imported and used by consuming files
  - API endpoints are called by frontend code
  - Authentication flows connect end-to-end
  - Data flows from source to destination without gaps

## Agent Orchestration Patterns

### Parallel Research (Phase 1)
```
[Researcher 1] ──┐
[Researcher 2] ──┼── wait all ── [Synthesize inline] ── [Generate docs]
[Researcher 3] ──┤
[Researcher 4] ──┘
```

### Plan-Check Loop (Phase 3)
```
[Planner] ── [Check inline] ── pass? ── yes ── [Save PLAN.md]
                    │
                    no
                    │
                    └── [Planner (revision)] ── [Check inline] ── ...
```

### Wave Execution (Phase 4)
```
Wave 1: [Executor A] [Executor B] [Executor C]  ── wait all
Wave 2: [Executor D] [Executor E]               ── wait all
Wave 3: [Executor F]                             ── done
```

### Verification Pipeline (Phase 5)
```
[Verifier] ── [Integration Checker] ── [Anti-Pattern Scan] ── [UAT with user]
```
