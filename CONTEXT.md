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

**Author Preview**:
A feedback surface that lets an Author inspect the Sheet Tool while developing a System Package.
_Avoid_: Visual editor

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

**Sheet Module**:
A reusable author-configured building block such as text, resource picker, image, or display content.
_Avoid_: Feature when referring to primitive sheet capabilities

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
- A **Resource Library** stores source entries; **Card Presentation** controls how selected entries appear to Players.
- A **Resource Picker** is an interaction trigger over a **Resource Library**. It does not persist selected resource references into **Character Data** by default.
- A **Card** is a core PbDH concept and may represent many kinds of resources, not only Daggerheart domain cards.
- PbDH Cards are ability/resource references, not a card-game rules engine.
- Player-side Cards are grouped into **Configured Cards**, **Vault Cards**, and **Library Cards**.
- Card movement rules should be checked by **Validation Checks**, not hard-coded into the Card system.
- Author-facing card data requires `ID`, `名称`, and `描述`; other fields are extensible and not fixed in the first-version requirements.
- **Author Data** uses Chinese keys in author-facing formats and may use the same Chinese keys directly in code objects; an English-key mapping layer is not a requirement.
- **Character Data** exports only character-specific state plus a System Package identifier/version, not the complete System Package.
- First-version **Character Data** stores text and state. System images should be referenced rather than copied, but Player-provided portraits or character art may be stored with the Character Data.
- System Package distribution is file/package based in the first version; package marketplaces, publishing platforms, and full source-code exports are outside the first-version requirement.
- **Display Content**, adventure notes, names, and rule reference pages are all uses of **Sheet Modules**, not separate base features.
- An **HTML Layout Template** may include **Static Layout Content** and module placeholders, but editable Character Data still belongs to **Sheet Modules**.
- An **HTML Layout Template** must not define interactive form controls or custom behavior; all Player interaction that reads or writes state must use Base Framework **Sheet Modules** or other framework-provided interactive surfaces.
- **Dependency Logic** helps Players avoid table lookup and text copying, but should not imply full automation of game rules.
- **Dependency Logic** may consume a Resource Picker selection event and fill existing Sheet Modules with selected Resource Values.
- A **Validation Check** may read many **Sheet Modules**, but it does not write values back to them.
- A **Validation Script** may express unusual rule-specific calculations, but it only reads exported sheet data and only outputs a report.
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
