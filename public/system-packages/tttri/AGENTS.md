# TTTRI System Package Author Rules

## Current stage

Resource review is complete. Implement the functional System Package in Issue order: #308, #309, #310, #311, then #312.

- Add and validate `manifest.json`, Pages, Sheet Modules, Dependencies, Guide, Checks, and Base Layouts as required by the active Issue.
- Keep the first Base Layout plain and functional: mount every Module exactly once, use semantic groups and stable Guide Regions, and contain printable content within A4.
- Do not declare a Skin. Final visual design and Author layout work remain outside this stage.
- Run the standalone resource check after resource changes and the normal package/build/test checks after `manifest.json` exists.

## Sources and authority

- Source text lives under `docs/pbdh/粥/`.
- `docs/pbdh/粥/粥与匕心原版的区别.md` and `docs/pbdh/粥/车卡器设置及用语需求表.md` define approved differences from `daggerheart-core`.
- For duplicate same-name Domain Card records, the later record is authoritative.
- `反制技巧` and `关键情报` are deprecated and must not appear in generated resources.
- Do not infer text corrections from artwork. Confirmed artwork-name corrections are `掎角之锋` and `治愈苦痛`.

## Generated resource structure

- `resources/classes.json`: 7 Classes.
- `resources/subclasses.json`: 140 T1/T2/T3/T4X/T4Y Subclass entries.
- X/Y are elite Subclass stages, not a separate Resource Library.
- `子职提升` is display-only guidance copied from the full matching Profession DOCX paragraphs, with colored runs preserved as Restricted Markdown color directives; update behavior does not read it.
- `希望特性`、`职业特性`、`子职特性` use non-empty fields as explicit overwrite instructions; empty fields preserve current Long Text values.
- `resources/ancestries.json`: 35 individual Ancestries.
- `resources/communities.json`: 15 Communities.
- `resources/domain-cards.json`: 231 Domain Cards.
- `resources/armor.json`: provisional copy from `daggerheart-core`.
- `resources/loot.json`: provisional copy from `daggerheart-core`.
- No Weapons Resource Library; weapon prototypes belong to Subclass entries.

## Transformation boundary

The generator may remove document-only structure, strip embedded image/source links, convert `<br>` to newlines, select approved revisions, and split approved combined Ancestry chapters. It must not clean up or rewrite inline Markdown, wording, punctuation, or rules text during this stage.

Profession Markdown remains the rules-text source. Matching DOCX files provide only colored upgrade annotations for `子职提升`.

## Assets

- Commit optimized runtime WebP only.
- Do not copy PNG originals or Ancestry illustrations.
- Industrial and Mindscape Domain Cards are text Cards.
- `大地的慈悲-昭示`, `摇篮曲-终`, and `归乡邀约-洗礼` are supplemental backs, not selectable entries.

## Review gate

Stop for Author review only when functional behavior, automated checks, and plain A4 containment are complete, or when source wording/visual judgment cannot be resolved from approved documents.
