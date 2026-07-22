# PbDH Sheet Framework

This context describes a framework for building Powered by Daggerheart character sheet tools. It separates the author-facing framework from the player-facing sheet tool produced from it.

## Language

**Author**:
A person who creates a PbDH system-specific sheet tool by supplying rules, resources, layout, and style decisions.
_Avoid_: User, designer

**Player**:
A person who uses a finished sheet tool to create, edit, save, print, or export a character.
_Avoid_: User

**Base Framework**:
The reusable foundation that provides stable modules, data contracts, extension points, and common sheet-tool capabilities.
_Avoid_: Low-code platform

**System Package**:
A system-specific bundle of rules, resources, page definitions, and styling that plugs into the Base Framework to produce a finished sheet tool.
_Avoid_: Plugin, template, card pack when referring to the whole system

**System Package Skin**:
The system-specific presentation of the Player-facing sheet area. It owns one package-wide scoped CSS file and may optionally provide an HTML Layout Template override for the Sheet Shell or individual Pages. It may change colors, typography, borders, surfaces, decoration, control geometry, static layout content, and module placement, but does not mutate the Base Layout Templates, change the fixed print page box, remove required Sheet Modules, or change Character Data, Dependency Logic, or layout meaning.
_Avoid_: Base Framework theme, behavior variant

**Framework Color Scheme**:
A neutral Light or Dark presentation for Base Framework-owned surfaces such as toolbars, menus, dialogs, Resource Browsers, and validation UI. It preserves compatibility and readability rather than expressing a System Package's game-specific identity.
_Avoid_: System Package Skin, game theme

**Sheet Tool**:
The finished web application used by Players for one specific PbDH system.
_Avoid_: Framework, editor

**Runtime-Visible Page**:
A System Package page currently eligible for Player navigation after its default visibility and Dependency Logic have been applied.
_Avoid_: Current Page

**Current Page**:
The one Runtime-Visible Page currently selected in the Player's page navigation. Selecting it is UI state only and does not change Character Data or determine print eligibility.
_Avoid_: Visible Page

**Author Preview**:
A mode of the existing Player-facing Sheet Tool that lets an Author reload and inspect a System Package under development. It is entered from a Preview action in the toolbar's System Package menu and reuses the normal page, Loader, Validator, Renderer, and Sheet Modules rather than introducing a separate preview page. Its core loop is “save package files, then refresh the browser”; the refresh re-reads a previously authorized directory and runs the normal package pipeline. It does not provide visual editing or promise automatic filesystem change watching.
_Avoid_: Visual editor

**Directory Package Import**:
An enhanced System Package input path that reads selected directory files directly into the shared package VFS and then uses the same normalization, loading, validation, and caching pipeline as zip import. It does not create an intermediate zip.
_Avoid_: Author Preview

**Character Creation Guide**:
An Author-defined linear spotlight tour that explains character creation by dimming the Sheet Tool and highlighting the page or Sheet Module relevant to each step.
_Avoid_: Hard-coded tutorial, arbitrary UI script

**Questionnaire Character Creation**:
A future Player-facing character creation aid that asks preference or psychometric-style questions, scores the answers, and recommends suitable Resource Library entries or character creation paths without directly filling the sheet.
_Avoid_: Character Creation Guide, personality test as rules authority, automatic build generator

**Guide Step**:
One item in the ordered linear sequence of a Character Creation Guide, containing an Author-written plain-text title, Restricted Markdown instructions, and at most one stable page, Sheet Module, or Layout Region target to highlight.
_Avoid_: Custom imperative code

**Layout Region**:
An Author-named safe static HTML container that groups related layout content and Sheet Modules so a Guide Step can spotlight them as one rectangular target.
_Avoid_: Arbitrary selector, simultaneous target list, new Sheet Module

**AI-Readable Documentation**:
Author-facing documentation structured so an AI assistant can reliably generate, modify, and validate System Packages.
_Avoid_: Human-only tutorial

**System Package Validator**:
A tool that checks System Package structure, references, required identifiers, and scripts, with human-facing errors and AI-facing debug logs.
_Avoid_: Strict gameplay value checker

**Sheet Value**:
The written content of a sheet field, stored as text by default like a paper sheet entry.
_Avoid_: Premature numeric type

**Committed Free Text Change**:
A transient Dependency Logic event emitted when a Player leaves a Free Text input or dropdown. Normal input changes still update Character Data and autosave; only the committed event may rebuild declared pure Resource Picker filters.
_Avoid_: Per-keystroke dependency event, persisted Dependency Event

**Derived Text Placeholder**:
A non-persistent Free Text or Long Text placeholder computed by Dependency Logic from a Resource selection. It appears only while the Player Sheet Value is empty and uses the existing gray placeholder output policy.
_Avoid_: Filled Sheet Value, Module Author Data mutation

