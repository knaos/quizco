# E2E Testing Skill Spec

## Goal
Create a reusable `e2e-testing` skill that enforces Playwright regression coverage for all new features, refactors, and bug fixes.

## Scope
- Add a project-local skill at `.agents/skills/e2e-testing/SKILL.md`.
- Define clear trigger language so the skill activates for:
  - new feature implementation
  - code refactors
  - bug fixes
- Define an execution workflow for:
  - change-risk analysis
  - targeted e2e test creation/update
  - deterministic selectors via `data-testid`
  - command execution and result reporting
- Update `AGENTS.md` workflow to require this skill before merge-ready verification.

## Non-Goals
- Do not redesign existing Playwright harness architecture.
- Do not add unrelated frontend/backend feature changes.

## Acceptance Criteria
- Skill exists at `.agents/skills/e2e-testing/SKILL.md` with complete frontmatter and actionable workflow.
- `AGENTS.md` explicitly mandates running the `e2e-testing` skill for feature/refactor/bug-fix work.
- Verification command(s) are documented and executable with current workspace scripts.
