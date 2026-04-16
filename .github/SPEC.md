# GitHub Actions CI Spec

## Goal

Add a basic GitHub Actions pipeline that validates the monorepo on pushes and pull requests without introducing repo-specific wrappers or duplicating local commands.

## Constraints

- Reuse existing root/workspace npm scripts where possible.
- Keep CI compatible with the current npm workspace + Turborepo setup.
- Provide Postgres for server-side tests and any workflow that boots the server.
- Keep browser coverage lightweight for the first pass by running the Playwright smoke suite.

## Workflow Shape

### Trigger

- Run on `push`, `pull_request`, and `workflow_dispatch`.

### Job 1: Validate

- Checkout repository.
- Setup Node.js with npm cache.
- Install dependencies with `npm ci`.
- Provision Prisma client and database schema against CI Postgres.
- Run:
  - `npm run lint`
  - `npm run build`
  - `npm test`

### Job 2: E2E Smoke

- Checkout repository.
- Setup Node.js with npm cache.
- Install dependencies with `npm ci`.
- Provision Prisma client and database schema against CI Postgres.
- Install Playwright Chromium dependencies.
- Run:
  - `npm run test:e2e -w @quizco/e2e -- tests/smoke.spec.ts`
- Upload Playwright artifacts when the job fails.

## Notes

- The repo does not currently include Prisma migrations, so CI should use `prisma db push` to create the schema needed by the server and e2e flows.
- The server test harness reads `apps/server/.env.test`, so CI must override DB connection settings via environment variables to target the GitHub Actions Postgres service.