**Resource Value**:
The author-provided content of a Resource Library entry field, treated as display text unless it is a framework-critical identifier or reference.
_Avoid_: Implied numeric field

**Resource Keyword Search**:
A temporary Resource Library Browser query that matches Author-approved text fields. Space-separated keywords use AND semantics across the searchable fields of one entry and combine with existing exact filters and sorting.
_Avoid_: Dependency filter, Character Data

**Card Detail View**:
A read-only enlarged view of an existing Card Instance, opened from its Card Table context menu.
_Avoid_: Card editor, Resource Library details panel

**Card Indicator**:
A framework-provided colored counter whose non-negative value belongs to one Card Instance and appears as a compact edge badge. Zero is a persistent value; decreasing again at zero removes the indicator.
_Avoid_: Countable Resource, free-position token object

**Sheet Module**:
A reusable author-configured building block such as text, resource picker, image, or display content.
_Avoid_: Feature when referring to primitive sheet capabilities

**Countable Resource**:
A Sheet Module that stores an integer current value and an optional integer maximum. An Author may choose its Numeric Presentation or Marker Presentation without changing its Character Data or Dependency Logic contract.
_Avoid_: Separate counter module for each presentation

**Marker Presentation**:
An Author-selected presentation of a Countable Resource that repeats one Author-defined Unicode grapheme for the current value and, when a finite maximum exists, a different Author-defined Unicode grapheme for the remaining capacity.
_Avoid_: New Sheet Module, text value

**Resource Library**:
An Author-defined collection of selectable system resources such as classes, weapons, abilities, traits, or cards.
_Avoid_: Card deck when referring to the source data

**Stable Resource ID**:
An Author-defined, unique identity for one Resource Entry within its Resource Library. It may use Chinese and should prefer a readable namespace whose meaning remains stable across display-name edits.
_Avoid_: Random hash when a readable stable identity exists, display label treated as disposable identity

**Legacy Resource ID**:
An explicit Author-only alias declared on a Resource Entry solely to migrate previously persisted Resource References to its current Stable Resource ID.
_Avoid_: Name-based lookup, second current ID, Player-visible resource field

**Resource Extension**:
An independently distributed JSON or image-bearing ZIP bundle that targets one System Package and contributes entries to one or more existing or new Resource Libraries without modifying that System Package.
_Avoid_: Updated System Package, resource patch

**Resource Manager**:
A Base Framework surface that lists effective Resource Libraries and their contributors, installs Resource Extensions, and reports extension status for the Current System Package.
_Avoid_: System Package editor, Player-configured Picker links

**Composite Resource**:
A Player-owned resource created for one character by selecting fields from multiple Resource Library entries according to an Author-defined composition.
_Avoid_: Runtime Resource Library entry, temporary card override

**Resource Composer**:
A Sheet Module with fixed Author-defined single-selection source slots, each independently bound to a Resource Library, that routes source fields one-to-one into one stable Composite Resource for each character.
_Avoid_: Resource Picker, Player-defined field mapper, arbitrary transformation script, variable-length resource aggregator

**Resource Output**:
The normalized resource-entry payload emitted by a resource-producing Sheet Module without exposing how that resource was selected or composed.
_Avoid_: Resource Picker event, Composite Resource storage

**Resource Picker**:
A button-like Sheet Module that opens a Resource Library for Player selection and emits a transient selection event for Dependency Logic.
_Avoid_: Selection Text when the module is only a trigger and should not display or store a selected value

**Other Resources Picker**:
An Author-defined Resource Picker that dynamically exposes Resource Libraries not referenced by another Resource Picker in the same System Package.
_Avoid_: Player-configured library links, framework-injected module

**Card**:
A PbDH resource presented as a player-usable card, either as text-only content or with card artwork.
_Avoid_: Generic option when the player is meant to handle it like a card

**Card Presentation**:
The Author-defined templates that derive a Card's name and description presentation from Resource Entry fields, with framework defaults for conventional entries.
_Avoid_: Resource data

**Configured Cards**:
Cards the Player currently has available for use.
_Avoid_: Hand if that implies card-game draw rules

**Vault Cards**:
Cards the Player owns but does not currently have available for use.
_Avoid_: Deck if that implies shuffle/draw mechanics

**Library Cards**:
Cards available in a Resource Library but not yet owned by the Player.
_Avoid_: Market, draw pile

**Author Data**:
Human-editable system data written with Chinese field names so Authors can inspect and modify raw files directly or with AI help.
_Avoid_: English-only internal schema as the author-facing format

