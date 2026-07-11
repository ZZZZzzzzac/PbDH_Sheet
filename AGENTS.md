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
- simple task can skip /to-prd.
- use /triage alonewith /to-issue, unless human review needed.
