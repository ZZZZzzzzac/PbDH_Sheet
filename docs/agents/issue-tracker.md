# Issue Tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `ZZZZzzzzac/PbDH_Sheet`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --repo ZZZZzzzzac/PbDH_Sheet --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --repo ZZZZzzzzac/PbDH_Sheet --comments`, filtering comments by `jq` and also fetching labels when needed.
- **List issues**: `gh issue list --repo ZZZZzzzzac/PbDH_Sheet --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --repo ZZZZzzzzac/PbDH_Sheet --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --repo ZZZZzzzzac/PbDH_Sheet --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --repo ZZZZzzzzac/PbDH_Sheet --comment "..."`

Do not rely on `gh` inferring the repository from `git remote -v`; this workspace may not always be checked out as a Git repository.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `ZZZZzzzzac/PbDH_Sheet`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo ZZZZzzzzac/PbDH_Sheet --comments`.
