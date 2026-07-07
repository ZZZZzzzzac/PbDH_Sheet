# Flow Layout Customization PRD and Issue Drafts

GitHub publication status: not published locally because `gh` is not installed in this workspace.

Recommended labels for the PRD issue: `enhancement`, `needs-triage`.

## PRD Draft

### Problem Statement

Authors can currently choose page, section, and module order, but the actual Sheet Tool layout is still mostly fixed by the Base Framework. Every section renders its modules through one automatic grid. Authors cannot declare rows, columns, column widths, module slot sizes, section spacing, page width, or basic layout styling in the System Package.

This means the current Flow Layout is only a first sketch of the documented model. It does not yet give Authors enough control to reproduce different PbDH sheet structures while staying inside the declarative System Package contract.

### Solution

Extend Flow Layout so Authors can declare layout structure and sizing in the System Package while keeping Sheet Renderer as the module that owns layout rendering.

The first implementation should be backward compatible with existing `section.modules` packages and add a richer `section.rows -> columns -> modules` form. Authors can choose row/column structure, column widths, module slot sizes, gaps, padding, alignment, and basic box styling. Sheet Modules remain unaware of layout placement, and Character Data continues to be stored by module ID.

### User Stories

1. As an Author, I want to keep using the current simple `section.modules` shape, so that existing System Packages continue to render.
2. As an Author, I want to group Sheet Modules into rows, so that a page can express intentional horizontal bands.
3. As an Author, I want each row to contain one or more columns, so that related modules can sit side by side.
4. As an Author, I want to set column widths with declarative values, so that important modules can take more space than compact modules.
5. As an Author, I want to set minimum widths for columns, so that the layout wraps cleanly on small screens.
6. As an Author, I want to set gaps, margin, and padding on pages, sections, rows, columns, and module slots, so that a System Package can control density.
7. As an Author, I want to set basic background, border, and corner styling on layout containers, so that sheet regions can be visually grouped.
8. As an Author, I want layout schema validation errors to point to the broken page, section, row, column, or module slot, so that AI or a human can fix the System Package.
9. As a Player, I want customized layouts to remain responsive, so that the Sheet Tool works on desktop and mobile.
10. As a Player, I want layout customization to preserve module behavior, so that text fields, resources, images, and cards still save and export normally.

### Implementation Decisions

- Sheet Renderer remains the owner of Flow Layout; no new Layout Renderer is introduced for this slice.
- System Package section layout is backward compatible:
  - Legacy: `sections[].modules: string[]`.
  - Rich Flow Layout: `sections[].rows[].columns[].modules`.
- Module placements can be either a module ID string or an object with `ID` plus optional layout/style fields.
- Layout customization is limited to structural rows/columns and safe box styling; it is not arbitrary CSS injection.
- Character Data storage remains unchanged and continues to use module IDs.
- Validation walks both legacy and rich layout shapes when checking missing module references.

### Testing Decisions

- Test System Package validation for legacy layout, rich rows/columns layout, and missing module references inside nested placements.
- Test Sheet Renderer output through visible behavior and stable DOM roles/classes rather than internal helper functions.
- Keep existing module interaction tests passing to prove layout changes do not alter Sheet Module state behavior.
- Use the existing demo package as the first rich Flow Layout example.

### Out of Scope

- Drag-and-drop layout editor.
- Overlay Layout / fixed background image positioning.
- Arbitrary Author CSS for the whole page.
- Rich design tokens, themes, or visual editor panels.
- Moving Sheet Module state into layout nodes.

## Issue Drafts

### Issue 1: Add rich Flow Layout schema and validation

Recommended labels: `enhancement`, `needs-triage`.

Type: AFK.

Blocked by: None - can start immediately.

#### What to build

Allow System Packages to describe Flow Layout with rows, columns, module placements, and basic layout style fields, while preserving the legacy `section.modules` shape.

#### Acceptance criteria

- [ ] Existing System Packages using `section.modules` still validate.
- [ ] New System Packages can use `section.rows[].columns[].modules`.
- [ ] Missing module references inside nested row/column placements are reported as validation errors.
- [ ] A section must declare either legacy `modules` or rich `rows`.
- [ ] Types are exported for row, column, placement, and layout style shapes.

### Issue 2: Render row/column Flow Layout in Sheet Renderer

Recommended labels: `enhancement`, `needs-triage`.

Type: AFK.

Blocked by: Issue 1.

#### What to build

Update Sheet Renderer so it renders rich Flow Layout rows and columns, applies declared sizes/styles, and falls back to the existing automatic grid for legacy sections.

#### Acceptance criteria

- [ ] Legacy sections still render with the current responsive module grid.
- [ ] Rich sections render rows and columns in declared order.
- [ ] Column width, min width, gap, padding, alignment, and basic box styles are applied.
- [ ] Sheet Modules still receive the same module config and System Package props.
- [ ] Existing module behavior tests still pass.

### Issue 3: Provide demo package and tests for customizable Flow Layout

Recommended labels: `enhancement`, `needs-triage`.

Type: AFK.

Blocked by: Issues 1 and 2.

#### What to build

Update a demo System Package and tests so Authors and future agents can see the richer Flow Layout shape in use.

#### Acceptance criteria

- [ ] Demo pages include at least two rows and multiple columns with different widths.
- [ ] Tests assert that rich layout containers render and wrap module content correctly.
- [ ] Tests assert that nested missing module references produce validation errors.
- [ ] The docs identify this as Flow Layout, not Overlay Layout.

## Triage Recommendation

All three issues are enhancements. They should start as `needs-triage` if published to GitHub. Once a maintainer confirms the schema vocabulary and styling field names, they can move to `ready-for-agent`.
