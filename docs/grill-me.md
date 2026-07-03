# Set up Matt Pocock skills

> [$setup-matt-pocock-skills](C://Users//zinge//.agents//skills//setup-matt-pocock-skills//SKILL.md)

<details><summary>7 previous messages</summary>

> 使用 `setup-matt-pocock-skills`：先读规则，再按它检查/补齐本仓库的 agent 配置。
>
> <details><summary>Ran a command</summary>
>
> - Ran `Get-Content -LiteralPath 'C:\Users\zinge\.agents\skills\setup-matt-pocock-skills\SKILL.md' -Raw`
>
> </details>
>
> 远程仓库是[ZZZZzzzzac/PbDH_Sheet](https://github.com/ZZZZzzzzac/PbDH_Sheet) 链接上, issue也走它
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-Content -LiteralPath '.git\config' -Raw`
> - Ran `Get-ChildItem -LiteralPath . -Force | Select-Object -ExpandProperty Name`
> - Ran `if (Test-Path -LiteralPath 'CLAUDE.md') { Get-Content -LiteralPath 'CLAUDE.md' -Raw }`
> - Ran `git remote -v`
> - Ran `if (Test-Path -LiteralPath 'AGENTS.md') { Get-Content -LiteralPath 'AGENTS.md' -Raw }`
> - Ran `Get-ChildItem -LiteralPath . -Recurse -Directory -Filter adr | Select-Object -ExpandProperty FullName`
>
> </details>
>
> 收到。A 定为 GitHub：`ZZZZzzzzac/PbDH_Sheet`，issues 走 GitHub Issues。
>
> **B：Triage Labels**
> `triage` skill 会用 5 个状态标签流转 issue。若 GitHub 仓库没有已配置的一套标签，直接用默认名最省事：
>
> - `needs-triage`
> - `needs-info`
> - `ready-for-agent`
> - `ready-for-human`
> - `wontfix`
>
> 是否就用这 5 个默认标签？如果要改，直接给我映射。
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-ChildItem -LiteralPath 'D:\Fish\TRPG\PbDH_sheet' -Force | Format-Table -AutoSize Name,Mode,Length`
> - Ran `if (Test-Path -LiteralPath 'CONTEXT.md') { Get-Content -LiteralPath 'CONTEXT.md' -Raw }`
> - Ran `if (Test-Path -LiteralPath 'docs\agents') { Get-ChildItem -LiteralPath 'docs\agents' -Force | Select-Object -ExpandProperty Name }`
> - Ran `if (Test-Path -LiteralPath '.scratch') { Get-ChildItem -LiteralPath '.scratch' -Force | Select-Object -ExpandProperty Name }`
> - Ran `Get-Location`
> - Ran `if (Test-Path -LiteralPath 'CONTEXT-MAP.md') { Get-Content -LiteralPath 'CONTEXT-MAP.md' -Raw }`
>
> </details>
>
> 我已记录：issue tracker 使用 GitHub Issues，仓库为 `ZZZZzzzzac/PbDH_Sheet`。
>
> 等你确认 B：是否使用默认 5 个 triage 标签。
</details>

我已记录：issue tracker 使用 GitHub Issues，仓库为 `ZZZZzzzzac/PbDH_Sheet`。

等你确认 B：是否使用默认 5 个 triage 标签。

> 什么B?你是不是把问题放到思考里了?

<details><summary>1 previous message</summary>

> 是，我这边没表达清楚。不是放到思考里，是我按 skill 流程把决策分成 A/B/C，但你没看到前置上下文就会很突兀。
>
> 当前进度：
>
> A 已确认：issue 走 GitHub，仓库 `ZZZZzzzzac/PbDH_Sheet`。
>
> 现在问的是 B：issue 状态标签用什么名字。默认 5 个是：
>
> ```text
> needs-triage
> needs-info
> ready-for-agent
> ready-for-human
> wontfix
> ```
>
> 直接用默认吗？如果你没特别配置过 GitHub labels，就用默认最省事。
</details>

是，我这边没表达清楚。不是放到思考里，是我按 skill 流程把决策分成 A/B/C，但你没看到前置上下文就会很突兀。

当前进度：

A 已确认：issue 走 GitHub，仓库 `ZZZZzzzzac/PbDH_Sheet`。

现在问的是 B：issue 状态标签用什么名字。默认 5 个是：

```text
needs-triage
needs-info
ready-for-agent
ready-for-human
wontfix
```

直接用默认吗？如果你没特别配置过 GitHub labels，就用默认最省事。

> 就用这个

<details><summary>1 previous message</summary>

> B 定为默认标签。继续 C。
>
> **C：Domain Docs**
> 这些工程技能会读项目背景文档，避免每次从零猜：
>
> - `CONTEXT.md`：项目领域语言、核心概念、边界
> - `docs/adr/`：架构决策记录
>
> 你的仓库当前目录看起来还是空的/未检出内容，也没有 `CONTEXT.md`、`CONTEXT-MAP.md`、`docs/adr/`。
>
> 建议用 **single-context**：根目录一个 `CONTEXT.md`，一个 `docs/adr/`。这个项目不是大型 monorepo，没必要上 `CONTEXT-MAP.md`。
>
> 确认用 `single-context` 吗？确认后我会给你看将要写入的草稿，再动文件。
</details>

B 已确认：使用默认 5 个标签。

现在只剩 C：domain docs 布局。建议用 `single-context`，也就是根目录一个 `CONTEXT.md`，架构决策放 `docs/adr/`。
确认用这个吗？确认后我给你看要写入的草稿。

> 确认

<details><summary>3 previous messages</summary>

> C 定为 `single-context`。我先取模板，下一步给你看完整草稿；另外当前仓库根目录没有 `AGENTS.md`/`CLAUDE.md`，按 skill 规则我需要让你选要创建哪一个。
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'C:\Users\zinge\.agents\skills\setup-matt-pocock-skills\triage-labels.md' -Raw`
> - Ran `Get-Content -LiteralPath 'C:\Users\zinge\.agents\skills\setup-matt-pocock-skills\issue-tracker-github.md' -Raw`
> - Ran `Get-Content -LiteralPath 'C:\Users\zinge\.agents\skills\setup-matt-pocock-skills\domain.md' -Raw`
>
> </details>
>
> 确认。当前草稿如下；你确认后我再写文件。
>
> 需要你先选一个根配置文件：当前仓库没有 `AGENTS.md` 或 `CLAUDE.md`。按你的规则和这个项目习惯，我建议创建 `AGENTS.md`。
>
> 将写入 `AGENTS.md`：
>
> ```markdown
> ## Agent skills
>
> ### Issue tracker
>
> Issues and PRDs are tracked in GitHub Issues for `ZZZZzzzzac/PbDH_Sheet`. See `docs/agents/issue-tracker.md`.
>
> ### Triage labels
>
> Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.
>
> ### Domain docs
>
> Single-context repo: read root `CONTEXT.md` and `docs/adr/` when present. See `docs/agents/domain.md`.
> ```
>
> 还会创建：
>
> ```text
> docs/agents/issue-tracker.md
> docs/agents/triage-labels.md
> docs/agents/domain.md
> ```
>
> 内容来自 skill 模板，`issue-tracker.md` 我会把仓库固定写成 `ZZZZzzzzac/PbDH_Sheet`，避免因为当前目录还不是 git repo 时 `gh` 推断失败。
>
> 确认创建 `AGENTS.md` 并写入这 3 个配置文件吗？
</details>

确认。当前草稿如下；你确认后我再写文件。

需要你先选一个根配置文件：当前仓库没有 `AGENTS.md` 或 `CLAUDE.md`。按你的规则和这个项目习惯，我建议创建 `AGENTS.md`。

将写入 `AGENTS.md`：

```markdown
## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `ZZZZzzzzac/PbDH_Sheet`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: read root `CONTEXT.md` and `docs/adr/` when present. See `docs/agents/domain.md`.
```

还会创建：

```text
docs/agents/issue-tracker.md
docs/agents/triage-labels.md
docs/agents/domain.md
```

内容来自 skill 模板，`issue-tracker.md` 我会把仓库固定写成 `ZZZZzzzzac/PbDH_Sheet`，避免因为当前目录还不是 git repo 时 `gh` 推断失败。

确认创建 `AGENTS.md` 并写入这 3 个配置文件吗？

> AGENTS.md. 走codex工具的路线

<details><summary>5 previous messages</summary>

> 执行：创建 `AGENTS.md` 和 `docs/agents/*.md`，只写这次 skill 需要的配置。
>
> <details><summary>Created 4 files, ran a command</summary>
>
> - Ran `New-Item -ItemType Directory -Force -Path 'docs\agents' | Out-Null`
> - Wrote `./AGENTS.md` (+13 -0)
> - Wrote `./docs/agents/domain.md` (+35 -0)
> - Wrote `./docs/agents/issue-tracker.md` (+22 -0)
> - Wrote `./docs/agents/triage-labels.md` (+15 -0)
>
> </details>
>
> 验证文件已落盘。
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'docs\agents\issue-tracker.md' -Raw`
> - Ran `Get-Content -LiteralPath 'AGENTS.md' -Raw`
> - Ran `Get-ChildItem -Recurse -File | Select-Object -ExpandProperty FullName`
>
> </details>
>
> 已完成 setup。
>
> 写入了：
>
> - [AGENTS.md](./AGENTS.md)
> - [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md)
> - [docs/agents/triage-labels.md](./docs/agents/triage-labels.md)
> - [docs/agents/domain.md](./docs/agents/domain.md)
>
> 验证过文件已落盘。后续 `to-issues`、`to-prd`、`triage`、`diagnose`、`tdd`、`improve-codebase-architecture`、`zoom-out` 会按这些配置读 GitHub Issues、默认 triage labels、single-context domain docs。
</details>

已完成 setup。

写入了：

- [AGENTS.md](./AGENTS.md)
- [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md)
- [docs/agents/triage-labels.md](./docs/agents/triage-labels.md)
- [docs/agents/domain.md](./docs/agents/domain.md)

验证过文件已落盘。后续 `to-issues`、`to-prd`、`triage`、`diagnose`、`tdd`、`improve-codebase-architecture`、`zoom-out` 会按这些配置读 GitHub Issues、默认 triage labels、single-context domain docs。

> 现在去D:\Fish\TRPG\DaggerHeart-CharacterSheet仓库, 总结其中的功能. 具体实现可以不管, 我只需要它对用户的功能列表, 作为我这个仓库的需求

<details><summary>13 previous messages</summary>

> 我会只读目标仓库，抽用户可见功能，不碰实现、不写文件。先看目录和说明文档。
>
> <details><summary>Ran 4 commands</summary>
>
> - Ran `if (Test-Path -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\AGENTS.md') { Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\AGENTS.md' -Raw }`
> - Ran `if (Test-Path -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\README.md') { Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\README.md' -Raw }`
> - Ran `Get-ChildItem -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet' -Force | Select-Object Name,Mode,Length`
> - Ran `rg --files 'D:\Fish\TRPG\DaggerHeart-CharacterSheet'`
>
> </details>
>
> 目标仓库有 `CLAUDE.md`，先读它和关键页面/文档，避免漏功能。
>
> <details><summary>Ran 5 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\validate.md' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\app\page.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\CLAUDE.md' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\package.json' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\character-sheet.tsx' -Raw`
>
> </details>
>
> 继续抽用户功能入口：底部工具栏、存档管理、卡牌/武器/护甲选择、卡牌编辑器、卡包指南。
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\app\card-editor\page.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\card-drawer.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\modals\card-selection-modal.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\app\card-manager\page.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\modals\character-management-modal.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\layout\bottom-dock.tsx' -Raw`
>
> </details>
>
> 再读具体角色卡页和辅助组件，输出会按“可作为本仓库需求”的方式整理。
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\character-sheet-page-adventure-notes.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\modals\seal-dice-export-modal.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\character-sheet-page-ranger-companion.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\notebook\floating-notebook.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\character-sheet-page-two.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\guide\guide-content.ts' -Raw`
>
> </details>
>
> 补一下导入导出、页面显示和角色数据字段，避免需求漏掉隐藏功能。
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\hooks\use-export-handlers.ts' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\ui\dual-page-toggle.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\ui\save-switcher.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\lib\sheet-data.ts' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\layout\page-display.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\ui\page-visibility-dropdown.tsx' -Raw`
>
> </details>
>
> 最后看卡包编辑器的可见编辑项，需求会拆成“核心/可选/低优先级”。
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\app\card-editor\components\toolbar.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\app\card-editor\components\definitions-manager.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\data\list\pages.ts' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\app\card-editor\components\card-tabs\index.tsx' -Raw`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components\modals\custom-card-creator-modal\index.tsx' -Raw`
> - Ran `rg -n "function CustomCardCreatorModal|CustomCardCreatorModal|快速|自定义卡牌|保存|图片|骰子|计数器|添加" 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\components' 'D:\Fish\TRPG\DaggerHeart-CharacterSheet\app\card-editor'`
>
> </details>
>
> 结论：这个仓库不是单纯“角色卡表单”。它是 **多角色存档 + 可打印角色卡 + 卡牌库/卡包管理 + 建卡引导 + 导出工具**。
> 给你这个仓库做需求，可以按下面拆。
>
> **核心需求**
> 1. 角色存档管理
> 支持最多 10 个角色存档；新建、切换、重命名、复制、删除；当前存档自动保存到浏览器本地。
>
> 2. 角色卡编辑
> 用户能填写/编辑：姓名、等级、头像、职业、子职业、种族、社群、六属性、闪避、生命、压力、希望、护甲、熟练度、经历、物品、金币、武器、护甲、背景描述。
>
> 3. 规则项选择器
> 职业、子职业、种族、社群、领域卡、武器、护甲都不是纯手填，而是从资料库弹窗选择；选择后自动带入名称、描述、数值、标签等信息。
>
> 4. 多页角色卡
> 默认第一页/第二页；可选页面包括伙伴页、扩展页、冒险笔记页。页面按 A4 纸布局，目标是屏幕编辑和打印都可用。
>
> 5. 卡牌系统
> 角色有“聚焦卡组”和“库存卡组”；能添加、删除、移动卡牌；卡牌可按职业/背景/领域/扩展筛选；鼠标悬停或点击可预览大图。
>
> 6. 建卡指引
> 内置一步步建卡流程：选职业、选子职业、选种族、选社群、分配属性、记录基础值、选武器护甲、添加物品、写背景、选领域卡、添加经历、完成检查。
>
> 7. 导入导出
> 支持导出 PDF、HTML、JSON；支持从 JSON/HTML 导入角色，导入时创建新存档；导出前等待图片加载，避免打印缺图。
>
> 8. 打印预览
> 进入导出预览模式后显示全部可打印页面；可从预览里导出 PDF/HTML/JSON，也能退出预览。
>
> **增强需求**
> 9. 卡包管理
> 用户可导入自定义卡包，格式包括 JSON、DHCB、ZIP；支持多文件批量导入；显示导入结果、错误、重复 ID、图片数量。
>
> 10. 卡包启用/禁用
> 已导入卡包可查看、启用、禁用、删除；可查看全部卡牌；显示卡包名称、数量、导入时间、文件名、类型。
>
> 11. 卡包编辑器
> 用户可视化创建/编辑卡包；支持职业、种族、社群、子职业、领域、变体卡；支持卡牌图片上传、图片 URL、实时预览、验证、导入、导出。
>
> 12. 自定义卡牌
> 在选择卡牌时可快速创建一张自定义变体卡，不必先进入完整卡包编辑器。
>
> 13. 预定义字段管理
> 卡包编辑器里维护职业、种族、社群、领域、变体类型列表；创建卡牌时从这些词表里选，减少错别字和格式漂移。
>
> 14. 图片能力
> 角色头像、伙伴图、冒险笔记立绘、卡牌图片都支持上传/裁剪/预览；卡包图片可随 DHCB 一起打包。
>
> 15. 页面显示控制
> 用户可开关可选页面；桌面端支持单页/双页模式；移动端做单页滚动。
>
> 16. 快捷键
> 左右方向键切页；数字键跳页；`Ctrl + 数字` 切换存档；`Esc` 退出预览或弹窗。
>
> 17. 悬浮笔记本
> 游戏中可打开一个可拖动笔记本；支持文本行、计数器、骰子行；最多 5 页，每页最多 10 行。
>
> 18. 骰子导出
> 生成适配海豹骰子的 `.st` 命令；可复制文本、下载骰子脚本、查看骰子使用指南。
>
> **DaggerHeart 专属，PbDH 未必照搬**
> 19. 游侠伙伴页
> 伙伴名称、图片、描述、经历、攻击方式、伤害骰、压力、训练选项。除非 PbDH 有类似宠物/随从系统，否则不必第一期做。
>
> 20. 伊科尼斯/主板扩展页
> 这是特定规则扩展页。PbDH 没有对应机制就不要照搬，保留“可选扩展页框架”即可。
>
> 21. DaggerHeart 卡牌分类
> 职业、种族、社群、子职业、领域、变体是 DaggerHeart 术语。PbDH 应换成你的系统术语，不要硬继承命名。
>
> **建议优先级**
> 第一期做：角色存档、角色卡编辑、多页 A4、规则项选择器、卡组/卡牌选择、JSON/PDF/HTML 导出。
> 第二期做：建卡指引、卡包导入、卡包启用禁用、自定义卡牌。
> 第三期做：完整卡包编辑器、悬浮笔记本、骰子导出、双页模式、特殊扩展页。
>
> 我只读了目标仓库，没改你当前仓库文件。主要入口看的是 [app/page.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/app/page.tsx)、[components/character-sheet.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/components/character-sheet.tsx)、[app/card-manager/page.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/app/card-manager/page.tsx)、[app/card-editor/page.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/app/card-editor/page.tsx)。
</details>

结论：这个仓库不是单纯“角色卡表单”。它是 **多角色存档 + 可打印角色卡 + 卡牌库/卡包管理 + 建卡引导 + 导出工具**。
给你这个仓库做需求，可以按下面拆。

**核心需求**
1. 角色存档管理
支持最多 10 个角色存档；新建、切换、重命名、复制、删除；当前存档自动保存到浏览器本地。

2. 角色卡编辑
用户能填写/编辑：姓名、等级、头像、职业、子职业、种族、社群、六属性、闪避、生命、压力、希望、护甲、熟练度、经历、物品、金币、武器、护甲、背景描述。

3. 规则项选择器
职业、子职业、种族、社群、领域卡、武器、护甲都不是纯手填，而是从资料库弹窗选择；选择后自动带入名称、描述、数值、标签等信息。

4. 多页角色卡
默认第一页/第二页；可选页面包括伙伴页、扩展页、冒险笔记页。页面按 A4 纸布局，目标是屏幕编辑和打印都可用。

5. 卡牌系统
角色有“聚焦卡组”和“库存卡组”；能添加、删除、移动卡牌；卡牌可按职业/背景/领域/扩展筛选；鼠标悬停或点击可预览大图。

6. 建卡指引
内置一步步建卡流程：选职业、选子职业、选种族、选社群、分配属性、记录基础值、选武器护甲、添加物品、写背景、选领域卡、添加经历、完成检查。

7. 导入导出
支持导出 PDF、HTML、JSON；支持从 JSON/HTML 导入角色，导入时创建新存档；导出前等待图片加载，避免打印缺图。

8. 打印预览
进入导出预览模式后显示全部可打印页面；可从预览里导出 PDF/HTML/JSON，也能退出预览。

**增强需求**
9. 卡包管理
用户可导入自定义卡包，格式包括 JSON、DHCB、ZIP；支持多文件批量导入；显示导入结果、错误、重复 ID、图片数量。

10. 卡包启用/禁用
已导入卡包可查看、启用、禁用、删除；可查看全部卡牌；显示卡包名称、数量、导入时间、文件名、类型。

11. 卡包编辑器
用户可视化创建/编辑卡包；支持职业、种族、社群、子职业、领域、变体卡；支持卡牌图片上传、图片 URL、实时预览、验证、导入、导出。

12. 自定义卡牌
在选择卡牌时可快速创建一张自定义变体卡，不必先进入完整卡包编辑器。

13. 预定义字段管理
卡包编辑器里维护职业、种族、社群、领域、变体类型列表；创建卡牌时从这些词表里选，减少错别字和格式漂移。

14. 图片能力
角色头像、伙伴图、冒险笔记立绘、卡牌图片都支持上传/裁剪/预览；卡包图片可随 DHCB 一起打包。

15. 页面显示控制
用户可开关可选页面；桌面端支持单页/双页模式；移动端做单页滚动。

16. 快捷键
左右方向键切页；数字键跳页；`Ctrl + 数字` 切换存档；`Esc` 退出预览或弹窗。

17. 悬浮笔记本
游戏中可打开一个可拖动笔记本；支持文本行、计数器、骰子行；最多 5 页，每页最多 10 行。

18. 骰子导出
生成适配海豹骰子的 `.st` 命令；可复制文本、下载骰子脚本、查看骰子使用指南。

**DaggerHeart 专属，PbDH 未必照搬**
19. 游侠伙伴页
伙伴名称、图片、描述、经历、攻击方式、伤害骰、压力、训练选项。除非 PbDH 有类似宠物/随从系统，否则不必第一期做。

20. 伊科尼斯/主板扩展页
这是特定规则扩展页。PbDH 没有对应机制就不要照搬，保留“可选扩展页框架”即可。

21. DaggerHeart 卡牌分类
职业、种族、社群、子职业、领域、变体是 DaggerHeart 术语。PbDH 应换成你的系统术语，不要硬继承命名。

**建议优先级**
第一期做：角色存档、角色卡编辑、多页 A4、规则项选择器、卡组/卡牌选择、JSON/PDF/HTML 导出。
第二期做：建卡指引、卡包导入、卡包启用禁用、自定义卡牌。
第三期做：完整卡包编辑器、悬浮笔记本、骰子导出、双页模式、特殊扩展页。

我只读了目标仓库，没改你当前仓库文件。主要入口看的是 [app/page.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/app/page.tsx)、[components/character-sheet.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/components/character-sheet.tsx)、[app/card-manager/page.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/app/card-manager/page.tsx)、[app/card-editor/page.tsx](D:/Fish/TRPG/DaggerHeart-CharacterSheet/app/card-editor/page.tsx)。

> 将这些功能落到一个文档里. 然后总结另一个的功能 `docs/pbdh/我车何`. 只需要实际功能, 各种动画\美化之类的不管

<details><summary>12 previous messages</summary>

> 计划：
> 1. 读取当前仓库规范和 `docs/pbdh/我车何`，验证：确认文件/目录存在和内容范围。
> 2. 新建/更新一个需求功能文档，验证：文档包含 DaggerHeart 功能清单和“我车何”实际功能清单。
> 3. 复读文档检查落盘，验证：路径和关键章节正确。
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\AGENTS.md' -Raw`
> - Ran `rg --files 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh'`
> - Ran `if (Test-Path -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何') { Get-ChildItem -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何' -Force | Select-Object Name,Mode,Length } else { Write-Output 'NOT_FOUND' }`
> - Ran `Get-ChildItem -LiteralPath 'D:\Fish\TRPG\PbDH_sheet' -Force | Select-Object Name,Mode,Length`
> - Ran `if (Test-Path -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh') { Get-ChildItem -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh' -Force | Select-Object Name,Mode,Length }`
> - Ran `if (Test-Path -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs') { Get-ChildItem -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs' -Force | Select-Object Name,Mode,Length }`
>
> </details>
>
> 已确认 `docs/pbdh/我车何` 是两个 HTML 工具。继续读功能入口和界面文本。
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何\我的车技如何？GM工具改 (1).html' -Raw`
> - Ran `rg -n "<title>|<h[1-6]|button|onclick|function |id=|class=|导出|导入|保存|清空|添加|删除|复制|下载|上传|打印|生成|随机|计算|标签|input|select|textarea" 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何'`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何\我的车技如何？玩家车卡器.html' -Raw`
>
> </details>
>
> GM 文件输出被截断了，我只补读实际文本区间，不读样式。
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `rg -n "<h1|<h2|<h3|<h4|<li|<b>|<p>|onclick=|alert\(" 'D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何\我的车技如何？GM工具改 (1).html'`
> - Ran `$p='D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何\我的车技如何？GM工具改 (1).html'; $lines=Get-Content -LiteralPath $p; $lines[370..585]`
> - Ran `$p='D:\Fish\TRPG\PbDH_sheet\docs\pbdh\我车何\我的车技如何？GM工具改 (1).html'; $lines=Get-Content -LiteralPath $p; $lines[586..705]`
>
> </details>
>
> 写入 `docs/功能需求清单.md`：放两个来源的实际功能，排除动画和纯视觉美化。
>
> <details><summary>Created a file</summary>
>
> - Wrote `./docs/功能需求清单.md` (+309 -0)
>
> </details>
>
> 文档已写。现在复读检查关键章节和路径。
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Select-String -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md' -Pattern '^## |^### '`
> - Ran `Get-Content -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md' -Raw`
> - Ran `Get-Item -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md' | Select-Object FullName,Length,LastWriteTime`
>
> </details>
>
> 已落文档：[docs/功能需求清单.md](./docs/功能需求清单.md)
>
> 内容包括：
>
> - `DaggerHeart-CharacterSheet` 的用户功能清单
> - `docs/pbdh/我车何` 里玩家车卡器的实际功能
> - `docs/pbdh/我车何` 里 GM 工具的实际功能
> - 对本仓库的阶段化需求转化建议
> - 明确排除动画、美化、纸张做旧、仪表盘彩蛋特效等非功能项
>
> 验证：已复读文档，章节和文件路径都正常。
>
> <details><summary>Plan</summary>
>
> - [x] 读取仓库规范与目标资料，确认内容范围
> - [x] 写入功能需求文档
> - [x] 复读验证文档内容
>
> </details>
</details>

已落文档：[docs/功能需求清单.md](./docs/功能需求清单.md)

内容包括：

- `DaggerHeart-CharacterSheet` 的用户功能清单
- `docs/pbdh/我车何` 里玩家车卡器的实际功能
- `docs/pbdh/我车何` 里 GM 工具的实际功能
- 对本仓库的阶段化需求转化建议
- 明确排除动画、美化、纸张做旧、仪表盘彩蛋特效等非功能项

验证：已复读文档，章节和文件路径都正常。

> 在本仓库我打算做一个比较通用的powered by daggerheart规则的角色卡系统. 或者说做一个基础框架, 让不同的pbdh系统作者再这个框架上很容易的搭建他们自己的车卡器
> 像这样的桌游/TRPG系统, 通常都是以线下实际纸笔游戏为起点设计, 线上工具其实是一种对线下纸笔的模拟. 也就是说其实不管什么样的规则, 角色卡上的功能无非是:
> 1. 自由输入的文本框(如姓名)
> 2. 可加减的资源(如生命值: 6/6, 有当前值和上限)
> 3. 存在依赖关系的文本(如选择职业A, 才能选择特长B)
> 4. 从一系列备选文本中选择一个(同样也有3的依赖关系)
> 5. 绝大部分内容都是纯文本, 可以格式化成json等形式. 少部分功能会用到图片
>
> 而一些功能是不分规则都通用的:
> 1. 导入导出
> 2. 打印
> 3. 上传头像/立绘
> 4. 冒险笔记/人物背景
>
> 但很多东西会随着规则的改变和变化:
> 1. 不同规则的资源不同, 依赖关系不同
> 2. 可能有不同的美术风格和页面布局
> 3. 某些规则可能有超出底层框架预设的特殊需求(比如某种规则复杂的资源)
>
> 并且我想让并非程序员的其他pbdh作者能够用这个基础框架搭出他们满意的车卡器, 能够自由调整布局, 颜色, 样式. 也能自由的上传自己规则里的各种资源(职业/特长等等), 并给定依赖关系. 之前可能不得不做成类似一种低代码平台的感觉, 现在有AI我在想是不是可以由基础框架确定好各种接口/文档/可调整的样式等, 然后让ai帮助规则作者把他的意图和资源本文做成类似模板/插件的形式, 加入基础框架里, 形成最后一个合适的车卡器.
>
> 首先先去那个功能需求清单里, 将每一项具体是哪一种抽象功能标注出来(自由文本框/可加减资源/带依赖的文本/选择的文本), 不知道或者不确定的问我

<details><summary>2 previous messages</summary>

> 先卡一下分类口径，否则会把文档标坏。
>
> 你给的 4 类能覆盖“角色卡字段”，但覆盖不了很多功能项，比如：导入导出、打印、存档管理、页面切换、卡包导入、悬浮笔记本、GM 仪表盘、规则速查。
>
> 我建议在文档里用两层标注：
>
> ```text
> 字段抽象:
> - 自由文本
> - 可加减资源
> - 带依赖文本
> - 选择文本
> - 图片字段
>
> 功能抽象:
> - 通用服务
> - 页面/布局
> - 数据库/资料库
> - 规则速查
> - 计数器/追踪器
> - 容器/列表
> - 自动计算/自动填充
> - 特殊规则
> ```
>
> 确认用这个扩展口径吗？
> 如果你坚持只用 4 类，我会把不属于 4 类的项目统一标成 `非字段功能/待拆分`。
>
> 需要你先定分类口径。
>
> 4 类只能覆盖字段，盖不住导入导出、打印、存档、页面切换、GM 仪表盘这些功能。建议扩展成：
>
> `自由文本`、`可加减资源`、`带依赖文本`、`选择文本`、`图片字段`、`通用服务`、`页面/布局`、`资料库`、`规则速查`、`计数器/追踪器`、`容器/列表`、`自动计算/自动填充`、`特殊规则`
>
> 确认用这个口径标注吗？
</details>

需要你先定分类口径。

4 类只能覆盖字段，盖不住导入导出、打印、存档、页面切换、GM 仪表盘这些功能。建议扩展成：

`自由文本`、`可加减资源`、`带依赖文本`、`选择文本`、`图片字段`、`通用服务`、`页面/布局`、`资料库`、`规则速查`、`计数器/追踪器`、`容器/列表`、`自动计算/自动填充`、`特殊规则`

确认用这个口径标注吗？

> 计数器就等于可加减资源, 没有区别. 自动计算填充就是"带依赖/逻辑的文本", 不要"特殊规则", 具体特殊在哪给我说, 我判断是不是真特殊. 资料库也等同于选择文本, 都是从一系列文本之中选择一个然后填充

<details><summary>9 previous messages</summary>

> 口径收敛了：不用“特殊规则”桶，能归到底层抽象就归；真归不进去的我会标 `待判断` 并写明原因。现在直接改文档并复读验证。
>
> <details><summary>Created a file</summary>
>
> - Wrote `./docs/功能需求清单.md` (+330 -0)
>
> </details>
>
> `apply_patch` 删除重建失败，我改用机械批量重写。不是删除文件，只覆盖同一路径内容。
>
> <details><summary>Ran a command</summary>
>
> - Ran ``@'
> # 功能需求清单
>
> 本文档只记录用户可用功能。动画、视觉风格、主题美化、纸张做旧、仪表盘特效等不计入需求。
>
> ## 抽象功能标注
>
> - `[自由文本]`：用户自由输入文本、长文本、备注、说明。
> - `[可加减资源]`：有当前值、上限、勾选格、加减按钮、计数器、骰级、进度条等状态量。
> - `[带依赖/逻辑的文本]`：内容由其他选择或状态决定，或需要根据规则自动填充、校验、回滚、迁移。
> - `[选择文本]`：从预设文本/条目/资料库中选择一个或多个，并填入角色卡或工具状态。
> - `[图片字段]`：头像、立绘、卡牌图等图片上传、裁剪、引用。
> - `[通用工具]`：导入、导出、打印、本地保存、页面切换、快捷键等不属于角色规则字段但所有车卡器常用的工具能力。
> - `[待判断]`：当前无法确定是否应抽象为基础框架能力，需要进一步判断。
>
> ## 来源
>
> - `D:\Fish\TRPG\DaggerHeart-CharacterSheet`
> - `docs/pbdh/我车何/我的车技如何？玩家车卡器.html`
> - `docs/pbdh/我车何/我的车技如何？GM工具改 (1).html`
>
> ## DaggerHeart 角色卡工具功能
>
> ### 角色与存档
>
> - `[通用工具]` 支持多个角色存档。
> - `[通用工具]` 支持新建、切换、重命名、复制、删除角色存档。
> - `[自由文本]` 支持点击当前存档名快速重命名。
> - `[通用工具]` 支持自动保存当前角色数据到本地浏览器存储。
> - `[通用工具]` 支持从 JSON 创建新存档。
> - `[通用工具]` 支持从 HTML 创建新存档。
> - `[带依赖/逻辑的文本]` 支持旧数据导入时补齐缺失字段。
>
> ### 角色卡编辑
>
> - `[自由文本]` 支持填写角色基础信息：姓名、等级。
> - `[图片字段]` 支持填写角色头像。
> - `[选择文本]` 支持选择职业、子职业、种族、社群。
> - `[带依赖/逻辑的文本]` 选择职业后可自动带入职业相关初始信息。
> - `[自由文本]` 支持编辑六项属性：敏捷、力量、灵巧、本能、风度、知识。
> - `[选择文本]` 支持标记施法属性。
> - `[可加减资源]` 支持编辑生命槽、压力槽、希望、护甲槽。
> - `[自由文本]` 支持编辑闪避。
> - `[可加减资源]` 支持编辑熟练度。
> - `[自由文本]` 支持编辑伤害阈值、护甲值、护甲加值。
> - `[自由文本]` 支持编辑经历及经历数值。
> - `[自由文本]` 支持编辑物品栏、金币、备用武器。
> - `[自由文本]` 支持编辑职业特性文本。
> - `[图片字段]` 支持上传并裁剪角色图片。
>
> ### 装备选择
>
> - `[选择文本]` 支持从武器库选择主武器、副武器、备用武器。
> - `[带依赖/逻辑的文本]` 选择武器后自动填写名称、类型/负荷/范围、伤害、特性。
> - `[自由文本]` 支持自定义武器数据。
> - `[选择文本]` 支持从护甲库选择护甲。
> - `[带依赖/逻辑的文本]` 选择护甲后自动填写护甲名称、护甲值、阈值、特性。
>
> ### 卡牌与卡组
>
> - `[选择文本]` 支持内置卡牌库。
> - `[选择文本]` 支持自定义卡牌库。
> - `[选择文本]` 支持卡牌类型：职业、种族、社群、子职业、领域、变体。
> - `[选择文本]` 支持角色聚焦卡组。
> - `[选择文本]` 支持角色库存卡组。
> - `[选择文本]` 支持在聚焦卡组和库存卡组之间移动卡牌。
> - `[选择文本]` 支持删除卡牌。
> - `[选择文本]` 支持添加卡牌到下一个空位。
> - `[带依赖/逻辑的文本]` 聚焦卡组前 5 个特殊卡位与职业、子职业、种族、社群选择同步。
> - `[选择文本]` 支持按卡包筛选卡牌。
> - `[选择文本]` 支持按类别筛选卡牌。
> - `[选择文本]` 支持按等级筛选卡牌。
> - `[选择文本]` 支持按名称、描述、显示字段搜索卡牌。
> - `[通用工具]` 支持无限滚动浏览卡牌。
> - `[选择文本]` 支持卡牌详情预览。
> - `[自由文本]` 支持在选卡时快速创建一张自定义变体卡。
>
> ### 页面与显示
>
> - `[通用工具]` 默认有第一页和第二页角色卡。
> - `[选择文本]` 可选显示游侠伙伴页。
> - `[选择文本]` 可选显示主板扩展页。
> - `[选择文本]` 可选显示冒险笔记页。
> - `[通用工具]` 页面按 A4 尺寸组织，支持打印。
> - `[通用工具]` 支持页面标签切换。
> - `[选择文本]` 支持页面显示管理。
> - `[通用工具]` 支持单页模式。
> - `[通用工具]` 支持桌面端双页模式。
> - `[通用工具]` 支持左右箭头切换页面。
> - `[通用工具]` 支持数字键跳转页面。
> - `[通用工具]` 支持 `Ctrl + 数字` 切换角色存档。
> - `[通用工具]` 支持 `Esc` 退出导出预览。
> - `[选择文本]` 支持图片模式和文字模式切换。
>
> ### 第二页与升级
>
> - `[自由文本]` 支持填写角色描述、背景、外貌、动机等文本。
> - `[选择文本]` 支持显示和编辑卡组。
> - `[选择文本]` 支持按等级段记录升级选项。
> - `[选择文本]` 支持勾选升级项。
> - `[带依赖/逻辑的文本]` 支持升级项影响生命槽上限、压力槽上限、熟练度、闪避值、经历数值、属性值。
> - `[带依赖/逻辑的文本]` 支持撤销部分升级并尝试回滚对应数值。
> - `[选择文本]` 支持从升级项选择领域卡。
> - `[选择文本]` 支持从升级项选择子职业卡。
>
> ### 可选角色附页
>
> - `[自由文本]` 游侠伙伴页支持伙伴名称、伙伴描述、伙伴经历、伙伴经历数值、攻击方式。
> - `[图片字段]` 游侠伙伴页支持伙伴图片。
> - `[可加减资源]` 游侠伙伴页支持伤害骰、闪避、压力、压力上限。
> - `[选择文本]` 游侠伙伴页支持训练选项。
> - `[图片字段]` 冒险笔记页支持角色立绘。
> - `[自由文本]` 冒险笔记页支持角色简介、玩家信息、人物小传、大事记、冒险履历。
> - `[自由文本]` 主板扩展页支持扩展型装备/武装记录，包括武器信息、升级槽、升级项、材料/碎片记录、电子货币等。
> - `[待判断]` 主板扩展页的“材料/碎片/电子货币”等可能应拆成多个可加减资源和自由文本字段，需看目标 PbDH 系统是否真的需要这种复杂结构。
>
> ### 建卡指引
>
> - `[通用工具]` 支持按步骤引导建卡。
> - `[带依赖/逻辑的文本]` 引导内容包括：选择职业、选择子职业、选择种族、选择社群、分配属性、记录等级/闪避/生命、记录压力与希望、选择初始武器、选择初始护甲、添加初始物品、填写背景与关系、选择能力卡牌、添加经历或特质、最终检查。
> - `[带依赖/逻辑的文本]` 部分步骤会根据当前角色选择显示对应提示。
> - `[带依赖/逻辑的文本]` 部分步骤会检查当前表单是否满足继续条件。
>
> ### 导入导出与打印
>
> - `[通用工具]` 支持打开导出预览。
> - `[通用工具]` 支持导出 PDF。
> - `[通用工具]` 支持导出 HTML。
> - `[通用工具]` 支持导出 JSON。
> - `[通用工具]` 支持等待图片加载后再导出。
> - `[带依赖/逻辑的文本]` 支持导出时按角色信息生成页面标题。
> - `[通用工具]` 支持从 HTML 导入角色。
> - `[通用工具]` 支持从 JSON 导入角色。
> - `[通用工具]` 支持导出到海豹骰子。
> - `[带依赖/逻辑的文本]` 支持生成 `.st` 属性命令。
> - `[通用工具]` 支持复制骰子导出文本。
> - `[通用工具]` 支持下载配套骰子脚本。
> - `[通用工具]` 支持查看骰子使用指南。
>
> ### 卡包管理
>
> - `[通用工具]` 支持导入自定义卡包。
> - `[通用工具]` 支持导入格式：JSON、DHCB、ZIP。
> - `[通用工具]` 支持多文件批量导入。
> - `[带依赖/逻辑的文本]` 支持显示导入成功、失败、错误信息、重复 ID、导入卡牌数量、导入图片数量。
> - `[选择文本]` 支持查看所有卡牌。
> - `[选择文本]` 支持查看某个卡包内的卡牌。
> - `[选择文本]` 支持启用或禁用卡包。
> - `[通用工具]` 支持删除单个卡包。
> - `[通用工具]` 支持清空所有自定义卡牌。
> - `[可加减资源]` 支持查看本地存储使用情况。
> - `[通用工具]` 支持强制初始化所有本地数据。
> - `[通用工具]` 支持查看卡包创作指南、AI 创作指南和示例 JSON。
>
> ### 卡包编辑器
>
> - `[通用工具]` 支持新建卡包。
> - `[通用工具]` 支持导入卡包。
> - `[通用工具]` 支持导出卡包。
> - `[带依赖/逻辑的文本]` 支持验证卡包。
> - `[选择文本]` 支持查看关键字/预定义字段列表。
> - `[自由文本]` 支持编辑卡包基础信息。
> - `[自由文本]` 支持编辑职业卡。
> - `[自由文本]` 支持编辑种族卡。
> - `[自由文本]` 支持编辑社群卡。
> - `[自由文本]` 支持编辑子职业卡。
> - `[自由文本]` 支持编辑领域卡。
> - `[自由文本]` 支持编辑变体卡。
> - `[选择文本]` 支持卡牌预览。
> - `[选择文本]` 支持卡牌列表快速跳转。
> - `[通用工具]` 支持复制卡牌。
> - `[通用工具]` 支持删除卡牌。
> - `[图片字段]` 支持上传卡牌图片。
> - `[图片字段]` 支持输入图片 URL。
> - `[通用工具]` 支持导出包含图片的卡包。
> - `[选择文本]` 支持管理预定义字段：职业、种族、社群、领域、变体类型。
>
> ### 悬浮笔记本
>
> - `[通用工具]` 支持打开/关闭悬浮笔记本。
> - `[通用工具]` 支持拖动笔记本位置。
> - `[通用工具]` 支持最多 5 页笔记。
> - `[通用工具]` 支持添加、删除、切换页面。
> - `[通用工具]` 支持每页最多 10 行。
> - `[自由文本]` 支持文本行。
> - `[可加减资源]` 支持计数器行。
> - `[可加减资源]` 支持骰子行。
> - `[自由文本]` 支持行内容编辑。
> - `[通用工具]` 支持删除行。
> - `[通用工具]` 支持调整行顺序。
> - `[可加减资源]` 支持添加骰子、删除骰子、重投骰子、手动编辑骰子值。
>
> ## “我的车技如何？”玩家车卡器功能
>
> ### 角色档案
>
> - `[自由文本]` 支持填写角色姓名。
> - `[选择文本]` 支持选择角色原型。
> - `[自由文本]` 支持填写面部选角。
> - `[自由文本]` 支持填写角色气质。
> - `[带依赖/逻辑的文本]` 选择原型后自动填充增益。
> - `[带依赖/逻辑的文本]` 选择原型后自动填充缺陷。
>
> ### 玩家资源
>
> - `[可加减资源]` 支持选择燃料骰：`d12`、`d10`、`d8`、`d6`、`d4`、`OUT OF GAS`。
> - `[可加减资源]` 支持填写燃料点。
>
> ### 行事风格
>
> - `[选择文本]` 支持从预设行事风格列表中选择 4 项。
> - `[带依赖/逻辑的文本]` 4 项分别对应：专家 +3、擅长 +2、熟练 +1、生疏 -1。
>
> ### 纪念物与经历
>
> - `[自由文本]` 支持填写 3 个纪念物。
> - `[自由文本]` 每个纪念物支持填写一条对应经历。
> - `[带依赖/逻辑的文本]` 页面说明经历可通过花费 1 燃料点获得 +2 加值。
>
> ### 座驾
>
> - `[选择文本]` 支持选择车型。
> - `[带依赖/逻辑的文本]` 选择车型后自动填充座驾骰。
> - `[带依赖/逻辑的文本]` 选择车型后自动填充座驾特性。
> - `[可加减资源]` 支持记录座驾损伤点。
> - `[自由文本]` 支持填写 3 个装备栏位。
>
> ### 文件与打印
>
> - `[通用工具]` 支持保存车卡为 JSON。
> - `[通用工具]` 支持读取 JSON 车卡。
> - `[通用工具]` 支持打印或导出 PDF。
>
> ## “我的车技如何？”GM 工具功能
>
> ### 顶层模块
>
> - `[通用工具]` 支持在 3 个模块之间切换：调查档案、生存指南、GM 仪表盘。
>
> ### 调查档案
>
> - `[自由文本]` 提供司机资料。
> - `[带依赖/逻辑的文本]` 提供司机“杀戮”规则：花费 1 恐惧点，`1d20 + 杀戮骰` 对抗玩家反应。
> - `[带依赖/逻辑的文本]` 提供限速到杀戮骰的映射：1-5 为 d4，6-10 为 d6，11-15 为 d8，16-20 为 d10，21+ 为 d12。
> - `[选择文本]` 提供司机行为速查：躲开那个司机、惊恐、路怒、极速、催眠、偏离。
> - `[选择文本]` 提供站点类型速查：休息站点、维修站点、交通站点。
> - `[选择文本]` 提供当地居民资料：店主、警长、机修工。
> - `[带依赖/逻辑的文本]` 提供当地居民资源、服务、恩惠、威吓/任务信息。
> - `[选择文本]` 提供搭车者资料：绅士、醉汉/醉妞、纨绔子弟。
> - `[带依赖/逻辑的文本]` 提供搭车者出现条件、增益、缺陷、相关事件。
>
> ### 生存指南
>
> - `[选择文本]` 提供游戏循环速查：逃离司机、在路上获取燃料点、在站点加油、击退司机、重复循环、进入最后冲刺。
> - `[带依赖/逻辑的文本]` 提供限速规则：限速是动作掷骰目标数。
> - `[带依赖/逻辑的文本]` 提供限速 30 或以上时游戏立即结束的规则。
> - `[带依赖/逻辑的文本]` 提供追逐指示物规则：GM 获得恐惧点时同时获得 1 追逐指示物。
> - `[带依赖/逻辑的文本]` 提供追逐指示物满 6 时的处理：司机出现、GM 获得玩家数量等量恐惧点、启动倒计时、清空追逐指示物。
> - `[选择文本]` 提供路程行动规则。
> - `[选择文本]` 支持 3 种路程行动说明：直面恐惧、建立联系、消磨时间。
> - `[带依赖/逻辑的文本]` 提供聚焦轮换与驾驶员轮换规则。
> - `[带依赖/逻辑的文本]` 提供站点休整规则：抵达站点时燃料骰降低一级。
> - `[带依赖/逻辑的文本]` 提供燃油耗尽规则。
> - `[带依赖/逻辑的文本]` 提供冲刺阶段触发条件。
> - `[带依赖/逻辑的文本]` 提供冲刺阶段特殊规则：限速变为最终倒计时，倒计时归零则司机永久击败，此阶段 GM 获得 2 点恐惧点。
> - `[选择文本]` 提供生存行动选项：花费全部燃料点、当前限速 +1、燃料骰降低一级。
> - `[选择文本]` 提供死亡抉择选项：殊死一搏、自我牺牲。
>
> ### GM 仪表盘
>
> - `[可加减资源]` 支持查看并调整当前限速。
> - `[可加减资源]` 支持限速加 1 和减 1。
> - `[可加减资源]` 支持点击限速数值直接输入。
> - `[可加减资源]` 支持查看并调整 GM 恐惧点。
> - `[可加减资源]` 支持恐惧点获得和消耗。
> - `[可加减资源]` 支持点击恐惧点数值直接输入。
> - `[可加减资源]` 支持追逐指示物计数。
> - `[可加减资源]` 支持追逐指示物加 1、减 1、清空。
> - `[可加减资源]` 支持自定义追逐指示物上限。
> - `[带依赖/逻辑的文本]` 追逐指示物达到上限时显示“司机找到你了”提示。
> - `[可加减资源]` 支持查看座驾耐久骰等级。
> - `[可加减资源]` 支持点击座驾耐久条设置或降低座驾等级。
> - `[可加减资源]` 支持记录座驾损伤点。
> - `[可加减资源]` 支持损伤点加 1、减 1。
> - `[可加减资源]` 支持点击损伤点数值直接输入。
> - `[可加减资源]` 支持一个可命名倒计时。
> - `[可加减资源]` 支持倒计时加 1、减 1。
> - `[自由文本]` 支持编辑倒计时标题。
> - `[带依赖/逻辑的文本]` 提供“杀戮”动作提示。
> - `[带依赖/逻辑的文本]` 提供“惊恐”动作提示。
> - `[带依赖/逻辑的文本]` 提供 GM 手册速查：限速对应行程数量、限速对应杀戮骰。
> - `[带依赖/逻辑的文本]` 当前限速变化时，高亮对应的行程数量规则。
>
> ## 对本仓库的需求转化建议
>
> ### 第一阶段
>
> - `[通用工具]` 做角色存档管理。
> - `[自由文本]` 做可编辑角色卡。
> - `[选择文本]` 做规则项选择器。
> - `[通用工具]` 做 JSON 导入导出。
> - `[通用工具]` 做 PDF/打印导出。
> - `[可加减资源]` 做 GM 基础计数器：限速、恐惧、追逐、倒计时、座驾耐久、损伤点。
>
> ### 第二阶段
>
> - `[带依赖/逻辑的文本]` 做建卡引导。
> - `[选择文本]` 做卡牌/能力/条目库。
> - `[通用工具]` 做自定义卡包导入。
> - `[选择文本]` 做卡组或能力槽管理。
> - `[带依赖/逻辑的文本]` 做本地多存档迁移。
>
> ### 第三阶段
>
> - `[自由文本]` 做卡包编辑器。
> - `[自由文本]` 做悬浮笔记本。
> - `[通用工具]` 做骰子导出。
> - `[通用工具]` 做双页模式。
> - `[选择文本]` 做可选扩展页。
>
> ## 待判断项
>
> - `[待判断]` DaggerHeart 的主板扩展页。原因：它看起来像特定规则扩展，里面既有自由文本，也有资源计数，也可能有复杂材料结构。是否应进入基础框架，取决于 PbDH 作者是否需要自定义“复合资源面板”。
>
> ## 明确不纳入首批需求
>
> - 纯动画。
> - 纯视觉主题。
> - 做旧纸张效果。
> - 仪表盘震动、闪烁、火焰、裂纹、血滴等彩蛋特效。
> - 与系统玩法无关的装饰性布局。
> '@ | Set-Content -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md' -Encoding UTF8``
>
> </details>
>
> 已重写。现在检查是否还有未标注的功能 bullet，并复读标题。
>
> <details><summary>Ran 4 commands</summary>
>
> - Ran `Select-String -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md' -Pattern '^## |^### '`
> - Ran ``$lines = Get-Content -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md'; $lines | Where-Object { $_ -match '^- ' -and $_ -notmatch '^- `\[' -and $_ -notmatch '^\- `D:' -and $_ -notmatch '^\- `docs/' -and $_ -notmatch '^- 纯动画|^- 纯视觉|^- 做旧|^- 仪表盘震动|^- 与系统玩法' }``
> - Ran `Get-Item -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md' | Select-Object FullName,Length,LastWriteTime`
> - Ran `Select-String -LiteralPath 'D:\Fish\TRPG\PbDH_sheet\docs\功能需求清单.md' -Pattern '\[待判断\]'`
>
> </details>
>
> 验证通过：所有功能 bullet 都有标签；只有一个业务待判断项。
>
> 已按你的口径标注完：[docs/功能需求清单.md](./docs/功能需求清单.md)
>
> 我用了这些标签：
>
> `自由文本`、`可加减资源`、`带依赖/逻辑的文本`、`选择文本`、`图片字段`、`通用工具`、`待判断`
>
> 验证结果：所有功能 bullet 都已标注。只有 1 个待判断项：`DaggerHeart 主板扩展页`，因为它像“复合资源面板”，里面混了自由文本、资源计数、材料结构。这个要不要进入底层框架，需要你判断。
>
> <details><summary>Plan</summary>
>
> - [x] 按新口径定义标注规则
> - [x] 更新功能需求清单逐项标注
> - [x] 复读验证无未标注项
>
> </details>
</details>

已按你的口径标注完：[docs/功能需求清单.md](./docs/功能需求清单.md)

我用了这些标签：

`自由文本`、`可加减资源`、`带依赖/逻辑的文本`、`选择文本`、`图片字段`、`通用工具`、`待判断`

验证结果：所有功能 bullet 都已标注。只有 1 个待判断项：`DaggerHeart 主板扩展页`，因为它像“复合资源面板”，里面混了自由文本、资源计数、材料结构。这个要不要进入底层框架，需要你判断。

> 我手动审阅了一部分, 其中通用工具还是太宽泛, 不过也足够了.
> 现在 [$grill-with-docs](C://Users//zinge//.agents//skills//grill-with-docs//SKILL.md) . 根据我的需求和想法, 以及现有项目的需求总结, 帮我梳理一下, 具体的功能需求是什么? 我究竟应该做哪些需求, 不应该做哪些?
> 只整理需求属于我的需求, 暂不牵扯具体实现方案和架构

<details><summary>5 previous messages</summary>

> 使用 `grill-with-docs`：先按它的流程读规则和现有需求文档，再只收敛“该做/不该做”的需求边界，不进入实现和架构。
>
> <details><summary>Ran a command</summary>
>
> - Ran `Get-Content -LiteralPath 'C:\Users\zinge\.agents\skills\grill-with-docs\SKILL.md' -Raw`
>
> </details>
>
> 先读现有文档，能从文档回答的我不问。然后我会按 skill 规则一次只问一个会影响需求边界的问题。
>
> <details><summary>Ran 5 commands</summary>
>
> - Ran `if (Test-Path -LiteralPath 'CONTEXT.md') { Get-Content -LiteralPath 'CONTEXT.md' -Raw }`
> - Ran `if (Test-Path -LiteralPath 'docs\adr') { Get-ChildItem -LiteralPath 'docs\adr' -Force | Select-Object Name,Mode,Length }`
> - Ran `Get-Content -LiteralPath 'docs\功能需求清单.md' -Raw`
> - Ran `if (Test-Path -LiteralPath 'todo') { Get-Content -LiteralPath 'todo' -Raw }`
> - Ran `if (Test-Path -LiteralPath 'CONTEXT-MAP.md') { Get-Content -LiteralPath 'CONTEXT-MAP.md' -Raw }`
>
> </details>
>
> 先不展开需求清单，先卡第一个分叉。这个分叉会决定你“应该做什么”和“绝对不该做什么”。
>
> **问题 1：你的目标用户到底是谁？**
>
> 我看到你说“非程序员 PbDH 作者也能用”，但这里有两种完全不同的产品：
>
> A. **自助低代码车卡器平台**
> 作者在网页里拖控件、调布局、填资源、配置依赖，然后生成车卡器。
>
> B. **AI 协作式模板/插件框架**
> 你提供稳定的字段模型、资源格式、依赖规则、样式约束、模板接口和文档。非程序员作者把规则文本给 AI，由 AI 生成/修改系统包或模板包。
>
> 我的推荐：选 **B**。
>
> 理由：A 会把你拖进“做一个低代码平台”的泥坑，需求会爆炸：拖拽布局器、可视化条件编辑器、样式面板、版本迁移、错误提示、预览同步。你真正想做的是“让 AI 能可靠地帮作者产出车卡器”，那核心需求应该是稳定的数据模型、模板边界、导入导出、预览验证，而不是给人手搓 UI 编辑器。
>
> 确认：这个项目的作者侧能力，是否定位为 **AI 协作式模板/插件框架**，而不是完整自助低代码平台？
</details>

先不展开需求清单，先卡第一个分叉。这个分叉会决定你“应该做什么”和“绝对不该做什么”。

**问题 1：你的目标用户到底是谁？**

我看到你说“非程序员 PbDH 作者也能用”，但这里有两种完全不同的产品：

A. **自助低代码车卡器平台**
作者在网页里拖控件、调布局、填资源、配置依赖，然后生成车卡器。

B. **AI 协作式模板/插件框架**
你提供稳定的字段模型、资源格式、依赖规则、样式约束、模板接口和文档。非程序员作者把规则文本给 AI，由 AI 生成/修改系统包或模板包。

我的推荐：选 **B**。

理由：A 会把你拖进“做一个低代码平台”的泥坑，需求会爆炸：拖拽布局器、可视化条件编辑器、样式面板、版本迁移、错误提示、预览同步。你真正想做的是“让 AI 能可靠地帮作者产出车卡器”，那核心需求应该是稳定的数据模型、模板边界、导入导出、预览验证，而不是给人手搓 UI 编辑器。

确认：这个项目的作者侧能力，是否定位为 **AI 协作式模板/插件框架**，而不是完整自助低代码平台？

> B, 但不只是b, 首先用户有两个群体, 基于这个框架制作车卡器的人(作者), 以及使用制作好的车卡器的人(玩家)
> 我向作者提供各种稳定的模块和框架, 以及对应的接口, 作者给出他自己的规则/资源/页面布局, 他自己或者让ai辅助他完成与基础框架的对接. 形成一个可用的网页车卡器
> 玩家则直接使用该车卡器, 与我之前给你提供的那几个产品类似

<details><summary>4 previous messages</summary>

> 这个回答已经解决了一个领域边界：这里不是单一“车卡器”，而是“作者侧框架 + 玩家侧车卡器”。我先把这个术语写进 `CONTEXT.md`，再继续问下一个分叉。
>
> <details><summary>Ran a command</summary>
>
> - Ran `Get-Content -LiteralPath 'C:\Users\zinge\.agents\skills\grill-with-docs\CONTEXT-FORMAT.md' -Raw`
>
> </details>
>
> 写入领域术语：作者、玩家、基础框架、系统包/模板包、车卡器。
>
> <details><summary>Created a file</summary>
>
> - Wrote `./CONTEXT.md` (+41 -0)
>
> </details>
</details>

确认：需求要分成两条线。

**已收敛的定位**

- **作者**：制作某个 PbDH 系统车卡器的人。作者提供规则、资源、页面布局、样式；可以自己对接，也可以让 AI 按框架接口辅助生成系统包。
- **玩家**：使用已经做好的车卡器的人。玩家只关心建卡、编辑、保存、导入导出、打印。
- **基础框架**：你要做的是给作者提供稳定模块、数据接口、扩展点和通用能力。
- **系统包**：某个具体 PbDH 规则的规则资源、字段配置、布局、样式集合。
- **车卡器**：基础框架 + 一个系统包生成的玩家侧网页工具。

我已把这些术语写入 [CONTEXT.md](./CONTEXT.md)。

**问题 2：作者侧要不要内置“可视化编辑界面”？**

我的推荐：**第一版不要做作者可视化编辑界面**。

第一版作者侧只做这些需求：

- 有清晰的系统包格式。
- 有字段/资源/依赖/页面/样式的约定。
- 有示例系统包。
- 有校验和错误报告。
- 有预览入口。
- 有面向 AI 的说明文档，让 AI 能把作者规则文本转成系统包。

不做这些：

- 拖拽页面编辑器。
- 图形化条件编辑器。
- 在线样式面板。
- 作者账号/项目管理。
- 在线发布平台。

理由：你明确选了“AI 协作式模板/插件框架”。那第一版核心不是让作者在网页里点点点，而是让“作者 + AI”有稳定材料可用。可视化编辑器以后可以建在同一套系统包格式之上，但不该成为第一版需求。

确认：第一版作者侧是否只做“系统包格式 + 文档 + 示例 + 校验 + 预览”，不做可视化作者编辑器？

> 分两方面, 如果只是把填json/css改成网页填框框, 那没有意义. 初期作者端的使用肯定还是更偏向于程序员的, 非程序员则用ai辅助, 将他们的自然语言转为代码.
> 但作者端非常需要一个能够及时看到他改动的预览页面, 在开发这个系统包的时候, 尤其是非程序员作者, 他们只能通过最终结果判断他或AI改的对不对, 这个开发流程要足够丝滑, 最好能做到实时显示(最好, 不强求, 到之后具体实现分析时再分析那种构建路线和优劣点, 这里只记需求)

<details><summary>2 previous messages</summary>

> 这个回答把“作者端”边界又压清楚了：不是网页填 JSON，而是代码/AI 辅助制作系统包，必须有顺滑预览。我写入术语，再问下一处分叉。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+8 -0)
>
> </details>
</details>

确认：作者端第一版不是低代码编辑器，而是 **系统包开发体验**。

**已收敛的作者端需求**

应该做：

- 系统包用代码/JSON/CSS/资源文件表达。
- 作者可以自己写，也可以让 AI 生成和修改。
- 必须有预览页面，能看到最终玩家侧车卡器效果。
- 预览反馈要尽量快，最好接近实时。
- 预览必须服务于判断“规则资源、布局、样式、依赖关系是否正确”。

不应该做：

- 只是把 JSON/CSS 改成网页表单。
- 第一版不做完整低代码编辑器。
- 第一版不做拖拽搭页面。
- 第一版不做复杂图形化条件编辑器。
- 第一版不做作者账号、项目管理、在线发布平台。

我已把 **Author Preview** 写入 [CONTEXT.md](./CONTEXT.md)。

**问题 3：系统包的边界应该有多大？**

这里容易失控。系统包可以只定义“角色卡”，也可以把 GM 工具、规则速查、骰子导出、建卡流程都塞进去。

我的推荐：第一版系统包边界是：

- **必须支持**：玩家角色卡。
- **必须支持**：玩家资源/字段/选择项/依赖关系/页面布局/样式。
- **必须支持**：作者预览。
- **可选支持**：规则速查页、冒险笔记页。
- **暂不支持**：GM 仪表盘、骰子机器人导出、复杂自动升级回滚、完整卡包编辑器。

理由：你的核心是“让不同 PbDH 作者快速做车卡器”。先把角色卡本体和系统包边界做稳。GM 工具和骰子导出都是有价值的，但会把需求从“车卡器框架”扩展成“整套跑团工具平台”。

确认：第一版系统包是否只覆盖 **玩家角色卡 + 可选规则/笔记页面**，暂不纳入 GM 工具和骰子导出？

> 不要被我车何里的GM仪表盘迷惑了, 那个终究依然是"可加减的资源" 只不过有动画.
> 后面说的对, 骰子这些边缘功能先不做, 1是它们通常只是只读, 不会修改原本的数据和状态. 所以说可以随时加入删除. 2是它们的功能通常很独立, 不与其他模块和逻辑产生联系
> 另外规则速查实际就是一个纯文本/图片的展示, 这个应该要做成一个基础框架的模块. 它只展示不编辑.
> 冒险笔记同样只是一个纯文本的编辑框, 也应该是基础框架的模块.
> 也就是说这两个并不是"单独的功能", 而应该是"可以由基础框架模块组合而成的功能"
> 基础框架提供"自由文本模块", 这个模块缩小, 然后标题写"姓名", 就是角色卡的姓名功能, 这个模块放大, 写"冒险笔记", 就变成了冒险笔记. 其功能完全由作者确定, 而非一个新的基础模块

<details><summary>2 previous messages</summary>

> 这一步很关键：你不是要“内置冒险笔记/规则速查/GM 仪表盘”，而是要底层模块足够通用，让它们自然组合出来。我把这个记进领域语言。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+14 -0)
>
> </details>
</details>

确认：第一版系统包边界不是“角色卡 + 一堆内置功能”，而是 **基础模块组合系统**。

**已收敛**

应该做成基础模块：

- 自由文本模块：姓名、背景、冒险笔记、长文档都用它。
- 可加减资源模块：生命、压力、恐惧、限速、GM 仪表盘计数器都用它。
- 选择文本模块：职业、武器、护甲、卡牌、条目库都用它。
- 带依赖/逻辑文本模块：选择 A 后填充 B、根据条件筛选选项、根据资源显示提示。
- 图片字段模块：头像、立绘、卡牌图、规则插图。
- 只读展示模块：规则速查、说明文、图片展示。

不应该做成第一版独立特性：

- 冒险笔记特性。
- 规则速查特性。
- GM 仪表盘特性。
- 某个规则专用扩展页特性。

它们是模块组合结果，不是基础框架的独立功能。

我已更新 [CONTEXT.md](./CONTEXT.md)。

**问题 4：第一版的“逻辑/依赖”要做到什么程度？**

这是下一个最容易爆炸的点。

我建议第一版只支持三类逻辑：

1. **可见性依赖**
例如：选择“游侠”后显示“伙伴页/伙伴字段”。

2. **选项过滤依赖**
例如：选择职业 A 后，子职业下拉框只显示职业 A 可选项。

3. **字段自动填充**
例如：选择护甲后填充护甲值、阈值、特性文本。

第一版不做：

- 自动回滚升级。
- 任意脚本执行。
- 复杂公式系统。
- 多步状态机。
- 跨页面复杂联动。
- “选择这个升级项后自动修改一堆资源，并且取消时恢复”的高级逻辑。

理由：PbDH 规则主要是纸笔工具模拟，第一版目标是“能搭出车卡器”，不是“把所有规则自动化”。复杂逻辑可以先让玩家手动改资源，框架只提供提示和字段。

确认：第一版依赖逻辑是否限制在 **可见性、选项过滤、字段自动填充** 三类？

> 是的, 这个"逻辑/依赖"主要是解决纸笔游戏里的一个痛点: 需要查表, 查很多很大的表. 选择职业后要去查这个职业有哪些子职, 它能拿什么武器, 能用什么特长. 选了A种族后会让哪些特长不可用. 当玩家资源很多的时候, 这个过程十分痛苦.
> 自动填充就是省去手抄一大段字的痛苦了.
> 另外的一些数值逻辑, 比如dh原版里的"角色阈值=护甲阈值+等级"这种逻辑, 现有的车卡器是在每次更新护甲和等级是时候计算一次. 在现有车卡器里实现这个逻辑很简单, 但是我担心在基础模块框架中, 加入这种"A模块的数值依赖于B模块的数值"会让复杂度和耦合度提升很多, 因为我也不确定作者他的规则里这种计算规则会牵扯多少模块, 以及到底多么复杂. 这个怎么解决? 我在想要不要弄个"检查数值"模块, 在所有角色卡模块填写完毕时, 统一检查计算所有的类似逻辑/计算. 然后不自动更新而是显示警告和错误, 这样这个检查数值模块就是对其他模块只读不写.这样可以吗?

<details><summary>2 previous messages</summary>

> 这个决策很适合收敛成领域规则：复杂数值逻辑先做“只读检查”，不做“自动写回”。我先记入 `CONTEXT.md`。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+13 -0)
>
> </details>
</details>

可以，而且我建议就这么定。

**结论**

第一版不要做“A 模块数值自动依赖 B 模块并写回”的通用计算系统。
做一个 **只读的检查数值模块** 更稳。

它的需求边界是：

- 读取角色卡当前所有字段。
- 根据作者定义的检查规则计算“期望值”。
- 如果实际填写值和期望值不一致，显示警告或错误。
- 不自动修改玩家填写的数据。
- 不阻止玩家继续使用，除非作者把某条检查设为严重错误。
- 玩家或作者能看到：哪里不一致、当前值是多少、建议值是多少、原因是什么。

比如：

```text
伤害阈值可能不正确：
当前填写：7 / 14
建议数值：8 / 15
原因：角色等级 1 + 护甲阈值 7 / 14
```

**为什么这样更适合基础框架**

- 低耦合：检查模块只读其他模块，不写回。
- 不破坏纸笔自由度：玩家可以故意填一个和规则不同的值。
- 适合复杂规则：再复杂也只是“读数据 -> 报告问题”，不会牵扯一堆自动同步。
- 方便作者和 AI 写规则：比“设计一个可靠的双向自动计算系统”简单得多。
- 后续可扩展：如果未来某些检查确实稳定，再单独支持“一键应用建议值”，但不是第一版需求。

我已把这个术语写入 [CONTEXT.md](./CONTEXT.md)：`Dependency Logic` 和 `Validation Check`。

**问题 5：第一版要不要允许作者写任意脚本？**

我的推荐：**不要。**

第一版作者可以定义：

- 字段。
- 资源条目。
- 条件过滤。
- 自动填充。
- 只读检查规则。
- 样式和布局。

但不要开放“作者写 JS 函数直接操作角色卡状态”。

理由：一旦允许任意脚本，基础框架就很难保证数据安全、导入导出稳定、AI 生成质量和版本兼容。你会从“模块化车卡器框架”变成“插件运行时平台”。

确认：第一版是否禁止作者写任意脚本，只允许声明式配置和只读检查规则？

> 先别记啊, 我还指望你给我分析这种方法的优劣呢

对，我刚才推进太快了。这里不该直接定论和写 `CONTEXT.md`，应该先分析。前面那次把“只读检查”写进了文档，属于过早固化；之后如果你不采纳，我会改掉。

**只读检查模块方案**

你的方案是：

- 数值逻辑不实时写回字段。
- 在某个检查阶段统一读取全部角色卡数据。
- 计算期望值。
- 显示警告/错误。
- 玩家或作者根据提示手动修正。

**优点**

1. 低耦合
检查模块只读所有模块，不需要每个字段知道谁依赖它。基础模块会简单很多。

2. 易扩展
不同规则的复杂计算都能塞进“检查规则”里，不影响普通字段系统。

3. 不破坏纸笔自由度
TRPG 里经常有临时加值、房规、GM 裁定。自动写回反而可能碍事。

4. AI 更容易生成
让 AI 写“检查规则”比写“跨字段自动同步逻辑”更可靠。

5. 错误可见
自动填错很危险；检查提示会把“为什么建议这个值”展示出来。

**缺点**

1. 玩家体验弱一点
玩家改等级后，阈值不会自动变，需要看提示再改。

2. 错误可能被忽略
如果只是警告，玩家可能带着错误数据继续导出/打印。

3. 检查时机要设计
是实时检查、保存前检查、导出前检查，还是手动点击检查？这会影响体验。

4. 部分简单规则显得笨
像 `阈值 = 护甲阈值 + 等级` 这种简单计算，用户会期待自动更新。

**替代方案**

A. 全自动计算写回
体验最好，但复杂度最高。容易出现循环依赖、覆盖玩家手动值、取消选择后不知道怎么回滚。

B. 字段级派生值
某些字段不是用户填写，而是由公式生成。比如阈值字段只显示计算结果。
缺点是纸笔自由度下降，临时修正不好处理。

C. 只读检查 + 一键应用建议值
默认不写回，但每条检查可以提供“应用建议值”。
这是我更推荐的中间路线，但不一定第一版做。

**我的真实判断**

第一版应该采用：

- 简单依赖：可见性、选项过滤、自动填充。
- 数值规则：只读检查。
- 不做复杂自动写回。
- 暂不做一键应用，除非实现成本很低。

也就是说你的方案方向是对的，但需要补一个需求：检查结果必须足够明显，尤其在导出/打印前必须提醒。否则它会变成“有检查但没人看”。

要不要我把刚才写进 `CONTEXT.md` 的这部分改成“候选方案/未决”，先不当已定术语？

> 缺点里只有3需要重视, 记为待定, 估计要实际使用才能感受到什么时机检查最佳, 其他的我觉得没问题, 就按这个来.
> 至于你的问题5, 肯定不让写脚本的. 本身就不是面向程序员用户的. 或者帮我分析一下, 有什么样的需求, 才会让已有的基础框架无法满足, 需要自定义脚本?

<details><summary>2 previous messages</summary>

> 我先把这两个已定/待定点写进领域文档：数值逻辑采用只读检查；检查时机待实际体验验证；作者侧不开放任意脚本。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+9 -0)
>
> </details>
</details>

已记入 [CONTEXT.md](./CONTEXT.md)：只读检查确定；检查时机待定；第一版不开放作者自定义脚本。

**什么需求会逼出自定义脚本？**

真正需要脚本的需求通常有一个共同点：**它不是“配置数据怎么展示/选择/检查”，而是在运行时执行一段作者自定义过程**。

典型场景：

1. **复杂状态机**
例如某规则有“阶段 A -> 阶段 B -> 阶段 C”，每阶段触发不同字段变化，还能回退、跳转、锁定字段。
第一版不该做。用只读检查和手动操作兜住。

2. **自动写回多字段**
例如点一个升级，自动改生命上限、压力上限、卡槽、特长可选项，并且取消时恢复旧值。
第一版不该做通用脚本。最多做提示/检查。

3. **复杂公式语言**
例如作者想写任意公式：`floor((A+B)*C)`、条件分支、表查找、循环累计。
第一版不做任意公式。可以只支持少量声明式检查规则。

4. **运行时生成内容**
例如根据角色历史随机生成背景、根据已有字段自动生成剧情钩子。
这更像创作辅助，不是车卡器核心。

5. **外部服务交互**
例如连骰子机器人、同步云端房间、拉取在线卡库、多人实时协作。
这些都是独立扩展，不应进基础框架第一版。

6. **特殊 UI 行为**
例如某系统需要独特小游戏、地图编辑器、时间轴拖动、战斗模拟器。
这不是角色卡框架该兜的范围。

7. **复杂导出格式**
例如导出到某个专用机器人协议，且格式随规则大量变化。
第一版先不做。因为它通常只读角色数据，后续可以作为独立导出器加。

**我的判断**

如果一个需求可以表达成：

- 字段是什么
- 资源有哪些
- 选项如何过滤
- 选择后填什么文本
- 页面怎么排
- 样式怎么调
- 检查规则怎么提示

那就不需要脚本。

如果一个需求要求：

- 自动改很多字段
- 执行流程
- 保存隐藏状态
- 调外部服务
- 做独特交互
- 运行作者写的过程逻辑

那才会逼近脚本。但这些都不该是第一版需求。

**第一版边界建议**

不提供“作者自定义脚本”。
如果以后真的需要，也不要直接开放 JS，而是优先考虑新增受控模块或受控规则类型。

**下一个问题**

系统包里“页面布局”的自由度要多大？

我的推荐：第一版不要做像 Figma 那样的任意布局。
做“页面 -> 分区 -> 行/列/模块”的声明式布局就够了。作者能调整页面、分区、模块顺序、宽度、标题、颜色、字体、边框，但不能任意拖像素级位置。

确认这个布局自由度吗？

> 1应该同样能用依赖实现, 就是更复杂了一些
> 23完全可以放到"检查数值"里, 检查数值里的倒是的确可以让作者任意写js脚本和规则, 只要保持只读不改就行了.
> 4-7完全不是我们预计需求的范围, 直接排除
>
> 如果只开发固定规则的话, 检查规则模块会很难写, 我们没法预计作者会想出什么奇怪的数值定义和依赖, 这个的确需要开发脚本, 但是需要让他保持只读不写, 最终输出只是错误和警告, 以及他自己定义的正确值.
> "检查数值"模块应该是: 一次性读取整个人物卡的所有数据(这个可以直接对接人物卡导出功能), 然后 执行一个用户脚本, 执行脚本的环境只能接触到人物卡数据, 接触不到其他模块. 它最终可以生成任意文本, 作为它的检查结果报告给用户

<details><summary>2 previous messages</summary>

> 这里要修正术语：不是“作者自定义脚本”整体开放，而是只允许 **检查脚本**，且它只读角色卡数据，只产出报告。我写进 `CONTEXT.md`。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+10 -1)
>
> </details>
</details>

对，这里应该拆成两类脚本：

- **允许**：检查脚本。
- **不允许**：改角色卡状态、改 UI 行为、接外部服务的任意脚本。

我已更新 [CONTEXT.md](./CONTEXT.md)。

**收敛后的需求**

检查数值模块应该是基础框架需求，而且它可以支持作者脚本，但边界必须非常硬：

- 一次性读取整张角色卡数据。
- 读取的数据格式应与角色卡导出数据一致。
- 检查脚本只能读数据。
- 检查脚本不能修改角色卡。
- 检查脚本不能影响其他模块状态。
- 检查脚本最终只输出检查报告。
- 报告可以包含任意文本。
- 报告可以包含错误、警告、建议值、说明原因。
- 报告不负责自动修正。

这样 2/3 这类复杂数值逻辑就能放进去。
1 复杂状态机如果只是“显示/隐藏/可选项变化”，仍走依赖；如果涉及写状态，第一版不做。
4-7 排除，不进预期需求范围。

**问题 6：布局自由度**

现在进入页面需求边界。

我的推荐：第一版做 **声明式布局**，不做任意拖拽布局。

也就是作者可以定义：

- 有哪些页面。
- 页面里有哪些分区。
- 分区里有哪些行/列。
- 每个模块放在哪个分区。
- 模块的宽度、高度、标题、说明、样式。
- 页面是否可打印。
- 页面顺序。
- 页面显示条件。

不做：

- 像 Figma 一样自由拖拽。
- 像素级绝对定位。
- 在网页里可视化调整布局。
- 任意 CSS 覆盖所有元素。
- 复杂响应式编辑器。

理由：你的目标是让 AI/作者生成稳定系统包。声明式布局更容易生成、检查、预览，也更适合打印。任意拖拽和绝对定位会让输出难维护。

确认：第一版布局是否采用“页面 -> 分区 -> 行/列 -> 模块”的声明式布局，不做自由拖拽/像素级编辑器？

> “页面布局”我比较纠结, 因为在布局上现有的人物卡有两个流派:
> 1. 像原生web应用一样, 用分区行列这些web常用的前端样式组成人物卡
> 2. 像线下纸笔人物卡一样, 通常是直接将线下以及经过美术设计的人物卡当作底图, 将原本铅笔写的部分改成各种文本框和checkbox这些
> 1的话你说的没错, 但2的话就需要像素级确定位置. 这个怎么取舍? 做像素级定位难度和复杂度大吗?

这不是小取舍，它会决定你是不是在做“表单布局系统”还是“纸质角色卡标注系统”。两者都合理，但不能混成一锅。

**两种布局流派**

1. **模块化 Web 布局**
页面由分区、行列、模块组成。
优点：响应式好、维护简单、AI 容易生成、打印稳定、不同系统复用强。
缺点：不像原始纸质角色卡，视觉上不够“官方表格”。

2. **底图叠加布局**
作者上传一张角色卡底图，然后在固定坐标上放文本框、勾选框、资源框。
优点：最贴近纸笔角色卡，适合已有精美 PDF/PNG 角色卡的系统。
缺点：移动端适配差、打印缩放敏感、坐标编辑麻烦、作者预览要求更高。

**像素级定位难不难？**

做一个最小版本，不算特别难。
真正复杂的是“让非程序员舒服地摆放”。

最小可行版本可以是：

- 页面有固定尺寸，比如 A4。
- 页面可以设置背景图。
- 模块支持 `x/y/width/height`。
- 所有坐标用页面百分比或 mm，而不是屏幕像素。
- 预览页按比例缩放。
- 打印时按 A4 输出。
- 不做拖拽编辑器，作者/AI 改坐标后看预览。

这个难度可控。

复杂版本会很麻烦：

- 网页上拖拽控件。
- 拖拽吸附网格。
- 多选、对齐、复制、锁定。
- 缩放时文字不跑位。
- 移动端单独布局。
- PDF 背景分页和裁切。
- 打印 DPI 差异。
- 作者可视化编辑器。

这些第一版不该做。

**我的建议**

第一版同时支持两种布局模型，但都保持声明式：

A. `flow layout`
页面 -> 分区 -> 行/列 -> 模块。

B. `overlay layout`
固定页面尺寸 + 背景图 + 模块坐标。

但第一版不做可视化拖拽编辑器。

这样你的框架能覆盖两类作者：

- 从零做线上车卡器的人，用 `flow layout`。
- 已有纸质角色卡图的人，用 `overlay layout`。

**关键约束**

`overlay layout` 只能作为固定画布使用：

- 优先面向桌面和打印。
- 移动端可以缩放查看，不保证手机舒适编辑。
- 坐标由作者/AI 写配置。
- 预览必须足够快，因为作者会反复调位置。
- 字体大小、边框、输入框样式要能调。
- 背景图不应参与数据导出，只是显示/打印层。

**需求边界建议**

应该做：

- 支持模块化布局。
- 支持底图叠加布局。
- 支持固定纸张尺寸。
- 支持背景图。
- 支持模块坐标定位。
- 支持预览缩放。
- 支持打印时保持位置。
- 支持同一个系统包里混用不同页面布局。

不应该做第一版：

- 拖拽编辑器。
- 像素级在线编辑器。
- 自动识别 PDF 表单区域。
- OCR 自动生成字段。
- 移动端重新排版底图叠加页。
- 复杂对齐工具。

**我推荐的结论**

第一版要支持 `flow layout` 和 `overlay layout` 两种页面布局。
但 `overlay layout` 只支持配置式坐标 + 预览，不做拖拽设计器。

如果你同意，我下一步把这个边界写进 `CONTEXT.md`，然后继续梳理“应该做/不该做”的需求清单。

> 我自己做过配置式坐标+预览, 依然很麻烦. 这个我想应该和其他模块不相干吧? 如何布局应该只是影响这些模块的坐标大小, 具体的依赖关系什么的与布局无关. 这样的话先做flow layout, overlay整个不做, 列为future plan好了. 后期再加上也不会影响其他部分吧?

<details><summary>2 previous messages</summary>

> 这个取舍明确了：第一版只做 flow layout，overlay 作为未来布局模式，不进入当前需求。我写进 `CONTEXT.md`。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+12 -0)
>
> </details>
</details>

对，判断正确：**布局不应该影响模块数据、依赖关系、检查规则**。它只决定模块放在哪、占多大、怎么显示。

所以第一版只做 `flow layout` 是合理的，`overlay layout` 放 future plan。后期加上通常不会推翻其他部分，只要你现在把边界守住：

- 模块有自己的数据定义。
- 依赖关系绑定模块 ID/字段 ID，不绑定屏幕坐标。
- 检查规则读取导出数据，不读取布局。
- 导入导出只关心数据，不关心页面坐标。
- 布局只是模块的 presentation。

我已写入 [CONTEXT.md](./CONTEXT.md)：第一版 `Flow Layout`，`Overlay Layout` 是未来选项。

**当前已定需求边界**

应该做：

- 作者侧系统包。
- 玩家侧车卡器。
- 基础模块：自由文本、可加减资源、选择文本、图片字段、只读展示。
- 依赖逻辑：可见性、选项过滤、自动填充。
- 检查数值：只读读取整张角色卡，允许检查脚本输出报告。
- 作者预览。
- flow layout。
- 导入、导出、打印、本地保存。

不做第一版：

- 低代码编辑器。
- 拖拽布局器。
- overlay 底图叠加布局。
- 任意状态修改脚本。
- 自动写回复杂数值。
- 骰子导出。
- 外部服务。
- GM 工具作为独立特性。
- 规则专用页面作为内置功能。

**问题 7：卡牌系统是不是第一版核心？**

我看你在需求清单里手动标了：“整个卡牌系统是 PBDH 的核心，值得单独做一个系统。”

这里要明确：卡牌系统到底是基础模块之一，还是 DaggerHeart 专用高级功能？

我的推荐：第一版要做 **通用条目库/卡牌库模块**，但不要把它绑定死为 DaggerHeart 的“职业/种族/领域卡”。

需求应该是：

- 作者可以定义多个资源库。
- 每个资源库有条目。
- 条目有字段：名称、分类、标签、等级、正文、图片、元数据。
- 玩家可以从资源库选择条目填入角色卡。
- 条目选择可以受依赖过滤。
- 选择条目后可以自动填充其他字段。
- 条目可以以“卡片样式”展示，但底层是通用条目。
- 角色可以有条目槽位，例如能力槽、装备槽、库存槽。
- 槽位可以限制可选资源库、数量、标签、等级、依赖条件。

不做第一版：

- 完整卡牌编辑器。
- 卡包市场。
- DH 原版专用卡牌规则。
- 复杂拖拽卡组构筑。

确认：第一版是否做“通用条目库/卡牌槽系统”，而不是 DaggerHeart 专用卡牌系统？

> 卡牌是核心, 之前那些功能和需求是所有trpg通用的. 而daggerheart和powered by daggerheart的一大特色就是卡牌化, 许多资源/特长(dh叫做领域卡)都是以卡牌的形式存在, 许多精美的美术也以卡图的形式存在.
> 这个需要你多问问题, 一定要设计好做好.
>
> 我先说说我的想法:
> 首先卡牌要支持两种形式, 纯文字版和图片版, 毕竟不是所有人都能给每张卡配图.
> 原版dh卡牌涵盖种族/社群/子职/领域卡. 但我希望这个基础卡牌系统更加广泛和可扩展一些. 作者可以将他希望的一切资源都以卡牌的形式展出.
> 就像线下一样, 玩家拿一张a4人物卡记录角色, 手里拿一堆卡牌作为能力随时打出. 线上的卡牌系统也要支持卡牌自由拖拽, 翻转, 横置, 在上标记指示物等桌游功能. (这个可能很难, 可先只实现拖拽这种简单功能)
> 并且由于卡牌不是在人物卡上显示, 它不与人物卡的布局冲突, 相当一部分要显示的内容不用放在人物卡上了
>
> 上面是玩家侧卡牌的展示和使用, 卡牌的定义和编辑则是作者需要编辑卡牌库的事
> 我们给出卡牌库允许的数据格式, 作者则自己或让ai将他写的玩家资源转化为合法格式导入
> 数据格式的条目其实有些麻烦, 因为不同资源的条目不一样, 比如dh的"领域卡"应该有"回想费用", 但可能该作者的pbdh规则就是将"回想"这一机制删除了. 所以我想可能对卡牌(以及其他非卡牌资源一样)的数据格式要求应该比较灵活. 我之前的设计是. 只有"名称"和"描述"是必填, 其他键值对都以标签的形式呈现. 这个牵扯到具体实现了, 先不确定下来. 先记录需求
>
> 你提到的, 将"选择文本"模块的资源库和卡牌形式结合我觉得挺好. 因为的确现有人物卡里, 有很多从资源库选择就是有的生成卡牌,有的自动填充. "资源库的展示/筛选/排序" 和 "资源库条目选择后的展示" 是应该分开的两个模块.
> 但是条目槽位我不确定要不要加, 确定槽位会比较死板, 但是不给槽位直接生成卡牌随处扔也比较乱
>
> 卡牌编辑器和市场不做, dh原版的卡牌也没有什么特殊规则. 但是做完这个基础框架后, 我肯定是第一个要以它做出dh原版的系统包的
>
> 这些就是我对卡牌系统的想法了, 你有什么要补充和要问的?

<details><summary>2 previous messages</summary>

> 先把已经明确的卡牌术语记下来：卡牌是 PbDH 核心，不是普通选择文本的皮肤；资源库和卡牌展示要拆开。槽位还未定，先不写死。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+17 -0)
>
> </details>
</details>

我补充三个判断，然后问第一个关键问题。

**补充判断**

1. **资源库和卡牌要分层**
你说得对：资源库的“查找/筛选/排序”和资源条目被选中后的“展示/使用形态”应该拆开。

同一个资源条目可能：

- 填入一个文本字段。
- 自动填充多个字段。
- 生成一张玩家可操作卡牌。
- 同时填字段并生成卡牌。

2. **卡牌不是普通选择文本**
在 PbDH 里，卡牌是核心桌面对象。它不是“下拉框选项显示成卡片”这么简单。它有玩家侧使用行为：摆放、查看、横置、标记、可能拖动。

3. **第一版卡牌交互要克制**
我建议第一版玩家侧卡牌只做：

- 文字版/图片版显示。
- 查看大图/详情。
- 拖拽排序或移动区域。
- 横置/恢复。
- 标记少量指示物。
- 删除/收回/加入手牌或卡区。

先不做：

- 翻面复杂状态。
- 任意桌面沙盒。
- 卡牌碰撞/堆叠规则。
- 多人同步。
- 动画式打出流程。

**问题 8：卡牌在玩家侧到底有几个“区域”？**

这是决定“槽位要不要做”的关键。

如果完全随处扔，确实自由，但会乱，也难保存/导出。
如果全是固定槽位，又会死板，不像桌面卡牌。

我的推荐是折中：做 **卡牌区域**，不是固定槽位。

例如系统包可以定义这些区域：

- `已拥有卡牌`
- `手牌`
- `当前装备`
- `已准备能力`
- `弃牌/已使用`
- `库存`
- `临时区域`

每个区域可以配置：

- 允许哪些资源库的卡。
- 是否允许拖入/拖出。
- 是否显示为网格、横向列表、堆叠列表。
- 是否有数量上限。
- 是否允许横置、标记、删除。
- 是否打印。
- 是否和角色字段同步。

这样比“槽位”灵活，也比“随便扔”可控。

确认一下：第一版卡牌系统是否以 **作者定义的卡牌区域** 为核心，而不是固定槽位，也不是完全自由桌面？

> 不, dh其实只是把许多能力(比如火球术)做成了卡牌的样子, 它并不是真的卡牌游戏, 没有那么多卡牌机制. 卡牌一共就三个区域:
> 1. 配置(手牌): 玩家当前能使用的
> 2. 宝库(牌组): 玩家获得但当前不能使用的
> 3. 资源库: 玩家还未获得的
>
> 其中1和2可能随时交换, 而2和3只有在升级时才会交换
> 并且区域也不要配置这些限制和规则, 尽量灵活. 或者说, 这些卡牌槽位/区域的规则, 也不要写在卡牌系统里, 而是写在那个"检查数值"里一道检查. 卡牌系统尽可能精简, 做好自己的创建/编辑/展示/桌游特效, 就好了

<details><summary>2 previous messages</summary>

> 明白，卡牌区不是卡牌游戏规则区；DH/PbDH 只是“能力卡形态”。我把三层卡牌区域和“规则进检查，不进卡牌系统”记入上下文。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+18 -0)
>
> </details>
</details>

确认：卡牌系统要精简，不做卡牌游戏规则引擎。

**已收敛的卡牌需求**

卡牌区域固定为三个概念：

- **配置**：玩家当前能使用的卡。
- **宝库**：玩家已获得但当前不能使用的卡。
- **资源库**：玩家还未获得、可浏览/筛选/选择的卡。

卡牌系统负责：

- 卡牌创建。
- 卡牌导入。
- 卡牌编辑/定义格式。
- 卡牌文字版显示。
- 卡牌图片版显示。
- 卡牌详情查看。
- 配置和宝库之间交换。
- 从资源库加入宝库或配置。
- 卡牌排序。
- 基础桌面操作：拖拽、横置、标记指示物，第一版可先只做拖拽/排序。

卡牌系统不负责：

- 限制配置数量。
- 限制什么时候能从资源库拿卡。
- 限制什么等级能拿什么卡。
- 强制升级时才能换卡。
- 检查职业/等级/领域是否满足。
- 实现抽牌、弃牌、洗牌、费用支付等卡牌游戏机制。

这些规则进入 **检查数值/检查规则**：

- 配置卡数量是否正确。
- 宝库卡数量是否正确。
- 资源库拿取是否合法。
- 卡牌等级/职业/标签是否符合当前角色。
- 当前配置是否违反规则。

我已写入 [CONTEXT.md](./CONTEXT.md)。

**问题 9：卡牌数据格式的最低必填字段是什么？**

你的倾向是“名称 + 描述必填，其余键值对灵活作为标签/字段展示”。我基本赞同，但要加一个现实约束：系统内部需要稳定 ID。

我的推荐：

必填：

- `id`：稳定唯一标识，用于保存、导入、更新、引用。
- `name`：卡牌名称。
- `description`：主要正文。

可选：

- `type`：卡牌类型，例如领域卡、职业卡、装备卡。
- `category`：分类。
- `tags`：标签数组。
- `level`：等级。
- `image`：图片路径或资源引用。
- `meta`：作者自定义键值对。
- `display`：作者指定哪些字段如何展示。

但玩家看到的“卡牌字段”不应被框架固定死。
比如 DH 的“回想费用”可以放进 `meta.recallCost`，作者再决定是否显示。

确认：卡牌数据第一版是否采用 **id/name/description 必填 + 其他字段自由扩展**？

> 那就是 ID, 名称, 描述必填. 对了, 这里记下所有数据格式键名都是中文, 这样方便作者直接编辑查看原始数据. 不过可选字段有哪些. 如何定义如何展示, 这个是具体实现先不定死. 先记录这个需求. 这份需求文档我之后要跟别人再人工看过一次的

<details><summary>2 previous messages</summary>

> 记录：系统包面向作者可读，数据键名用中文；卡牌最小必填是 ID/名称/描述。先写上下文。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+9 -0)
>
> </details>
</details>

已记录进 [CONTEXT.md](./CONTEXT.md)。

**已定需求**

卡牌作者数据：

- 必填字段：`ID`
- 必填字段：`名称`
- 必填字段：`描述`
- 其他字段允许扩展。
- 可选字段有哪些、如何定义、如何展示，先不定死，留到后续实现/格式设计阶段。
- 作者侧原始数据键名使用中文，方便作者直接阅读、编辑、让 AI 修改。

**当前卡牌系统边界整理**

应该做：

- 卡牌是 PbDH 核心模块。
- 卡牌支持纯文字版。
- 卡牌支持图片版。
- 卡牌数据最小必填：`ID`、`名称`、`描述`。
- 卡牌允许作者扩展字段。
- 卡牌区域：配置、宝库、资源库。
- 卡牌可以从资源库加入玩家拥有区。
- 配置和宝库之间可以交换。
- 卡牌规则合法性不由卡牌系统强制，而由检查规则报告。
- 卡牌展示和资源库数据分离。

不先定：

- 可选字段标准清单。
- 字段展示协议。
- 复杂卡牌编辑器。
- 卡牌市场。
- 卡牌游戏式抽牌/弃牌/洗牌机制。

**问题 10：角色卡字段数据也要中文键名吗？**

你刚刚说“所有数据格式键名都是中文”。我理解这不只包括卡牌，也包括系统包里的：

- 模块定义
- 页面定义
- 资源库定义
- 角色卡导出数据
- 检查脚本读取的数据

我的推荐：**作者侧和导出侧都用中文键名**，内部实现以后可以自己映射英文，但不要暴露给作者。

确认一下：是否所有作者可见/可编辑/可导出的数据格式都用中文键名？

> 现代代码里也都支持中文键名和变量名吧, 应该也不用再映射一次

<details><summary>2 previous messages</summary>

> 记录：作者可见格式和代码内对象都可以直接使用中文键名，不额外做英文映射作为需求。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+1 -1)
>
> </details>
</details>

可以，现代 JS/TS 对象键名支持中文没问题，代码里也能用：

```ts
卡牌.名称
角色数据.生命值
```

所以需求上不需要“中文作者格式 -> 英文内部字段”的映射层。除非后续遇到库生态限制，再局部处理。

已记录进 [CONTEXT.md](./CONTEXT.md)：作者可见数据和代码对象都可以直接用中文键名。

**问题 11：玩家侧保存的数据，是“角色数据”还是“系统包 + 角色数据”？**

这个很关键，影响导入导出边界。

我的推荐：

玩家导出的角色文件只保存：

- 玩家填写的字段值。
- 已获得卡牌 ID。
- 配置/宝库状态。
- 图片数据或图片引用。
- 当前系统包 ID/版本。

不保存：

- 整个系统包资源库。
- 所有卡牌完整文本。
- 页面布局定义。
- 样式定义。

理由：角色文件应该轻，不应该把整个车卡器打包进去。导入时用 `系统包ID + 版本` 判断能不能恢复。如果系统包版本不匹配，再给警告。

确认：玩家角色导出是否只保存“角色状态 + 系统包标识”，不内嵌完整系统包？

> 肯定的, 系统包应该导入一次后就存在缓存里, 玩家如果换规则了再换系统包. 导出的数据就只有他角色卡相关的东西

<details><summary>2 previous messages</summary>

> 记录：系统包缓存和角色导出边界。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+9 -0)
>
> </details>
</details>

已定：

- 系统包单独导入/缓存。
- 玩家换规则时切换系统包。
- 玩家导出的角色文件只包含角色相关数据。
- 角色文件不内嵌完整系统包。
- 角色文件应带系统包标识和版本，用于导入时检查兼容性。

已写入 [CONTEXT.md](./CONTEXT.md)。

**问题 12：是否要支持“一个车卡器里切换多个系统包”？**

这里有两个方向：

A. **单系统包构建**
一个网页车卡器固定对应一个系统包。比如“DH 原版车卡器”“我车何车卡器”。

B. **多系统包运行时**
同一个网页工具里可以导入多个系统包，玩家选择当前使用哪个系统包。

我的推荐：第一版支持 **多系统包运行时**，但导出/部署时也允许打包成单系统包工具。

理由：你要做基础框架，不是只做一个具体规则工具。多系统包运行时方便作者预览、玩家切换规则、后续管理缓存。单系统包部署则适合作者发布给玩家。

需求上可以写成：

- 基础框架能导入/缓存多个系统包。
- 玩家当前只能激活一个系统包编辑一个角色。
- 角色数据绑定一个系统包 ID/版本。
- 作者可以发布一个预装系统包的独立车卡器。

确认这个方向吗？

> 23是应该, 但14我不确定. 1我不知道会不会引入太多复杂度, 4如何给作者发布? 基础框架应该是一个web应用放在服务器上, 要一次性把整个源码和系统包导出让作者下载吗? 感觉有点过了

这里别做“导出整套源码”。那条路太重，也不是你的目标。

**我的判断**

第一版不要做完整“多系统包管理器”。
但必须做 **系统包作为独立分发物**。

也就是：

- 基础框架是一个固定 Web 应用。
- 作者产出的是一个 `系统包` 文件或目录包。
- 玩家/作者把系统包导入基础框架。
- 框架缓存当前系统包。
- 角色数据只记录自己绑定的系统包 `ID/版本`。
- 第一版可以只要求同时激活一个系统包。
- 不做复杂系统包市场、列表管理、账号同步、在线发布平台。

**关于你问的 1：缓存多个系统包会不会复杂？**

会增加复杂度，主要不是技术难，而是产品边界变复杂：

- 要有系统包列表。
- 要有启用/禁用/删除。
- 要处理同名不同版本。
- 要处理角色绑定旧版本系统包。
- 要处理导入角色时缺系统包怎么办。
- 要处理资源冲突和缓存清理。

这些不是第一版核心。第一版可以简化成：

```text
当前系统包
当前角色数据
导入系统包
导入角色时检查系统包 ID/版本
```

以后再做“系统包管理”。

**关于你问的 4：作者如何发布？**

第一版不需要作者下载整套源码。更合理的是：

1. 作者制作一个系统包。
2. 作者把系统包文件发给玩家，或放到 GitHub/网盘/静态服务器。
3. 玩家打开基础框架网页。
4. 玩家导入系统包。
5. 框架缓存系统包。
6. 玩家之后导入/创建角色。

未来可以加：

- 通过 URL 导入系统包。
- 分享链接：`基础框架地址 + 系统包URL`
- 官方/个人系统包列表。
- 预装某系统包的独立页面。

但第一版只需要“导入系统包文件”就够。

**建议需求边界**

应该做：

- 系统包是独立可分发数据包。
- 基础框架支持导入系统包。
- 基础框架缓存当前系统包。
- 角色数据绑定系统包 ID/版本。
- 导入角色时检查当前系统包是否匹配。
- 不匹配时给出明确提示。

不做第一版：

- 多系统包管理器。
- 系统包市场。
- 作者发布平台。
- 打包整套源码给作者。
- 多系统包同时运行。
- 角色跨系统包转换。

**问题 12 重新收敛**

第一版是否按这个来：**单当前系统包运行时**，系统包作为独立文件导入并缓存，角色数据绑定系统包 ID/版本；暂不做多系统包管理和发布平台？

> 是的, 这样是合适的

<details><summary>2 previous messages</summary>

> 记录：单当前系统包运行时，系统包独立导入缓存，不做发布平台/多包管理。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+9 -0)
>
> </details>
</details>

已定并写入 [CONTEXT.md](./CONTEXT.md)。

**系统包运行边界**

第一版应该做：

- 基础框架是固定 Web 应用。
- 系统包是独立文件/目录包。
- 支持导入系统包。
- 缓存当前系统包。
- 同一时间只加载一个当前系统包。
- 角色数据绑定系统包 `ID/版本`。
- 导入角色时检查当前系统包是否匹配。
- 不匹配就提示用户。

第一版不做：

- 多系统包管理器。
- 系统包市场。
- 作者发布平台。
- 打包整套源码给作者下载。
- 多系统包同时运行。
- 角色跨系统包转换。

**问题 13：第一版玩家侧存档要不要支持多角色？**

DaggerHeart 旧工具支持最多 10 个角色存档。
但你的框架如果第一版还要做系统包导入、卡牌、预览、检查规则，多角色存档可能不是最核心。

我的推荐：第一版仍然做 **本地多角色存档**，但做得简单：

- 当前系统包下可以有多个角色。
- 新建角色。
- 切换角色。
- 重命名角色。
- 复制角色。
- 删除角色。
- 自动保存。
- 导入/导出单个角色 JSON。

不做：

- 角色分组。
- 云同步。
- 多设备同步。
- 角色跨系统包迁移。
- 角色列表复杂搜索。
- 权限/账号。

理由：玩家实际使用车卡器时，多角色是高频基础需求。实现难度不高，且不会污染系统包设计。

确认：第一版玩家侧做简单本地多角色存档吗？

> 确认, 本地多角色. 并且只保存文本不保存图片, 图片应该是一个指向系统包图片的链接

<details><summary>2 previous messages</summary>

> 记录：本地多角色；角色数据不保存图片二进制，只保存系统包图片引用/链接。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+9 -0)
>
> </details>
</details>

已定并写入 [CONTEXT.md](./CONTEXT.md)。

**玩家存档需求**

第一版做：

- 当前系统包下本地多角色存档。
- 新建角色。
- 切换角色。
- 重命名角色。
- 复制角色。
- 删除角色。
- 自动保存。
- 导入/导出单个角色 JSON。

角色数据保存：

- 文本字段。
- 资源值。
- 选择项 ID。
- 卡牌状态。
- 系统包 ID/版本。
- 图片引用。

不保存：

- 图片二进制。
- 整个系统包。
- 云端账号数据。
- 跨设备同步数据。

**问题 14：玩家上传头像/立绘这个需求还要不要？**

你刚说“只保存文本不保存图片，图片应该是一个指向系统包图片的链接”。
这会影响之前提到的“上传头像/立绘”。

有两个方向：

A. 第一版不支持玩家上传图片。玩家只能从系统包内图片里选，或者填图片 URL。
B. 第一版支持玩家上传图片，但角色存档不直接保存图片二进制，而是保存本地缓存引用。

我的推荐：第一版选 **A**。

理由：上传图片会引入本地文件缓存、导入导出丢图、隐私、容量、迁移等问题。你的系统包已经有图片能力，玩家头像/立绘可以先用系统包图片或 URL。

确认：第一版是否不做玩家上传图片，只支持系统包图片引用或外部图片 URL？

> 玩家图片/立绘还是要的, 这一个二进制数据应该不打紧.

<details><summary>2 previous messages</summary>

> 修正记录：角色数据一般不保存系统图片二进制，但玩家自定义头像/立绘例外，可以进入角色存档。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+3 -3)
>
> </details>
</details>

对，玩家头像/立绘要保留。这个例外合理，数据量通常可控，而且这是车卡器高频需求。

已修正 [CONTEXT.md](./CONTEXT.md)。

**图片保存边界**

第一版应该做：

- 系统包图片：只保存引用，不复制进角色数据。
- 玩家头像/立绘：允许上传，允许随角色数据保存。
- 角色导出 JSON 可以包含玩家头像/立绘数据，或包含可恢复的本地图片数据引用。具体格式后续实现再定。
- 卡牌图片、规则插图、资源图片属于系统包，不随角色导出重复保存。

不做：

- 大型图库管理。
- 云端图片存储。
- 多图片相册。
- 图片市场。
- 自动抠图/生成图片。

**问题 15：第一版的“作者文档/AI 协作”要做到什么程度？**

你的核心设想是“作者给规则和资源，自己或让 AI 辅助生成系统包”。那文档不是附属品，是一等需求。

我的推荐：第一版必须包含：

- 系统包格式说明。
- 最小系统包示例。
- 完整系统包示例。
- 字段模块说明。
- 资源库/卡牌库说明。
- 依赖规则说明。
- 检查脚本说明。
- 布局说明。
- 样式说明。
- 面向 AI 的制作提示词/工作流。
- 系统包校验错误说明。

不做：

- 面向普通作者的完整网页教程平台。
- 交互式教学。
- 视频教程。
- 自动从规则书生成系统包。

确认：作者文档和 AI 协作指南是否列为第一版核心需求？

> 是的, 尤其是文档写出利于AI读的格式最好

<details><summary>2 previous messages</summary>

> 记录：文档和 AI 可读性是一等需求。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+8 -0)
>
> </details>
</details>

已定：作者文档和 AI 协作指南是第一版核心需求，不是附属物。已写入 [CONTEXT.md](./CONTEXT.md)。

**作者文档需求**

第一版应该做：

- 系统包格式说明。
- 最小系统包示例。
- 完整系统包示例。
- 模块清单说明。
- 每种模块的字段说明。
- 资源库/卡牌库格式说明。
- 依赖规则说明。
- 检查脚本说明。
- flow layout 布局说明。
- 样式可调整项说明。
- 角色数据导入导出说明。
- 系统包校验错误说明。
- AI 协作工作流。
- 给 AI 看的“如何把规则文本转成系统包”的提示词模板。
- 常见错误与修复建议。

文档格式应偏 AI 友好：

- 结构稳定。
- 标题明确。
- 示例完整。
- 少用隐喻。
- 用表格列字段。
- 每个概念给最小 JSON 示例。
- 给反例。
- 给校验规则。
- 给“生成步骤”。

**问题 16：第一版是否要有“系统包校验器”？**

我的推荐：必须有。

因为你不做可视化编辑器，作者和 AI 直接改系统包，那么校验器就是作者端安全网。

第一版校验器应该检查：

- 必填字段缺失。
- ID 重复。
- 引用不存在。
- 页面引用了不存在的模块。
- 模块引用了不存在的资源库。
- 依赖条件引用了不存在字段。
- 自动填充目标不存在。
- 卡牌缺 `ID/名称/描述`。
- 中文键名拼错。
- 图片引用不存在。
- 检查脚本运行失败。
- 系统包版本/ID 缺失。

输出要求：

- 清楚指出文件/路径/字段。
- 说明错误原因。
- 给修复建议。
- 尽量适合 AI 读取和自动修复。

确认：系统包校验器列为第一版核心需求？

> 要的, 并且要加更多debug的log, 这个不给作者看, 给ai看.
> 但是另外一方面, 我在使用现有人物卡的时候, 经常发现它对各种字段键值的检查太过严苛, 比如"等级"就一定要是int, 但有时作者就会写"等级X  X为当前等级一半"之类非标准的写法. 在现有人物卡里就会报错.
> 我觉得应该让"值"都以字符串的形式存在, 就如同线下纸笔中, 每个空格都是被写下的字符. 只有确实与系统框架相关的地方, 如id/链接等才需要严格审查

<details><summary>2 previous messages</summary>

> 这会影响核心数据模型：值默认字符串，校验严格检查结构/引用，不严格限制玩家/作者写在格子里的内容。记录下来。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+12 -0)
>
> </details>
</details>

同意，这个是核心原则：**角色卡上的值默认就是纸上写下的字**。

已写入 [CONTEXT.md](./CONTEXT.md)。

**系统包校验器需求**

应该做：

- 校验系统包结构。
- 校验必填结构字段。
- 校验 ID。
- 校验 ID 是否重复。
- 校验引用是否存在。
- 校验页面引用的模块是否存在。
- 校验模块引用的资源库是否存在。
- 校验依赖引用的字段是否存在。
- 校验自动填充目标是否存在。
- 校验卡牌是否有 `ID/名称/描述`。
- 校验图片链接/资源引用是否存在。
- 校验检查脚本是否能运行。
- 输出给作者看的错误信息。
- 输出给 AI/debug 用的详细日志。

不应该做：

- 把普通字段值强行校验成 int/float/bool。
- 因为“等级”写成 `等级X，X为当前等级一半` 就报错。
- 因为资源值写成 `3+护甲` 就报错。
- 对纸笔字段做过早类型限制。

**数据原则**

- 普通字段值默认都是字符串。
- 就像线下纸笔，每个格子里写的是字符。
- 只有框架运行必须依赖的东西才严格校验，比如：
  - `ID`
  - 引用
  - 链接
  - 模块类型
  - 页面结构
  - 资源库结构
  - 检查脚本入口

**问题 17：资源值要不要也默认字符串？**

比如卡牌的“等级”“费用”“回想”“伤害”“范围”等字段。
我的推荐：也默认字符串。

如果作者想让检查脚本理解它，可以在检查脚本里自行解析。基础框架不预设这些字段一定是数字。

确认：资源库/卡牌库里的非结构字段，也都默认作为字符串或可展示文本处理，不做严格类型限制？

> 是的, 都是字符串, 作为基础框架的原则是, 只要作者提供了合法的输入, 那么你输入什么我显示什么. 具体里面有什么样的复杂机制, 基础框架不管

<details><summary>2 previous messages</summary>

> 记录：输入即展示，基础框架不解释非结构字段语义。
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./CONTEXT.md` (+8 -0)
>
> </details>
</details>

已定并写入 [CONTEXT.md](./CONTEXT.md)。

**基础框架数据原则**

- 普通角色卡字段值：字符串。
- 资源库/卡牌库里的非结构字段：字符串。
- 作者输入什么，框架显示什么。
- 基础框架不理解“等级”“费用”“伤害”“回想”这些字段的游戏语义。
- 只有框架关键字段严格处理：
  - `ID`
  - 引用
  - 链接
  - 模块类型
  - 页面结构
  - 资源库结构
  - 检查脚本入口

复杂机制放到：

- 依赖过滤。
- 自动填充。
- 只读检查脚本。

**问题 18：现在是否可以收敛成第一版需求草案？**

我已经有足够信息整理一版“应该做/不应该做”的需求文档了。
但按 `grill-with-docs` 的流程，还可以继续追问几个细节，例如：

- 系统包文件结构。
- 模块类型清单。
- 玩家侧卡牌交互第一版最小集合。
- 打印导出边界。
- 作者预览边界。
- 检查脚本安全边界。

我的建议：现在先出一版 **需求边界文档**，不进实现方案。里面列：

- 项目定位。
- 用户角色。
- 第一版必须做。
- 第一版明确不做。
- Future plan。
- 待定项。
- 核心抽象模块。
- 卡牌系统需求。
- 系统包需求。
- 玩家侧需求。
- 作者侧需求。

确认我现在把这版需求文档写到 `docs/需求边界.md` 吗？

> 这些是实现细节吗? 如果是需求就要讨论清楚, 是实现就先不管

不是全是实现细节，里面有几项必须作为需求讨论清楚。

我拆一下：

- **系统包文件结构**：一半需求，一半实现。
  “作者要能用文件/目录表达系统包、AI 能读写、校验器能定位错误”是需求。
  “到底叫 `system.json` 还是 `package.json`、目录怎么拆”是实现/格式设计，后面再定。

- **模块类型清单**：需求。
  第一版到底提供哪些基础模块，必须定清楚。不然范围会失控。

- **玩家侧卡牌交互最小集合**：需求。
  比如拖拽、排序、横置、标记，这些是玩家能不能用的问题，不是实现细节。

- **打印导出边界**：需求。
  第一版导出 PDF/JSON/HTML 哪些要做，打印哪些页面，是否包含卡牌，这些都要定。

- **作者预览边界**：需求。
  作者能不能即时看到系统包效果、能看到哪些错误，这也是核心使用流程。

- **检查脚本安全边界**：需求。
  因为你已经允许检查脚本，这必须定：只读、只输出报告、不能改状态、不能访问其他模块。具体怎么沙箱化是实现。

所以接下来应该继续讨论需求，不讨论具体技术路线。

**下一个最该定的是：第一版模块类型清单。**

我的推荐第一版只要这些基础模块：

- 自由文本模块
- 长文本模块
- 可加减资源模块
- 勾选资源模块
- 选择文本模块
- 图片字段模块
- 只读展示模块
- 卡牌展示/管理模块
- 页面/分区布局模块
- 检查报告模块

不做第一版：

- 表格模块
- 富文本编辑器
- 时间轴模块
- 地图模块
- 自定义交互组件
- 复杂公式字段
- 拖拽式布局编辑器

问题：这个第一版模块清单是否够？哪些必须加，哪些应该删？

> 可以了, 开始 [$to-prd](C://Users//zinge//.agents//skills//to-prd//SKILL.md) , 但不止要写我们这次讨论确定要做什么, 也要记录不做什么

<details><summary>5 previous messages</summary>

> 使用 `to-prd`：先读 skill 规则，再把本次讨论收敛成 PRD；会包含“做什么”和“不做什么”。
>
> <details><summary>Ran a command</summary>
>
> - Ran `Get-Content -LiteralPath 'C:\Users\zinge\.agents\skills\to-prd\SKILL.md' -Raw`
>
> </details>
>
> 我会按 `to-prd` 合成，不再追问新需求。先读当前上下文和 issue tracker 配置；之后我会生成 PRD，并准备发布到 GitHub issue。
>
> <details><summary>Ran 5 commands</summary>
>
> - Ran `Get-Content -LiteralPath 'docs\功能需求清单.md' -Raw`
> - Ran `Get-Content -LiteralPath 'CONTEXT.md' -Raw`
> - Ran `Get-Content -LiteralPath 'docs\agents\triage-labels.md' -Raw`
> - Ran `Get-ChildItem -LiteralPath . -Force | Select-Object Name,Mode,Length`
> - Ran `Get-Content -LiteralPath 'docs\agents\issue-tracker.md' -Raw`
>
> </details>
>
> Context compaction
>
> Source: automatic
> Status: completed
</details>
