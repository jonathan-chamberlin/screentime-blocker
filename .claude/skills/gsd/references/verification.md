# Verification Reference

Verification is the final phase of each GSD cycle. It ensures work meets quality standards before moving to the next phase.

## Three-Level Artifact Assessment

### Level 1: Existence Check
Verify that all expected artifacts (files, functions, components) exist.

**Process**:
1. Read the PLAN.md `files_modified` list
2. For each file: confirm it exists using Glob
3. For each component/function mentioned in tasks: confirm it's defined using Grep

**Pass criteria**: All expected files and key exports exist.

**Example checks**:
```
Glob: src/middleware/auth.ts         → exists? ✓
Grep: "export.*function.*validateToken"  → found? ✓
Glob: src/db/schema.sql             → exists? ✓
```

### Level 2: Substantive Check
Verify that implementations are real, not stubs or placeholders.

**Process**:
1. Read each created/modified file
2. Check for red flags:
   - Functions with empty bodies (`{}` or just `return`)
   - `// TODO` or `// FIXME` comments indicating incomplete work
   - Placeholder strings (`"Lorem ipsum"`, `"placeholder"`, `"TBD"`)
   - Hardcoded test data in production code
   - `console.log` / `print` debug statements
   - Commented-out code blocks (more than 3 lines)

**Pass criteria**: No stubs, no TODOs in critical paths, no placeholder content.

### Level 3: Wiring Check
Verify that components are properly connected to each other.

**Process**:
1. For each export in new files: verify it's imported somewhere
2. For each API endpoint: verify the frontend calls it
3. For each database table/model: verify it's used by a service/handler
4. For each route: verify it's registered in the router
5. For each component: verify it's rendered in a parent component or page

**Pass criteria**: No orphaned code — everything is connected.

**Example checks**:
```
Export: src/middleware/auth.ts exports validateToken
  → Grep: "import.*validateToken.*auth" in src/routes/*.ts → found? ✓

Endpoint: POST /api/sessions
  → Grep: "fetch.*api/sessions.*POST" in src/components/*.tsx → found? ✓

Component: <SessionTimer />
  → Grep: "<SessionTimer" in src/pages/*.tsx → found? ✓
```

---

## Anti-Pattern Scan

After the three-level check, scan for common anti-patterns in all new/modified files.

### Patterns to Detect

| Pattern | Regex | Severity |
|---------|-------|----------|
| TODO comments | `TODO\|FIXME\|HACK\|XXX` | Warning |
| Empty function body | `\{\s*\}` (in function context) | Error |
| Placeholder text | `placeholder\|lorem ipsum\|TBD\|CHANGEME` | Error |
| Debug logging | `console\.log\|console\.debug\|print(` | Warning |
| Commented-out code | `^\s*//.*[{};]` (3+ consecutive lines) | Warning |
| Hardcoded secrets | `api_key\|token\|secret\|password\|private_key` (in string literals) | Critical |
| Empty catch blocks | `catch.*\{\s*\}` | Error |
| Magic numbers | Numeric literals (not 0, 1, -1) without const | Info |

### Severity Levels
- **Critical**: Must fix before marking phase complete (security issues)
- **Error**: Should fix — indicates incomplete implementation
- **Warning**: Review and fix if they indicate real problems
- **Info**: Optional improvement, note for future

### Scan Process
```
1. Get list of all files modified in this phase (from SUMMARY.md or git diff)
2. For each pattern:
   a. Grep across all modified files
   b. Record matches with file, line number, and context
3. Report findings grouped by severity
4. Critical/Error items block phase completion
```

---

## User Acceptance Testing (UAT)

### Process

1. **Prepare test scenarios** from ROADMAP.md success criteria:
   - Each success criterion becomes a test scenario
   - Write concrete steps to verify each one

2. **Walk through with user**:
   - For each scenario, describe what to test
   - Ask user to confirm the behavior is correct
   - Record PASS/FAIL for each

3. **Document results** in UAT.md (see planning-documents.md for template)

### UAT Question Format
For each success criterion, ask the user:

```
## Criterion: {success criterion from ROADMAP.md}

**How to test**: {concrete steps}
**Expected result**: {what should happen}

Does this work correctly? [PASS / FAIL / PARTIAL]
{If FAIL/PARTIAL: What's wrong?}
```

### Automated UAT (when possible)
Some criteria can be tested automatically:
- Run test suites: `npm test`, `pytest`, etc.
- Type checking: `npx tsc --noEmit`, `mypy`
- Lint: `npx eslint .`, `ruff check`
- Build: `npm run build`
- Start server: `npm run dev` (verify it starts without errors)

Always prefer automated tests over manual verification where possible.

---

## Gap Closure

When verification finds issues:

### Gap Classification
1. **Missing feature** — Required functionality wasn't implemented
2. **Broken wiring** — Components exist but aren't connected
3. **Incomplete implementation** — Stubs or partial code
4. **Bug** — Logic error in implemented code
5. **Quality issue** — Anti-patterns, missing error handling

### Gap Closure Process
1. Document all gaps in UAT.md
2. Run `/gsd-plan-phase --gaps` to generate a fix plan:
   - Reads UAT.md for the list of issues
   - Creates a focused plan targeting only the gaps
   - Follows the same PLAN.md format with XML tasks
3. Execute the gap-closure plan with `/gsd-execute-phase`
4. Re-verify with `/gsd-verify-work`

### Gap Closure Plan Rules
- Only address identified gaps — don't add new features
- Keep gap-closure plans small (< 5 tasks)
- If gaps are extensive (> 5), reconsider the original plan quality
- Maximum 2 gap-closure iterations before escalating to user

---

## Verification Decision Tree

```
Start Verification
│
├─ Run Existence Check
│  └─ FAIL → Gap: missing feature → Plan gaps
│
├─ Run Substantive Check
│  └─ FAIL → Gap: incomplete implementation → Plan gaps
│
├─ Run Wiring Check
│  └─ FAIL → Gap: broken wiring → Plan gaps
│
├─ Run Anti-Pattern Scan
│  ├─ Critical → MUST fix before proceeding
│  ├─ Error → SHOULD fix, create gap plan
│  └─ Warning/Info → Note, continue
│
├─ Run Automated Tests (if available)
│  └─ FAIL → Gap: bug → Plan gaps
│
├─ Run UAT with User
│  └─ FAIL → Gap: varies → Plan gaps
│
└─ ALL PASS
   └─ Mark phase complete in STATE.md
      └─ Route to next phase or project complete
```

---

## Verification Checklist (Quick Reference)

Use this checklist for each phase verification:

- [ ] All expected files exist
- [ ] All key functions/components are defined (not stubs)
- [ ] No TODO/FIXME in critical code paths
- [ ] All exports are imported and used
- [ ] API endpoints are called from frontend
- [ ] Routes are registered
- [ ] No hardcoded secrets
- [ ] No empty catch blocks
- [ ] Tests pass (if test suite exists)
- [ ] TypeScript compiles (if TS project)
- [ ] Linting passes
- [ ] Application starts without errors
- [ ] Each success criterion from ROADMAP.md verified
