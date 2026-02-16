---
name: gsd
description: Spec-driven development framework with structured planning, parallel execution, and verification. Use when starting a new project, planning implementation phases, executing structured plans, or verifying completed work. Invoke with /gsd.
---

# When to use this
When the user wants to make a project or build a feature. 

# GSD — Getting Shit Done Framework

A disciplined, spec-driven development system adapted from [GSD-OpenCode/TÂCHES v1.9.4](https://github.com/rokicool/gsd-opencode). Provides structured workflows for project initialization, planning, execution, and verification with AI-assisted development.

## Quick Start

1. **New project?** → `/gsd-new-project` to initialize `.planning/` documents
2. **Ready to build?** → `/gsd-discuss-phase` then `/gsd-plan-phase` then `/gsd-execute-phase`
3. **Check work?** → `/gsd-verify-work`
4. **Where am I?** → `/gsd-progress`
5. **Quick task?** → `/gsd-quick` for ad-hoc work without full ceremony

**For small/solo projects:** The full 5-phase ceremony is optimized for complex, multi-phase projects. For simple projects or single features, consider using `/gsd-quick` for most work—linear commits to main are simpler and less error-prone than heavy planning overhead.

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

## Parallel Worktree Execution

**Use sparingly:** Parallel worktrees are powerful for genuinely independent features (3+ worktrees with no shared files), but add complexity. For 1-2 features or when files overlap significantly, sequential execution on main is simpler and less error-prone. Default to linear development unless parallelism provides clear value.

When multiple independent features or fixes can be built simultaneously, use git worktrees to parallelize development:

### Organization
- Analyze which files each work item touches and group items into worktrees that minimize merge conflicts (items touching the same lines go in the same worktree)
- Each worktree branches from the same base commit (usually `main`)
- Specify file/line boundaries per worktree so subagents stay in their lane

### Worktree Rules
1. **Unique build artifacts** — When building browser extensions or apps that can be loaded simultaneously, give each worktree's build artifact a unique name (e.g., `Brainrot Blocker [fix-reward-flow]`) so the user can test multiple worktrees in parallel
2. **Never merge without permission** — Never merge worktree branches to main unless the user explicitly requests it
3. **Immediate reporting** — Each worktree subagent must end with clear instructions for how to test the result (e.g., file paths to load in the browser), reported immediately upon completion even if other worktrees are still running
4. **Worktree-specific tests** — Each worktree should include tests that specifically validate only the features/fixes in that worktree
5. **Revert temporary changes on merge** — When merging a worktree branch that contains temporary identification changes (e.g., renamed manifest.json for coexistence), immediately revert those changes and commit after the merge
6. **Native messaging registration** — For Chrome extensions with `nativeMessaging`, remind the user after each worktree is loaded to provide the extension ID so the native host manifest's `allowed_origins` can be updated for testing

### Token Efficiency
- **ALWAYS paste file contents inline** — When launching ANY subagent, paste full content of files already in main agent's context rather than having subagents re-read via tools. This saves 5-15k tokens per subagent launch.
- **Extract relevant sections** — For files >25k tokens, paste only the relevant sections (functions, classes, components) the subagent needs
- **Inline for verification too** — Verification subagents should receive file contents inline, not re-read them
- **Skip subagents for trivial work** — For single-file changes <10 lines, main agent should implement directly

## Key Principles

1. **Atomic commits** — One commit per completed task, bisect-able and independently revertable
2. **Goal-backward verification** — Test observable outcomes, not task completion
3. **Dependency waves** — Parallel execution within waves, sequential across waves
4. **Fresh context per task** — Each task gets its own subagent to prevent context degradation. For modern models (Opus 4.6, Sonnet 4.5), larger tasks consuming 60-70% context are acceptable before spawning fresh context—quality degradation is less severe than earlier models.
5. **CLI-first development** — Build command-line interfaces, APIs, and backend logic before UI layers. This enables faster validation through automated testing rather than manual UI verification.
6. **Documentation-driven** — Maintain a `docs/` folder with architectural decisions, integration patterns, and design notes. Update docs as you implement—they become prompts for future phases and reduce redundant research.
7. **Cross-project patterns** — Reference solutions from other projects for common problems (auth, payments, file uploads). Maintain `~/.claude/patterns/` to document reusable approaches and avoid reinventing wheels.
8. **Honest reporting** — Mark confidence levels (HIGH/MEDIUM/LOW), document unknowns
9. **Anti-pattern scanning** — Detect TODOs, placeholders, empty handlers before marking complete
10. **No fabricated data** — When subagents generate data entries (process names, file paths, API endpoints, etc.), they must validate entries against reality. Never invent plausible-sounding values. For desktop app process names, verify the application has a real Windows desktop installer and a known process name.

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