**Character Data**:
Player-owned saved data for one character, containing filled values, Composite Resources, and card state but not the full System Package.
_Avoid_: System Package export

**Character Save**:
A local saved instance of Character Data under the Current System Package.
_Avoid_: Cloud account character

**Current System Package**:
The single System Package currently loaded and used by the Base Framework.
_Avoid_: Multi-package workspace

**Display Content**:
Read-only text or image content shown inside a Sheet Tool.
_Avoid_: Separate feature, rules engine

**HTML Layout Template**:
The primary Author-provided layout model that arranges Sheet Modules through safe static HTML, module placeholders, and scoped CSS.
_Avoid_: Custom app code, arbitrary web page

**Static Layout Content**:
Author-provided non-interactive headings, explanatory text, dividers, and decorative content inside an HTML Layout Template.
_Avoid_: Sheet Value, custom form control

**Flow Layout**:
A superseded JSON layout proposal that arranged Sheet Modules through pages, sections, rows, and columns.
_Avoid_: Current author-facing layout model

**Overlay Layout**:
A future page layout model that places Sheet Modules over a fixed background sheet image using coordinates.
_Avoid_: First-version layout

**Dependency Logic**:
Author-defined relationships that reduce lookup work by controlling visibility, filtering choices, or filling text from selected resources.
_Avoid_: Full rules automation

**Derived Source Snapshot**:
The minimal persisted Resource Reference needed to rebuild pure Dependency Logic presentation after loading Character Data.
_Avoid_: Persisted Dependency Event, persisted visibility, Resource Picker value

**Validation Check**:
A read-only rule check that reports warnings or errors based on filled sheet data without changing that data.
_Avoid_: Auto-calculation when the result is not written back

**Validation Script**:
An Author-provided read-only script used only inside a Validation Check to produce text reports, expected values, warnings, or errors from exported sheet data.
_Avoid_: Custom sheet logic, state mutation script

**Framework Check**:
A Base Framework-owned read-only check for common runtime, rendering, or output defects that Author-provided Validation Scripts cannot inspect, such as fitted text still overflowing its fixed display area. Framework Checks are not configurable by Authors and report through the same Validation Report as Validation Checks with a distinct framework source.
_Avoid_: Validation Script, System Package Validator

**Declarative System Package**:
A System Package expressed through data, resources, layouts, styles, guide steps, dependencies, and validation rules rather than arbitrary executable scripts.
_Avoid_: Script plugin

## Relationships

