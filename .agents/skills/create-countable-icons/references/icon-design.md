# Countable Icon Design Reference

## Family specification

Before drawing, make one table:

| Module ID | Label | Direction | Shared silhouette | Marked geometry | Unmarked geometry | Accent |
| --- | --- | --- | --- | --- | --- | --- |
| `stress` | Stress | worse | alarm plate | bolt / crack | stable ring | orange |
| `hope` | Hope | better | beacon plate | filled light / rays | outline light | yellow |

`Direction` means what increasing `current` communicates:

- `worse`: damage, strain, depletion, contamination, spent armor;
- `better`: hope, charge, proficiency, momentum, progress;
- `neutral`: quantity without value judgment.

Do not reverse Character Data to make the picture convenient. The icon follows existing `current` semantics.

## Pair grammar

Keep both states recognizably the same resource:

- same outer silhouette and optical size;
- same center of mass and safe area;
- marked state changes fill plus one structural cue;
- unmarked state remains quieter but visible;
- no state depends on color alone.

Useful structural cues:

| Direction | Marked cues | Unmarked cues |
| --- | --- | --- |
| Worse | crack, slash, alarm wedge, missing segment, compression | intact plate, stable ring, complete shield |
| Better | filled core, rays, upward chevron, completed segment | outline core, dormant light, open chevron |
| Neutral | solid fill, tally notch | outline fill, empty tally |

## Small-size geometry

- Prefer square `viewBox`, usually `0 0 32 32`.
- Keep at least 2 viewBox units of outer padding for a 32-unit canvas.
- At 20px output, keep important strokes about 1–2 screen pixels. Avoid hairlines and tiny holes.
- Use few bold shapes. Test repeated runs such as `XXXOOO`, not only single enlarged icons.
- Use `fill` for primary masses; reserve strokes for outer separation and simple internal structure.
- Add a dark outer edge plus a light neutral unmarked fill so both states survive light and dark Skins.
- Avoid gradients, blur, filters, shadows, text, and detail that disappears below 24px unless the package style demands them and tests prove them readable.

## Palette

Derive colors from active Skins and existing package icons. Keep each SVG self-contained because Marker images do not inherit Skin CSS reliably.

- Bad state: package danger/orange/red accent plus dark outline.
- Good state: package cyan/yellow/green accent plus dark outline.
- Unmarked: off-white or pale gray fill, medium-dark internal symbol, dark outline.
- Verify grayscale separation through fill density and geometry.

Theme inspiration may guide palette, industrial density, or framing. Never trace or reproduce a game's existing icon, logo, faction emblem, or trademark geometry.

## Naming

Follow package conventions. Default when none exist:

```text
assets/icons/resource-<resource>-marked.svg
assets/icons/resource-<resource>-unmarked.svg
```

Use stable lowercase ASCII names. Keep preview/contact-sheet outputs outside the System Package.

## Contact sheet

Show every resource twice:

1. light background;
2. dark background.

For each background show:

- label;
- three marked plus three unmarked at actual configured size;
- one enlarged marked/unmarked pair for inspection.

Reject the family if any actual-size row clips, merges into an unreadable block, loses the unmarked state, or makes the accumulation direction ambiguous.

## Final review

- Every target has exactly two different referenced assets.
- More marks visually match better/worse/neutral semantics.
- Shape, not color alone, distinguishes state.
- Both states work on light and dark surfaces.
- Repeated rows remain scannable at runtime size.
- SVG is static, local, script-free, and compact.
- No unrelated module, state, Dependency, layout, or Skin behavior changed.
