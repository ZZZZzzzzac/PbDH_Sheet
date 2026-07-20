# Test strategy and maintenance

The suite protects stable Interfaces, not the history of every TDD step. A test written during red-green-refactor is a design tool first. It remains permanently only when it is the clearest owner of a distinct regression or contract.

## Verification commands

- `npm test` runs the structural health guardrail and the complete Vitest suite.
- `npm run test:health` runs only the health command and its focused tests.
- `npm run test:e2e` runs Playwright browser contracts.
- `npm run build` type-checks and produces the production bundle.

The health report lists declaration counts and the largest test Modules. Counts are informational: there is deliberately no total-test ceiling. A growing suite is healthy when new tests own new stable behavior.

## Choose the narrowest owner

| Behavior | Preferred owner |
| --- | --- |
| Domain validation, dependency evaluation, data transforms | Vitest domain test |
| Sheet Module DOM, accessibility, store interaction | Vitest rendering test |
| Persistence adapters and migration seams | Vitest store/loader test |
| Real layout geometry, print media, downloads, IndexedDB, deployed base path | Playwright |
| System Package author contract | Package-pipeline or documented contract test |

Do not duplicate a full behavior matrix in Playwright when one browser tracer bullet plus a Vitest matrix protects the same Interface.

## TDD retirement checklist

During refactor, review every red-green test before keeping it:

1. Does it protect behavior observable through a stable Interface?
2. Is another test already protecting the same failure and decision path?
3. Can several examples become one table-driven contract without losing diagnostic value?
4. Does a broader integration test now make this implementation-detail test redundant?
5. Would the test still be valid after changing CSS selectors, helper functions, or internal state shape?

Delete or consolidate tests when the answer shows duplicate or incidental coverage. Preserve migration, malformed-input, sanitizer, print ownership, and persistence tests even when they mention an older format: those protect active compatibility seams rather than historical implementation.

## Enforced structural guardrails

`npm run test:health` fails for:

- a test Module over 1,200 lines;
- Playwright `waitForTimeout()` calls instead of polling observable state;
- more than one System Package Loader call in a test Module instead of a shared immutable normalized fixture;
- raw CSS inspection outside the small allowlist of documented presentation contracts.

Files over 600 lines are reported for review but do not fail. Split only when a stable Interface boundary improves Locality; do not split solely to satisfy a number. If a new raw CSS contract is genuinely Author-facing, document the contract and deliberately extend the allowlist together.

## Review cadence

Run the health command when adding a feature suite and during release verification. Periodically inspect the largest files and Playwright duration. Prefer removing duplicate coverage and fixed waits before adding workers or increasing timeouts.
