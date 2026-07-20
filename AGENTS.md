## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `ZZZZzzzzac/PbDH_Sheet`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: read root `CONTEXT.md` and `docs/adr/` when present. See `docs/agents/domain.md`.

### System Package docs

The authoritative System Package documentation is `docs/system-package/README.md`.

- Authors should follow `docs/system-package/author-guide/` for package creation, Author Preview, and debugging workflows.
- AI and programmers must read `docs/system-package/reference/` before generating, modifying, validating, or diagnosing a System Package.
- Use `docs/system-package/examples/` and `public/system-packages/` as current examples. Do not use removed legacy System Package documents or deprecated `selectionText` / Flow Layout interfaces.

### PRD & Architecture

`docs/PRD.md`, `docs/architecture.md` and `docs/c4.md`

## Common Develop Procedure

Developing new feature / debug and any other non-trivial task, use /to-prd /to-issue /triage workflow.
- trivial task edit code directly, no /to-prd /to-issue /triage
- simple task can skip /to-prd.
- use /triage alonewith /to-issue, unless human review needed.
- after human review and say ok, close related issues

## GitHub CLI

- Sandboxed `gh` cannot access the host authentication and returns `HTTP 401: Requires authentication`.
- Run `gh` commands outside the sandbox with the required escalation. Do not run `gh auth login`; the host is already authenticated.

## Release & Deployment

- `.github/workflows/release.yml` owns tag validation, verification, artifact packaging, and GitHub Release creation.
- `.github/workflows/deploy.yml` only promotes an existing Release after manual dispatch through the `production` environment; it never builds source.
- `scripts/release-tools.mjs` owns release-version and built-output validation shared by local checks and workflows.
- `scripts/deploy-release.sh` owns remote immutable-release staging and atomic activation; it must not contain hostnames, usernames, credentials, or destructive cleanup commands.
- `docs/release.md` is the maintainer runbook for versioning, GitHub Secrets, first deployment, promotion, health checks, and rollback.
