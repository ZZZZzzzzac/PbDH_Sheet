---
name: create-countable-icons
description: Design, create, integrate, and validate paired marked/unmarked image icons for countableResource modules in PbDH System Packages. Use when an Author asks to replace text or emoji markers, create themed Countable Resource icons for one or more resources, distinguish good-vs-bad accumulation semantics, reuse the workflow for another System Package, or audit existing marker assets and module mappings.
---

# Create Countable Icons

Create a coherent icon pair for each Countable Resource, wire the images into the System Package, and prove the assets work at runtime size. Preserve module state semantics; change presentation only.

## Workflow

1. Read every applicable `AGENTS.md`. Read the package's own author rules.
2. Locate the package manifest and module source. Read the repository's current Countable Resource and asset contracts; never rely on a remembered schema.
3. Inspect all target modules, active Skins, existing package icons, and visual references. Record for each resource:
   - module ID and label;
   - whether more marks mean better, worse, or neutral state;
   - current maximum and marker size;
   - intended symbol and palette.
4. Measure the proposed batch before adding it when the repository requires an asset budget. Prefer existing icon directories and naming conventions; define a convention before adding a directory.
5. Read [references/icon-design.md](references/icon-design.md). Draft one compact specification covering the whole family. Ask only when resource meaning or visual direction cannot be inferred safely.
6. Choose native SVG when the repository already uses vectors or the icon renders at UI scale. Use raster generation only when the requested visual cannot be represented cleanly as code-native geometry; then follow the available image-generation skill.
7. Create two distinct assets per resource: `marked` and `unmarked`. Keep a shared silhouette. Encode direction with geometry as well as color.
8. Add or update an automated assertion for the intended module-to-asset mapping. Run it once before integration when practical, then make it pass.
9. Update only target `countableResource` Marker Descriptors. Do not change IDs, `{current,max}` semantics, bounds, defaults, Dependency Logic, or layout unless separately requested.
10. Run `scripts/audit_countable_icons.py <package-root> [modules-file]` from this Skill. Fix every error. Warnings require explicit review.
11. Produce a contact sheet showing every pair at actual marker size on light and dark backgrounds. Prefer installed local renderers; do not install dependencies. Check silhouette, state distinction, clipping, contrast, and repeated-marker rhythm.
12. Run package validation, focused tests, full tests/build required by repository rules, and `git diff --check`. Respect local approval rules for browser automation.
13. Report changed paths, mapping, direction semantics, asset count/raw/packaged bytes, preview, commands run, and skipped checks.

## Hard rules

- Treat repository contracts as authority. A typical image descriptor is `{"类型":"图片","资源路径":"assets/icons/resource-name-marked.svg"}`, but verify locally.
- Use package-relative forward-slash paths under `assets/**`.
- Create static trusted SVG: no script, event handler, external URL, `foreignObject`, animation, or embedded base64.
- Design at final size first. Default to the module's configured marker size; never assume 20px.
- Make marked/unmarked readable in grayscale and for color-vision deficiencies. Bad accumulation: crack, slash, alarm, depletion. Good accumulation: fill, light, rise, completion.
- Avoid copied game icons, logos, faction marks, or trademark geometry. Translate mood into original geometry, palette, density, and material language.
- Keep assets small. No source masters, generated intermediates, duplicate exports, or preview files inside the package.
- Preserve user changes and keep the diff surgical.

## Audit script

Run:

```powershell
python <skill-dir>/scripts/audit_countable_icons.py <system-package-root> [modules-json]
```

Exit `0` means mappings, files, SVG safety, XML structure, and size measurements passed. Exit `1` means at least one contract-independent asset defect. Package Validator remains authoritative for repository-specific schema and runtime rules.
