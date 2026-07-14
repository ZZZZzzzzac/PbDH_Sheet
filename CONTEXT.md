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
One item in the ordered linear sequence of a Character Creation Guide, containing an Author-written plain-text title and instructions plus at most one stable page or Sheet Module target to highlight.
_Avoid_: Custom imperative code

**AI-Readable Documentation**:
Author-facing documentation structured so an AI assistant can reliably generate, modify, and validate System Packages.
_Avoid_: Human-only tutorial

**System Package Validator**:
A tool that checks System Package structure, references, required identifiers, and scripts, with human-facing errors and AI-facing debug logs.
_Avoid_: Strict gameplay value checker

**Sheet Value**:
The written content of a sheet field, stored as text by default like a paper sheet entry.
_Avoid_: Premature numeric type

**Resource Value**:
The author-provided content of a Resource Library entry field, treated as display text unless it is a framework-critical identifier or reference.
_Avoid_: Implied numeric field

**Resource Keyword Search**:
A temporary Resource Library Browser query that matches Author-approved text fields. Space-separated keywords use AND semantics across the searchable fields of one entry and combine with existing exact filters and sorting.
_Avoid_: Dependency filter, Character Data

**Card Detail View**:
A read-only enlarged view of an existing Card Instance, opened from its Card Table context menu.
_Avoid_: Card editor, Resource Library details panel

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

**Resource Picker**:
A button-like Sheet Module that opens a Resource Library for Player selection and emits a transient selection event for Dependency Logic.
_Avoid_: Selection Text when the module is only a trigger and should not display or store a selected value

**Card**:
A PbDH resource presented as a player-usable card, either as text-only content or with card artwork.
_Avoid_: Generic option when the player is meant to handle it like a card

**Card Presentation**:
The way a Resource Library entry is displayed and manipulated as a Card in the Sheet Tool.
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
Player-owned saved data for one character, containing filled values and card state but not the full System Package.
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
- A **Guide Step** targets one **Sheet Module**, one page, or no target; arbitrary selectors, multiple simultaneous targets, and controls inside framework dialogs are not guide targets.
- A Player starts the optional **Character Creation Guide** explicitly from the Sheet Tool toolbar menu; guide position is transient, is never persisted, and every new run starts at the first step.
- A visible **Guide Step** target is scrolled into view; an existing but currently hidden target stays hidden, and the guide falls back to instructions plus a target-unavailable notice without changing derived visibility.
- While a **Guide Step** is active, only its visible target, the guide controls, and any framework dialog opened from that target remain interactive; dimmed content is inert, and the Player may exit with Escape.
- Finishing a **Character Creation Guide** only closes the tour; it does not mean the character is complete or valid and does not trigger saving, validation, export, or printing.
- **Questionnaire Character Creation** is distinct from a **Character Creation Guide**: it discovers Player preferences and recommends resources or paths, while a Character Creation Guide walks a Player through known creation tasks.
- **Questionnaire Character Creation** should not write Character Data directly. If it later offers apply actions, those actions must reuse framework-approved Sheet Module, Dependency Engine, or Card Engine actions; the Character Creation Guide remains presentation-only.
- **Questionnaire Character Creation** is a future plan, not part of the first-version requirement.
- A **Guide Step** depends only on stable target IDs and framework-owned highlighting behavior; it never writes **Character Data** or requests behavior from the highlighted target.
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
- The Base Framework presents every printable page as a fixed A4 portrait page box (210mm × 297mm) with framework-owned inner print margins. It does not scale System Package layouts to fit; an Author is responsible for making each HTML Layout Template fit the available A4 content box. A Sheet Shell surface that must print as an additional page may opt into the same box with `data-print-page="true"`.
- A **Resource Library** stores source entries; **Card Presentation** controls how selected entries appear to Players.
- A **Resource Picker** is an interaction trigger over a **Resource Library**. It does not persist selected resource references into **Character Data** by default.
- A **Card** is a core PbDH concept and may represent many kinds of resources, not only Daggerheart domain cards.
- PbDH Cards are ability/resource references, not a card-game rules engine.
- Player-side Cards are grouped into **Configured Cards**, **Vault Cards**, and **Library Cards**.
- Card movement rules should be checked by **Validation Checks**, not hard-coded into the Card system.
- Author-facing card data requires `ID`, `名称`, and `描述`; other fields are extensible and not fixed in the first-version requirements.
- **Author Data** uses Chinese keys in author-facing formats and may use the same Chinese keys directly in code objects; an English-key mapping layer is not a requirement.
- **Character Data** exports only character-specific state plus a System Package identifier/version, not the complete System Package.
- **Resource Keyword Search** is transient Browser UI state. Field templates may declare `可搜索`; when omitted it follows `默认显示`. With no field template, all normalized text fields are searchable. Search is case-insensitive, trimmed, and never stored in Character Data or Dependency Logic defaults.
- A **Card Detail View** only enlarges the card's existing presentation. It is entered through the Card Table right-click or long-press context menu and does not edit Card Instance state or introduce another Resource Library Browser detail flow.
- First-version **Character Data** stores text and state. System images should be referenced rather than copied, but Player-provided portraits or character art may be stored with the Character Data.
- System Package distribution is file/package based in the first version; package marketplaces, publishing platforms, and full source-code exports are outside the first-version requirement.
- **Display Content**, adventure notes, names, and rule reference pages are all uses of **Sheet Modules**, not separate base features.
- An **HTML Layout Template** may include **Static Layout Content** and module placeholders, but editable Character Data still belongs to **Sheet Modules**.
- A **Countable Resource** uses the same `{current, max}` Character Data and `fillCountable` Dependency Logic contract in both Numeric Presentation and Marker Presentation; presentation choice does not create a new Sheet Module type.
- A **Marker Presentation** renders `current` current-value markers followed by `max - current` remaining-capacity markers. When `max` is absent, it renders only the current-value markers.
- An **HTML Layout Template** must not define interactive form controls or custom behavior; all Player interaction that reads or writes state must use Base Framework **Sheet Modules** or other framework-provided interactive surfaces.
- **Dependency Logic** helps Players avoid table lookup and text copying, but should not imply full automation of game rules.
- **Dependency Logic** may consume a Resource Picker selection event and fill existing Sheet Modules with selected Resource Values.
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
