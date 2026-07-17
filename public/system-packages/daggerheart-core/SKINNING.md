# daggerheart-core Skin contract

Start with [System Package Skin Author Guide](../../../docs/system-package/author-guide/13-system-package-skins.md) and [Skin Reference](../../../docs/system-package/reference/skins.md).

## Package-specific boundaries

- Base HTML lives in `layouts/*.html`; never edit it for one Skin.
- Base structural CSS lives in `layouts/*.css`.
- `skins/plain.css` defines the current neutral values and is the compatibility baseline, not the design target.
- New Skin CSS belongs at `skins/<skin-id>/skin.css`.
- Optional HTML overrides belong under the same Skin directory and are registered in `manifest.json`.
- Skin images belong at `assets/skins/<skin-id>/**`.

`plain.css` exposes the current `--dh-*` package tokens for sheet, shell, Beast Forms, Ranger Companion, lines, ink and system font stacks. A new Skin may override those tokens and the stable Framework module tokens at `:scope`, then add targeted rules where tokens are insufficient.

All five Page IDs and the Shell have fixed meaning. An override may rearrange modules only inside its matching owner. It cannot change Page metadata, A4 sizing, Guide behavior, Character Data, Dependencies, Validation Checks or Card behavior.

Before handoff, verify every runtime-visible Page, hidden conditional Page, the Shell card area, Guide targets, narrow viewport and browser print preview.