- An **Author** creates one or more **System Packages**.
- A **System Package** plugs into the **Base Framework**.
- The **Base Framework** plus one **System Package** produces one **Sheet Tool**.
- A **System Package Skin** visually owns the System Package sheet area, while the **Framework Color Scheme** remains neutral and applies only to Base Framework-owned surfaces.
- Changing a **System Package Skin** or **Framework Color Scheme** does not change Sheet Modules, Character Data, Dependency Logic, validation behavior, or the semantic meaning of the layout.
- A System Package declares its available **System Package Skins** and default Skin. A Player may select another declared Skin at runtime.
- One selected **System Package Skin** applies consistently to the System Package Shell and all of its Pages. Players do not select different Skins per Page; a Skin may still contain page-specific rules through stable Page selectors.
- The selected **System Package Skin** is a local UI preference and is not part of Character Data.
- A first-version **System Package Skin** may use supported package images for textures and decoration, but cannot bundle font files; it must use fallback-capable system font stacks.
- A System Package retains authoritative Base Layout Templates for its Sheet Shell and Pages. A **System Package Skin** may override any subset of those templates without editing them; every omitted Shell or Page override falls back to its Base Layout Template and still receives the selected Skin's package-wide CSS.
- A Skin HTML override may add safe Static Layout Content and rearrange the existing Sheet Module placeholders within that Shell or Page, subject to the same sanitizer, module-reference, Guide target, and print invariants as a Base Layout Template.
- Each Page and the Sheet Shell retain a fixed semantic ownership of their Sheet Modules across all Skins. A Skin HTML override must expose the same module-placeholder set as its Base Layout Template for that Page or Shell; it may rearrange those placeholders within the owner but cannot move them across Page or Shell boundaries.
- Each **System Package Skin** recommends a Light or Dark **Framework Color Scheme**. The Base Framework follows that recommendation by default, while a Player may keep a local Light or Dark override.
- The **Framework Color Scheme** does not affect printed System Package pages.
- Every Skin declared by an Author must pass normal System Package path, CSS, and asset validation; a broken declared Skin is a package error rather than a Player-selectable degraded option.
- If a locally preferred Skin no longer exists after a System Package update, the Base Framework falls back to that package's current default Skin without blocking Character Data loading.
- A first-version **System Package Skin** is bundled, validated, cached, and distributed with its owning System Package. Independently installed third-party Skin packages are outside the first-version contract.
- `daggerheart-core` initially keeps its current plain presentation as a compatibility and troubleshooting Skin, while its first purpose-designed Skin becomes the package default once complete.
- A **Player** uses a **Sheet Tool** and should not need to understand the **Base Framework**.
- A **Player** imports or selects a **System Package** separately from **Character Data**.
- The first-version runtime uses one **Current System Package** at a time.
- A **Player** may have multiple local **Character Saves** for the **Current System Package**.
- An **Author Preview** helps an **Author** validate a **System Package** by looking at the resulting **Sheet Tool**.
- **Directory Package Import**, **Author Preview**, and module-instance style overrides are separate capabilities: a directory is one package input source, Preview is the reload-and-inspect feedback loop, and style overrides are part of the System Package presentation contract. Author Preview depends on the directory source being re-readable across a browser refresh, but owns the refresh, validation feedback, and preview replacement behavior rather than directory traversal itself.
- Entering **Author Preview** loads the package under development as the normal **Current System Package**, replacing any package previously loaded in that local browser. The normal Player-facing page, persistence rules, and capabilities remain available, including Character Saves, checks, import, and export, so an Author can inspect the complete Player experience and generated data. Preview is not a separate data sandbox, does not back up the previous runtime state, and does not protect same-ID local Character Saves from normal updates; the application remains local-only, so the Author's activity cannot affect other Players.
- **Author Preview** is diagnostic-first: package loading or validation errors are shown explicitly and block the preview instead of falling back to a stale package or hiding defects behind Player-facing recovery behavior. Warnings remain continuously visible but do not block rendering. Diagnostics should identify the source file, configuration path, cause, and a useful repair hint when known. Preview never silently repairs or ignores invalid configuration; the Author fixes the source files and refreshes again.
- **Author Preview** is scoped to the current browser-tab session. A normal page refresh remains in Preview and re-reads the development directory; explicitly exiting, closing the tab, or ending the browser session returns future app launches to Player mode.
- Exiting **Author Preview** only stops refresh-time directory re-reading. It does not restore a previous package; the last successfully loaded development snapshot remains the normal **Current System Package** until replaced through the ordinary package workflow.
- **Directory Package Import** may use broadly available directory-file selection without retaining a re-readable handle. **Author Preview** specifically requires the File System Access API because its refresh loop must re-read the chosen directory. The Preview entry checks support at runtime and reports an explicit warning when the browser cannot provide that capability; ordinary zip and directory import remain available.
- If a Preview directory can no longer be read because permission was denied, revoked, or otherwise lost, Preview remains active but blocks rendering with an explicit diagnostic and offers directory reauthorization or reselection. It does not display a cached package snapshot or silently exit Preview.
- A **System Package** may include at most one **Character Creation Guide** so a **Player** can follow its Author-defined linear explanation without choosing among multiple guides.
- A **Character Creation Guide** is a presentation layer over the existing Sheet Tool; it explains and highlights but does not operate **Sheet Modules**, emit selection events, invoke **Dependency Logic**, manipulate **Cards**, or run **Validation Checks**.
- A first-version **Character Creation Guide** is a linear ordered sequence without branching, loops, or Author-defined step jumps.
- A **Guide Step** explains the next creation task and identifies what to highlight; all editing, resource selection, filtering, text filling, and Card interaction remain ordinary Player behavior outside the guide.
- A Player advances, returns, exits, or finishes a **Character Creation Guide** manually; the guide does not read **Character Data**, infer completion, or automatically advance.
- The Sheet Module highlighted by a **Guide Step** remains interactive, but the guide neither observes the interaction result nor advances in response to it.
- A **Guide Step** targets one **Sheet Module**, one page, one **Layout Region**, or no target; arbitrary selectors, multiple simultaneous targets, and controls inside framework dialogs are not guide targets.
- A Player starts the optional **Character Creation Guide** explicitly from the Sheet Tool toolbar menu; guide position is transient, is never persisted, and every new run starts at the first step.
- A visible **Guide Step** target is scrolled into view; an existing but currently hidden target stays hidden, and the guide falls back to instructions plus a target-unavailable notice without changing derived visibility.
- A Guide Step whose target belongs to another **Runtime-Visible Page** selects that page before resolving spotlight geometry; leaving the Guide does not restore the previous **Current Page**.
- While a **Guide Step** is active, only its visible target, the guide controls, and any framework dialog opened from that target remain interactive; dimmed content is inert, and the Player may exit with Escape.
- Finishing a **Character Creation Guide** only closes the tour; it does not mean the character is complete or valid and does not trigger saving, validation, export, or printing.
- **Questionnaire Character Creation** is distinct from a **Character Creation Guide**: it discovers Player preferences and recommends resources or paths, while a Character Creation Guide walks a Player through known creation tasks.
- **Questionnaire Character Creation** should not write Character Data directly. If it later offers apply actions, those actions must reuse framework-approved Sheet Module, Dependency Engine, or Card Engine actions; the Character Creation Guide remains presentation-only.
- **Questionnaire Character Creation** is a future plan, not part of the first-version requirement.
- A **Guide Step** depends only on stable target IDs and framework-owned highlighting behavior; a **Layout Region** uses a package-wide unique `data-guide-region-id`, and the Guide never writes **Character Data** or requests behavior from the highlighted target.
- **AI-Readable Documentation** is a first-version requirement because non-programmer Authors may rely on AI to create System Packages.
- A **System Package Validator** should be strict about IDs, references, required structural fields, and broken links, but permissive about ordinary **Sheet Values**.
- **Resource Values** are displayed as provided; the Base Framework does not interpret their game meaning.
- A **System Package** composes **Sheet Modules** into pages through **HTML Layout Templates**.
- Page navigation lists **Runtime-Visible Pages** in System Package declaration order and renders one **Current Page** at a time. If the Current Page becomes hidden, the first Runtime-Visible Page becomes current; when none remain, the Sheet Tool shows an empty-page state.
- Printing evaluates all System Package pages independently of the Current Page.
- A page's optional **Print Override** is the `打印` boolean. `true` always includes that page and `false` always excludes it. Without an override, a Runtime-Visible Page prints and a runtime-hidden page does not.
- The **Current Page** is ephemeral reading state. It is not part of Character Data, Character Saves, or browser persistence. It may remain selected while switching Character Saves if still visible, but package reload or browser refresh selects the first Runtime-Visible Page again.
- Page navigation is Base Framework UI. It is hidden when fewer than two Runtime-Visible Pages exist, otherwise lists page names in declaration order with horizontal overflow on narrow screens. Authors do not provide custom navigation markup or behavior.
- Normal reading renders only the Current Page. Export Preview temporarily renders every printable page in declaration order, hides page navigation, and restores the unchanged Current Page on exit. Browser printing and HTML snapshots share this printable-page set; an empty set produces a clear message instead of invoking output.
- The Base Framework presents every printable page as a fixed A4 portrait page box (210mm × 297mm) with zero inner padding. It does not scale System Package layouts to fit; an Author is responsible for declaring the System Package's content inset and making each HTML Layout Template fit the A4 page box. A Sheet Shell surface that must print as an additional page may opt into the same padding-free box with `data-print-page="true"` and owns its content inset through Shell CSS.
- A **Resource Library** stores source entries; **Card Presentation** controls how selected entries appear to Players.
- A **Stable Resource ID** may use Chinese. Current IDs and all declared **Legacy Resource IDs** share one uniqueness namespace within a Resource Library; loading Character Data rewrites matching legacy Card and Derived Source references to the current ID.
- A **Resource Extension** identifies its target by System Package ID and contains one or more explicit Resource Library contributions; each existing target produces a merged runtime view, while each new target creates a separate Resource Library.
- A **Resource Extension** must declare its target System Package ID because the Base Framework cannot infer package compatibility; a contribution with a missing target Resource Library ID means “create a new library” and receives a generated ID.
- A **Resource Extension** targeting an existing Resource Library cannot rename it; the System Package remains authoritative for that library's display name.
- A **Resource Extension** whose target System Package ID differs from the Current System Package is rejected rather than stored for a future package.
- Resource Extension compatibility is scoped only by System Package ID, never by System Package version; package upgrades re-evaluate installed extensions against the current effective libraries.
- If a package upgrade removes or renames an extension's target Resource Library ID, that extension contributes a standalone Resource Library under its declared ID and may be reached through the **Other Resources Picker**.
- An installed **Resource Extension** remains active until an actual validation error or Entry ID conflict occurs; an incompatible extension is disabled with diagnostics without blocking the Current System Package or being deleted automatically.
- A text-only **Resource Extension** is distributed as JSON; an extension with new images is distributed as ZIP with a root `extension.json` and an `assets/**` image tree, while fonts and other binary asset types are not supported.
- System Packages and ZIP **Resource Extensions** automatically discover images under `assets/**`; Author Data references images only by source-relative path, and explicit Asset manifest entries or Author-defined Asset IDs are not part of the contract.
- Image identity is scoped by its owning System Package or Resource Extension plus normalized relative path, so separate sources may use the same `assets/**` path without collision.
- A **Resource Extension** remains stored separately from its target **System Package**; installing one never rewrites the cached or distributed package.
- The **Resource Manager** is opened from the top toolbar's System Package menu and presents effective Resource Libraries as its top-level units, with contributing System Package and Resource Extension details nested beneath each library.
- The **Resource Manager** may uninstall a locally installed Resource Extension but never removes System Package-owned resources; uninstalling recomputes effective libraries without rewriting Character Data, and any resulting stale resource references are reported instead of silently repaired.
- The **Resource Manager** installs a new valid extension immediately, but replacing or uninstalling an extension requires a summary and confirmation because either operation can remove definitions referenced by Character Data; failed validation leaves installed state unchanged.
- Reimporting the same **Resource Extension** ID replaces that extension's complete stored contribution instead of appending duplicate entries.
- When an imported **Resource Extension** or Resource Entry lacks its own stable ID, the Base Framework generates a non-conflicting ID for the installed copy and lets the importer download normalized JSON containing the generated IDs for future maintenance and reliable reimport.
- Installing a **Resource Extension** is rejected as one atomic operation when any contributed Resource Entry ID conflicts with its target System Package or another installed extension; reimport replacement of that same extension is exempt from this conflict check.
- Each Card Table source has one **Card Presentation**. When omitted it renders `名称` as the Card name, `描述` as the description, and other eligible fields as tags; an Author may instead compose both name and description from source fields through declarative text templates.
- A **Resource Picker** is an interaction trigger over a **Resource Library**. It does not persist selected resource references into **Character Data** by default.
- A **Resource Picker** may link one or more Resource Libraries; its Browser displays exactly one library table at a time and replaces the title with a single-choice library dropdown when multiple libraries are available.
- Each explicitly linked Resource Library in a **Resource Picker** owns its own field template and default query; dynamically discovered libraries in an **Other Resources Picker** use inferred fields and no Author-defined default query.
- Linking multiple Resource Libraries changes only which source table the **Resource Picker** displays; selection, multi-select, Dependency Logic emission, and card-creation behavior remain Picker-level and identical to a single-library Picker.
- A multi-library **Resource Picker** keeps separate transient search, filter, and sort state for each library while its Browser is open, initializes each library from its own defaults, and discards all such query state when the Browser closes.
- A System Package defines each **Resource Picker** through one unified multi-library contract or marks it as an **Other Resources Picker**; the superseded single-library authoring shape is not retained because no historical compatibility contract exists.
- In Author Data, a **Resource Picker** declares `资源库` as either a non-empty array of per-library link objects or the literal `"其他"`; each explicit link identifies its library by `ID` and may own field templates and a default query.
- An **Author** may declare and place one **Other Resources Picker** so independently added Resource Libraries remain reachable without Player configuration; the Base Framework does not inject one because only the Author owns package layout.
- The **Other Resources Picker** only discovers standalone Resource Libraries contributed by Resource Extensions. A System Package-owned Library is never an Other option, and a contribution merged into an existing target remains part of that target instead of appearing separately. A standalone Library explicitly linked by an ordinary **Resource Picker** or used by a **Resource Composer** is also excluded.
- An **Other Resources Picker** may create Cards through a Card Table's single dynamic Other-Libraries source; the Card Instance still records the actual standalone Resource Library and Entry IDs, so rendering and stale-reference diagnostics remain source-specific.
- The same Resource Library may be referenced by multiple ordinary **Resource Pickers**, each with its own default query and presentation; one ordinary reference is sufficient to exclude that library from the **Other Resources Picker**.
- A **Resource Composer** lets a **Player** choose source entries but never lets the Player define or alter the Author-owned field composition.
- A **Resource Composer** emits its completed **Composite Resource** through the same transient resource-selection contract as a **Resource Picker**, so downstream **Dependency Logic** does not distinguish how the selected entry was produced.
- A **Resource Composer** is stateless: all Resource Library inputs are declared as slots on that Composer, selected source references are not persisted, and only its output Composite Resource belongs to Character Data.
- Each **Resource Composer** owns exactly one stable **Composite Resource** per character; recomposing updates that output instead of appending another.
- **Resource Picker** and **Resource Composer** emit the same **Resource Output** contract; **Dependency Logic** consumes the normalized payload without branching on its origin.
- A **Composite Resource** is derived from one or more **Resource Library** entries, belongs to exactly one character, and is persisted in that character's **Character Data**.
- A **Card Instance** may reference a **Composite Resource** so the generated card survives saving, export, import, and reload without modifying Author-owned **Resource Libraries**.
- A Card Instance backed by a **Resource Extension** keeps a Resource Definition reference rather than copying the complete Resource Output; replacing an Extension updates same-ID definitions, while removed Entry IDs leave explicit stale references and diagnostics.
- A **Card** is a core PbDH concept and may represent many kinds of resources, not only Daggerheart domain cards.
- PbDH Cards are ability/resource references, not a card-game rules engine.
- Player-side Cards are grouped into **Configured Cards**, **Vault Cards**, and **Library Cards**.
- Card movement rules should be checked by **Validation Checks**, not hard-coded into the Card system.
- Author-facing card data requires `ID`, `名称`, and `描述`; other fields are extensible and not fixed in the first-version requirements.
- **Author Data** uses Chinese keys in author-facing formats and may use the same Chinese keys directly in code objects; an English-key mapping layer is not a requirement.
- **Character Data** exports only character-specific state plus a System Package identifier/version, not the complete System Package.
- **Resource Keyword Search** is transient Browser UI state. Field templates may declare `可搜索`; when omitted it follows `默认显示`. With no field template, all normalized text fields are searchable. Search is case-insensitive, trimmed, and never stored in Character Data or Dependency Logic defaults.
- A **Card Detail View** only enlarges the card's existing presentation. It is entered through the Card Table right-click or long-press context menu and does not edit Card Instance state or introduce another Resource Library Browser detail flow.
- A Card Definition may reference another Card Definition in the same Resource Library as its reverse face. A Card Instance retains its front identity while face, quarter-turn rotation, and Card Indicator values remain Player-owned Character Data.
- A Card Definition or Composite Resource may instead carry a direct card-back image path when its reverse has no separate rules definition. Direct card-back art keeps the front Definition identity and only changes the rendered artwork while the Card Instance is showing its back.
- Card Instance state values are Author-defined through the Card Table. An Author may map selected states to Card Face background colors; unmapped states retain the framework default, and only the state string belongs to Character Data.
- Every Card Instance can add up to ten **Card Indicators** without Author configuration. Each receives a stable color from the framework palette; badges stay outside Card Face text fitting and are not Countable Resource Sheet Modules or Dependency Logic targets.
- First-version **Character Data** stores text and state. System images should be referenced rather than copied, but Player-provided portraits or character art may be stored with the Character Data.
- System Package distribution is file/package based in the first version; package marketplaces, publishing platforms, and full source-code exports are outside the first-version requirement.
- **Display Content**, adventure notes, names, and rule reference pages are all uses of **Sheet Modules**, not separate base features.
- An **HTML Layout Template** may include **Static Layout Content** and module placeholders, but editable Character Data still belongs to **Sheet Modules**.
- A **Countable Resource** uses the same `{current, max}` Character Data and `fillCountable` Dependency Logic contract in both Numeric Presentation and Marker Presentation; presentation choice does not create a new Sheet Module type.
- A **Countable Resource** may emit `countableChanged` after Player edits. Dependency Logic may use a bounded declarative integer calculation over Countable current values and persisted Resource Selection counts; it does not execute arbitrary formulas or scripts.
- A **Free Text** Sheet Module updates its **Sheet Value** during input, but emits a **Committed Free Text Change** only on blur. Dependency Logic may combine declared non-empty Free Text sources into one Resource Picker default field filter; Resource Libraries and Browsers never read Character Data directly.
- Pure default filters derived from **Committed Free Text Changes** rebuild from existing Character Data after load, import, or Character Save switch without persisting or replaying the event.
- A Resource selection may produce a **Derived Text Placeholder** through Dependency Logic. It rebuilds from the source snapshot, does not write Character Data, and disappears visually when the Player enters a Sheet Value.
- A **Marker Presentation** renders `current` current-value markers followed by `max - current` remaining-capacity markers. When `max` is absent, it renders only the current-value markers.
- An **HTML Layout Template** must not define interactive form controls or custom behavior; all Player interaction that reads or writes state must use Base Framework **Sheet Modules** or other framework-provided interactive surfaces.
- **Dependency Logic** helps Players avoid table lookup and text copying, but should not imply full automation of game rules.
- **Dependency Logic** may consume a Resource Picker selection event and fill existing Sheet Modules with selected Resource Values.
- A **Derived Source Snapshot** is saved only for a Resource Picker that feeds a pure derived action; it records stable Resource References, not copied Resource Values or the final derived presentation.
- Loading or switching **Character Data** rebuilds `setVisibility`, Resource Picker default filters, and derived `readOnlyDisplay` content from **Derived Source Snapshots** and current Composite Resources.
- Rebuilding derived presentation never replays Character Data writes, text append, Countable Resource patches, Card creation, or other one-time effects.
- A **Validation Check** may read many **Sheet Modules**, but it does not write values back to them.
- A **Validation Script** may express unusual rule-specific calculations, but it only reads exported sheet data and only outputs a report.
- A **Framework Check** may inspect framework-owned rendered state after layout and font fitting, but it does not expose DOM access to Authors, mutate Character Data, or replace the System Package Validator.
- Manual checking and pre-output checking merge **Framework Check** issues with Author-defined **Validation Check** issues into one report while preserving their distinct sources.
- A **Declarative System Package** should be enough for first-version sheet behavior; arbitrary scripts that mutate sheet state are outside the first-version requirement.
- First-version **System Packages** use **HTML Layout Templates** as the only Author-facing layout model; **Flow Layout** is superseded and should not be expanded.

