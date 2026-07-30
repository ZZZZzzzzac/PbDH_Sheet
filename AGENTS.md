## Agent skills

Project-local reusable workflows live under `.agents/skills/<skill-name>/`.

- Use `/create-countable-icons` when designing, integrating, or auditing paired marked/unmarked icons for System Package `countableResource` modules.

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `ZZZZzzzzac/PbDH_Sheet`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: read root `CONTEXT.md` and `docs/adr/` when present. See `docs/agents/domain.md`.

### System Package docs

The authoritative System Package documentation is `docs/system-package/README.md`.

- Authors should start with `docs/system-package/getting-started.md` and use `docs/system-package/authoring-workflow.md` for Author Preview and debugging.
- AI and programmers must read the relevant files in `docs/system-package/contract/` before generating, modifying, validating, or diagnosing a System Package.
- Copy `templates/system-package-minimal/` for a new package. Use `public/system-packages/` as real shipped implementations and `tests/fixtures/system-packages/` only as test data. Do not use removed legacy documents or deprecated `selectionText` / Flow Layout interfaces.

### Asset size policy

- Before adding a large asset batch, measure file count, expanded bytes, and packaged bytes, then choose an explicit size-reduction plan. Import limits are safety caps, not size targets.
- Do not commit raw source assets, lossless originals, generated intermediates, or duplicate exports to Git. Git retains historical blobs; keep source archives outside the repository and commit only optimized runtime assets.
- For System Package images, resize to actual display needs, strip metadata, deduplicate, and prefer WebP/AVIF. Use PNG only when lossless output is required. Never embed large base64 payloads in JSON, HTML, or CSS.
- Follow `docs/system-package/contract/package-and-assets.md` for package-specific rules.

### PRD & Architecture

Start from `docs/README.md`. Product scope lives in `docs/PRD.md`, current runtime architecture in `docs/architecture.md`, and decision history in `docs/adr/`.

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
