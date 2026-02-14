---
name: gsd
description: Spec-driven development framework with structured planning, parallel execution, and verification. Use when starting a new project, planning implementation phases, executing structured plans, or verifying completed work. Invoke with /gsd.
---

# GSD — Getting Shit Done Framework

A disciplined, spec-driven development system adapted from [GSD-OpenCode/TÂCHES v1.9.4](https://github.com/rokicool/gsd-opencode). Provides structured workflows for project initialization, planning, execution, and verification with AI-assisted development.

## Quick Start

1. **New project?** → `/gsd-new-project` to initialize `.planning/` documents
2. **Ready to build?** → `/gsd-discuss-phase` then `/gsd-plan-phase` then `/gsd-execute-phase`
3. **Check work?** → `/gsd-verify-work`
4. **Where am I?** → `/gsd-progress`
5. **Quick task?** → `/gsd-quick` for ad-hoc work without full ceremony

## Core Workflow (5 Phases)

```
Phase 1: Initialize    /gsd-new-project      → Creates .planning/ docs
Phase 2: Discuss       /gsd-discuss-phase     → Captures preferences & decisions
Phase 3: Plan          /gsd-plan-phase        → Generates PLAN.md with XML tasks
Phase 4: Execute       /gsd-execute-phase     → Runs plans in parallel waves
Phase 5: Verify        /gsd-verify-work       → UAT + automated verification
```

Phases 2-5 repeat for each phase in the roadmap. See [references/phases.md](references/phases.md) for detailed instructions.

## Command Reference

| Command | Description |
|---|---|
| `/gsd-new-project` | Initialize project — create PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md |
| `/gsd-discuss-phase` | Capture preferences and decisions before planning a phase |
| `/gsd-plan-phase` | Generate PLAN.md with XML tasks, dependency waves, verification criteria |
| `/gsd-execute-phase` | Execute plans in parallel waves with atomic git commits per task |
| `/gsd-verify-work` | Run UAT + automated verification + gap-closure planning |
| `/gsd-progress` | Show current project state, route to next action |
| `/gsd-help` | Display available GSD commands |
| `/gsd-quick` | Ad-hoc task execution without full planning ceremony |
| `/gsd-add-phase` | Add a new phase to the roadmap |
| `/gsd-research-phase` | Research a phase without generating a plan |
| `/gsd-debug` | Scientific debugging with hypothesis testing |
| `/gsd-pause-work` | Save current state for later resumption |
| `/gsd-resume-work` | Reload state and continue where you left off |

See [references/commands.md](references/commands.md) for full command definitions.

## Planning Directory Structure

After `/gsd-new-project`, your project will have:

```
.planning/
├── PROJECT.md          # Vision, context, constraints
├── REQUIREMENTS.md     # Scoped requirements mapped to phases
├── ROADMAP.md          # Phase structure with goals and dependencies
├── STATE.md            # Current position, decisions, blockers
├── config.json         # Workflow configuration
└── phases/
    └── {phase-name}/
        ├── {phase}-{N}-PLAN.md      # Execution plans
        ├── {phase}-{N}-SUMMARY.md   # Completion summaries
        └── {phase}-UAT.md           # Verification results
```

See [references/planning-documents.md](references/planning-documents.md) for templates.

## Agent System

The framework uses specialized agents via Claude Code's Task tool:

- **Researchers** — `Explore` / `research-explorer` subagents for domain investigation
- **Planner** — `Plan` subagent for task decomposition and dependency analysis
- **Executor** — `code-implementer` subagent per task (fresh context per task)
- **Verifier** — `test-runner` subagent for automated verification
- **Debugger** — `node-debugger` / `Bash` subagent for scientific debugging

See [references/agents.md](references/agents.md) for full agent role definitions.

## Key Principles

1. **Atomic commits** — One commit per completed task, bisect-able and independently revertable
2. **Goal-backward verification** — Test observable outcomes, not task completion
3. **Dependency waves** — Parallel execution within waves, sequential across waves
4. **Fresh context per task** — Each task gets its own subagent to prevent context degradation
5. **Honest reporting** — Mark confidence levels (HIGH/MEDIUM/LOW), document unknowns
6. **Anti-pattern scanning** — Detect TODOs, placeholders, empty handlers before marking complete

## Reference Documents

- [references/phases.md](references/phases.md) — Detailed 5-phase workflow
- [references/agents.md](references/agents.md) — Agent roles and invocation patterns
- [references/commands.md](references/commands.md) — Full command definitions
- [references/planning-documents.md](references/planning-documents.md) — Document templates
- [references/plan-format.md](references/plan-format.md) — PLAN.md XML structure
- [references/verification.md](references/verification.md) — Verification protocols

## Command Routing

When the user invokes `/gsd`, determine which command they want:

1. If they specify a subcommand (e.g., `/gsd new-project`), route to that command
2. If no subcommand, show the command reference table above and ask what they'd like to do
3. Read the relevant reference document for the command before executing
4. Always read `.planning/STATE.md` first (if it exists) to understand current project state