## Example Dialogue

> **Dev:** "Should the Player be able to edit the list of classes?"
> **Domain Expert:** "No. The Author defines classes in the System Package; the Player selects from them in the Sheet Tool."

> **Dev:** "Is the Author Preview a low-code editor?"
> **Domain Expert:** "No. It is a fast feedback loop for checking changes made in the System Package, often with AI assistance."

> **Dev:** "Should adventure notes be a built-in feature?"
> **Domain Expert:** "No. It is a large free-text Sheet Module with an Author-defined title and placement."

> **Dev:** "Should armor threshold automatically update when level changes?"
> **Domain Expert:** "Not in the base requirement. A Validation Check can report the expected value and warn if the filled value differs."

> **Dev:** "Can an Author write custom JavaScript to modify sheet state?"
> **Domain Expert:** "No. First-version Authors describe the System Package declaratively; custom scripts are not part of the Author-facing contract."

> **Dev:** "Can an Author write a script to check a strange threshold formula?"
> **Domain Expert:** "Yes, as a Validation Script. It reads the whole sheet export and reports expected values, warnings, or errors, but cannot change the sheet."

> **Dev:** "Do dependencies change when we later add a background-image sheet layout?"
> **Domain Expert:** "No. Layout only changes module placement and size; module data, dependencies, and validation stay the same."

> **Dev:** "Is a card just a dropdown option?"
> **Domain Expert:** "No. The source may come from a Resource Library, but the Player handles the result as a Card with its own presentation and table-use interactions."

> **Dev:** "Should the Card system enforce how many cards can be configured?"
> **Domain Expert:** "No. The Card system lets Players move and display cards; a Validation Check reports rule violations."

> **Dev:** "Why are card data keys Chinese?"
> **Domain Expert:** "Because Authors need to read and edit raw Author Data directly, often with AI assistance."

> **Dev:** "Should a character export include every card definition?"
> **Domain Expert:** "No. The System Package is imported or cached separately; Character Data only stores the character's own state."

> **Dev:** "Can the first version manage many installed systems?"
> **Domain Expert:** "No. It loads one Current System Package; multi-package management can come later."

> **Dev:** "Is the character creation guide a custom script?"
> **Domain Expert:** "No. The Author declares guide steps. The Base Framework runs those steps and only uses existing framework actions."

> **Dev:** "Can a guide step decide whether a character build is legal?"
> **Domain Expert:** "No. The guide only explains and highlights; all rule legality belongs in Validation Checks."

> **Dev:** "Does a Character Save include image files?"
> **Domain Expert:** "Usually no for System Package images, but yes for Player-provided portraits or character art."

> **Dev:** "Is documentation secondary?"
> **Domain Expert:** "No. The framework depends on AI-Readable Documentation so Authors and AI assistants can produce valid System Packages."

> **Dev:** "Should a level field reject non-integer text?"
> **Domain Expert:** "No. A Sheet Value is text by default; only framework-critical identifiers and references need strict validation."

> **Dev:** "Should a card level be parsed as a number?"
> **Domain Expert:** "No. Resource Values are strings by default; if a System Package needs numeric interpretation, that belongs in Validation Checks."

> **Dev:** "Is Questionnaire Character Creation just another Character Creation Guide?"
> **Domain Expert:** "No. A Character Creation Guide helps a Player execute known steps; Questionnaire Character Creation asks preference questions to recommend suitable resources or creation paths."

## Flagged Ambiguities

- "User" can mean **Author** or **Player**. Use the specific term because their needs and permissions are different.
- "Feature" can mean either a user-visible outcome or a reusable **Sheet Module**. Prefer naming the underlying module when discussing the Base Framework.
- "Character creation guide" can mean a static article or an interactive **Character Creation Guide**. Use the formal term when the System Package declares steps that the Base Framework runs.
- "Questionnaire character creation" can mean recommendation, automatic character generation, or a quiz-like guide UI. In this project it currently means preference discovery and resource recommendation only.
- The best timing for **Validation Checks** is unresolved: likely candidates are live preview, manual check, save, import, and export/print.
- "Custom script" is ambiguous. **Validation Scripts** are allowed for read-only checks; scripts that modify sheet state or implement custom UI behavior are not part of the first-version requirement.
