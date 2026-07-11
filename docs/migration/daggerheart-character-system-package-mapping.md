# DaggerHeart Character 车卡器 → System Package 重构映射（审阅稿）

状态：核心范围已初步确认；不包含实现，不代表已批准扩展 Base Framework。

已确认的产品决定（2026-07-11）：

- 三态 Checkbox 暂不实现；资源轨道第一版使用 `countableResource` Counter，三态能力列入 Future Plan。
- 第一版只支持纯血种族；混血选择与合成列入 Future Plan。
- 职业选择后不自动弹出子职选择器；由玩家手动选择子职。
- 阈值关系“实际阈值 = 护甲基础阈值 + 等级”由 Validation Check 计算并报告，不自动回填。
- 皮肤、Player 自定义卡包和卡牌编辑器不在本次范围内。
- 本次优先完成核心人物卡、核心 Resource Libraries、选择填充和 Character Data。
- 多 Resource Library 共用一个 Card Table 是核心前置能力；本方案假定该能力由另一任务完成并可用。
- 人物卡布局由 Author 后续手工调整；实现阶段优先交付 Modules、Resources 与 Dependencies。
- 生命、压力、金币、希望、护甲和熟练度使用 `countableResource` counter，不展开为多个 Checkbox options。
- 关系问题允许玩家修改，使用 `freeText`。

## 1. 目标与依据

本稿分析旧车卡器 `D:\Game\Daggerheart\DaggerHeart_Character` 的玩家需求、页面布局、数据源和交互逻辑，并将其映射到 PbDH Sheet Framework 的 System Package `schemaVersion: 0.1.0`。

依据为当前 `docs/system-package/reference/`、Accepted ADR、`CONTEXT.md`，并遵守以下边界：

- System Package 是声明式资料包，不携带任意 UI 脚本。
- 当前布局只使用 HTML Layout Template；不使用已废弃的 Flow Layout，也不假装未来 Overlay Layout 已存在。
- Resource Picker 的选择是瞬时事件；由 Dependency Logic 将资源字段写入 Sheet Values。
- Dependency Logic 只支持可见性、资源默认筛选和文本填充，不支持算术、自动打开弹窗、合成新资源或链式触发。
- Validation Check 只读并报告问题，不回写 Character Data。
- Character Data、System Package 与 Base Framework 功能分别归属，不混在同一个包内。

## 2. 原车卡器需求摘要

原车卡器是两张固定背景人物卡上的可编辑覆盖层，并附带可拖动卡牌桌面。玩家可以：

1. 填写身份、等级、六项属性、阈值、经历、装备、背景、关系与事件记录。
2. 用两态或三态槽位追踪特质、生命、压力、希望、护甲、熟练度、金币和持握状态。
3. 从内置表格选择种族、社群、职业、子职、武器、护甲、物品、领域卡和野兽形态；表格支持筛选并记住筛选条件。
4. 选择资源后自动填充人物卡字段，部分选择还创建可拖动卡牌。
5. 创建、拖动、置顶、删除和编辑文本卡/图片卡，并保存卡牌位置。
6. 自动保存到浏览器，导入/导出角色 JSON，上传头像，打印人物卡、卡牌和长文本。
7. 运行时上传自定义卡包，或将角色数据交给另一个“皮肤”页面显示。

## 3. 建议的 System Package 构成

### 3.1 Pages 与 Layout

| Page ID | 名称 | 原布局 | 建议 |
| --- | --- | --- | --- |
| `character-main` | 人物卡 | `index.html #page-1`，固定背景图 page 1 + 绝对定位控件 | HTML Layout Template。背景图作为 Asset；用安全 HTML、`pb-module` 和 page-scoped CSS 重建。当前不是 Overlay Layout。 |
| `character-story` | 背景与关系 | `index.html #page-2`，固定背景图 page 2 + 绝对定位控件 | HTML Layout Template；背景图作为 Asset。 |
| `character-cards` | 卡牌桌面 | 全局 `#card-container` | 单独 Page，放置一个支持多 Resource Library 的统一 `cardTable`；假定核心前置能力已经完成。 |

两张人物卡背景图建议登记为 `sheet-page-1`、`sheet-page-2` Assets。旧页面中的 inline `style` 必须迁移到 page CSS，因为 HTML Layout Template 禁止 inline style。布局精调由 Author 后续手工完成；模块实现不以像素级布局完成为前提。

### 3.2 Resource Libraries

| Library ID | 旧数据源 | 用途 |
| --- | --- | --- |
| `ancestries` | `RACES_DATA` | 种族选择与种族卡 |
| `communities` | `COMM_DATA` | 社群选择与社群卡 |
| `classes` | `MAIN_CLASS` | 职业、领域、初始闪避/生命、职业特性与问题 |
| `subclasses` | `SUB_CLASS` | 子职卡；按主职筛选 |
| `primary-weapons` | `PRIMARY_WEAPON` | 主武器选择 |
| `secondary-weapons` | `SECONDARY_WEAPON` | 副武器选择 |
| `backup-weapons` | 主/副武器数据的 Author-side 合并结果 | 两个备用武器选择器 |
| `armor` | `ARMOR` | 护甲选择 |
| `loot` | `LOOT_DATA` | 物品与消耗品 |
| `domain-cards` | `DOMAIN_CARDS` | 领域卡选择与实例创建 |
| `beast-forms` | `BEAST_FORM` | 野兽形态卡 |

每个 Resource Entry 需要稳定、唯一的 `ID`。旧数据中只有名称去重逻辑，迁移时不能直接把可变显示名称当作长期 ID 而不做冲突审计。

## 4. Sheet Module 清单与逐项替换

映射等级：

- **直接**：当前接口能表达原需求。
- **近似**：核心数据可保留，但交互或视觉语义变化。
- **扩展**：当前 System Package 无法等价表达，需另立 Base Framework PRD。

### 4.1 身份、等级与属性

| 建议 Module ID | 原控件 | Module 类型 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `character-name` | `NameTextbox` | `freeText` | 直接 | 角色名称。窗口标题变化属于框架 UI，不进入包。 |
| `ancestry-name` | `RaceTextbox` | `freeText` | 直接 | 由种族 Picker 的 Dependency `fillText` 写入，也允许玩家编辑。 |
| `community-name` | `CommunityTextbox` | `freeText` | 直接 | 由社群 Picker 填入。 |
| `class-name` | `ClassTextbox` | `freeText` | 直接 | 由职业/子职 Picker 填入；职业与子职拼接需预先成为资源字段。 |
| `class-domains` | `ClassDomainTextbox`（隐藏） | `readOnlyDisplay` | 近似 | 不应保存隐藏选择状态；用于显示当前领域或提示玩家。若只为过滤，应由 Dependency 直接设置目标 Picker 默认筛选。 |
| `level` | `LevelTextbox` | `countableResource` | 直接 | 最小值 1、默认值 1；最大值按系统规则决定。 |
| `evasion` | `EvasionTextbox` | `freeText` | 直接 | 保持 Sheet Value 文本语义，可由职业选择填入。 |
| `armor-score` | `ArmorTextbox` | `freeText` | 直接 | 与护甲条目中的“护甲值”分开保存。 |
| `agility` | `AgilityTextbox` | `freeText` | 直接 | 敏捷。 |
| `strength` | `StrengthTextbox` | `freeText` | 直接 | 力量。 |
| `finesse` | `FinesseTextbox` | `freeText` | 直接 | 灵巧。 |
| `instinct` | `InstinctTextbox` | `freeText` | 直接 | 本能。 |
| `presence` | `PresenceTextbox` | `freeText` | 直接 | 风度。 |
| `knowledge` | `KnowledgeTextbox` | `freeText` | 直接 | 知识。 |
| `major-threshold` | `MajorTextbox` | `freeText` | 直接 | 重伤阈值；自动算术见缺口。 |
| `severe-threshold` | `SevereTextbox` | `freeText` | 直接 | 严重阈值；自动算术见缺口。 |

### 4.2 经历与职业特性

| 建议 Module ID | 原控件组 | Module 类型 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `experience-1` … `experience-5` | `Experience1Textbox` … `Experience5Textbox` | 5 × `freeText` | 直接 | 经历名称。 |
| `experience-modifier-1` … `experience-modifier-5` | 对应 Modifier Textbox | 5 × `freeText` | 直接 | 修正值保持文本。 |
| `class-features` | `ClassFeatureTextbox` | `longText` | 直接 | 由职业条目中预先整理的“职业特性全文”字段填入。 |

### 4.3 资源槽与状态控件

| 建议 Module ID | 原控件组 | Module 类型 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `trait-marks` | 6 个 `TraitSlotCheckbox` | `checkboxResource`（6 options） | 直接 | 两态标记可等价表达。 |
| `hp` | 12 个三态 HP 槽 | `countableResource` | 近似 | Counter；建议最小值 0、最大值可改。 |
| `stress` | 12 个三态 Stress 槽 | `countableResource` | 近似 | Counter；建议最小值 0、最大值可改。 |
| `hope` | 6 个三态 Hope 槽 | `countableResource` | 近似 | Counter；默认值 2，建议最小值 0、最大值 6。 |
| `armor-slots` | 12 个三态 Armor 槽 | `countableResource` | 近似 | Counter；建议最小值 0、最大值可改。 |
| `proficiency` | 5 个两态熟练度槽 | `countableResource` | 近似 | Counter；建议最小值 0、最大值 5。 |
| `handful-gold` | 9 个两态槽 | `countableResource` | 近似 | Counter；默认值 1，建议最小值 0、最大值 9。 |
| `bag-gold` | 9 个两态槽 | `countableResource` | 近似 | Counter；建议最小值 0、最大值 9。 |
| `chest-gold` | 1 个两态槽 | `countableResource` | 近似 | Counter；建议最小值 0、最大值按核心规则确认。 |
| `primary-weapon-hands` | `TwohandedCheckbox1` | `checkboxResource` | 近似 | options 建议“单手/双手”；原三态互斥语义需玩家明确选择。 |
| `backup-weapon-1-hands`、`backup-weapon-2-hands` | `TwohandedCheckbox2/3` | 2 × `checkboxResource` | 近似 | 同上。 |
| `backup-weapon-1-kind`、`backup-weapon-2-kind` | Primary/Secondary 方框 | 2 × `checkboxResource` | 近似 | options 为“主武器/副武器”；当前 checkbox options 不保证互斥。 |

第一版明确接受 Counter 替代纸卡槽视觉。三态纸卡槽仍保留为 Future Plan；未来若恢复，应新增框架级深模块，不能靠包内脚本模拟。

### 4.4 装备与物品文本

| 建议 Module ID | 原控件 | Module 类型 | 等级 |
| --- | --- | --- | --- |
| `primary-weapon-name/stat/damage/trait` | 4 个 PrimaryWeapon Textbox | 3 × `freeText` + 1 × `longText` | 直接 |
| `secondary-weapon-name/stat/damage/trait` | 4 个 SecondaryWeapon Textbox | 3 × `freeText` + 1 × `longText` | 直接 |
| `armor-name/threshold/entry-score/trait` | 4 个 Armor Textbox | 3 × `freeText` + 1 × `longText` | 直接 |
| `inventory` | `ItemSlot1Textbox` | `longText` | 直接 |
| `backup-weapon-1-name/stat/damage/trait` | 4 个 Backup1 Textbox | 3 × `freeText` + 1 × `longText` | 直接 |
| `backup-weapon-2-name/stat/damage/trait` | 4 个 Backup2 Textbox | 3 × `freeText` + 1 × `longText` | 直接 |

### 4.5 第二页文本与头像

| 建议 Module ID | 原控件 | Module 类型 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `event-log` | `EventLogTextbox` | `longText` | 直接 | 事件记录。 |
| `character-avatar` | 上传图片 + `AvatarTextbox` | `imageField` | 近似 | 保留玩家上传图片；原“图片/文字二选一”若必须保留，可另加 `character-appearance` longText。 |
| `character-appearance` | `AvatarTextbox` | `longText` | 直接 | 角色形象文字描述。 |
| `background-question-1` … `3` | 3 个可编辑问题 Textbox | `readOnlyDisplay` | 近似 | 问题应来自职业 Resource 字段并由 Dependency 填入派生内容，不写 Character Data。若玩家需要改题则改为 `freeText`。 |
| `background-answer-1` … `3` | 3 个回答 Textbox | 3 × `longText` | 直接 | 玩家答案。 |
| `connection-question-1` … `3` | 3 个关系问题 Textbox | 3 × `freeText` | 直接 | 职业选择可填入默认问题，之后允许玩家修改并持久化。 |
| `connection-answer-1` … `3` | 3 个回答 Textbox | 3 × `longText` | 直接 | 玩家答案。 |

### 4.6 Resource Pickers 与 Card Tables

| 建议 Module ID | 原按钮/流程 | Module 类型 | 目标/副作用 | 等级 |
| --- | --- | --- | --- | --- |
| `pick-ancestry` | `add-ancestry-card-btn` | `resourcePicker` | `ancestries` → 单选一个纯血种族、填名称并创建到 `character-card-table` | 直接 |
| `pick-community` | `add-community-card-btn` | `resourcePicker` | `communities` → 填名称并创建到 `character-card-table` | 直接 |
| `pick-class` | `add-class-card-btn` | `resourcePicker` | `classes` → 填职业、领域、闪避、特性、问题 | 近似 |
| `pick-subclass` | 隐藏 `add-subclass-card-btn` | `resourcePicker` | `subclasses` → 按主职默认筛选、创建卡牌 | 近似 |
| `pick-primary-weapon` | 主武器 + 号 | `resourcePicker` | 填 4 个主武器字段 | 直接 |
| `pick-secondary-weapon` | 副武器 + 号 | `resourcePicker` | 填 4 个副武器字段 | 直接 |
| `pick-backup-weapon-1/2` | 两个备用武器 + 号 | 2 × `resourcePicker` | 填各自 4 个字段 | 直接 |
| `pick-armor` | 护甲 + 号 | `resourcePicker` | 填护甲名称、条目阈值、护甲值、描述 | 近似 |
| `pick-loot` | 物品 + 号 | `resourcePicker` | 填 `inventory` | 近似 |
| `pick-domain-card` | 添加领域卡 | `resourcePicker` | `domain-cards` → 创建到 `character-card-table` | 直接 |
| `pick-beast-form` | 添加野兽形态卡 | `resourcePicker` | `beast-forms` → 创建到 `character-card-table` | 直接 |
| `character-card-table` | 原统一卡牌桌面 | `cardTable`（多 Library 能力） | Libraries `ancestries`、`communities`、`subclasses`、`domain-cards`、`beast-forms` | 直接；假定前置框架能力已完成 |

多 Resource Library Card Table 是核心要求。本文不再设计多个 Card Table 的降级方案，也不通过复制资源构建综合 Library。所有创建卡牌的 Resource Picker 均指向 `character-card-table`；实现时以另一任务完成后的最终接口为准。

## 5. Dependency Logic 映射

### 可直接声明

1. 各装备 Picker 将资源字段填入对应名称、属性/距离、伤害/类型和描述模块。组合字符串应在 Resource Entry 中预先准备成一个显示字段，因为 `fillText` 不提供格式化表达式。
2. 社群 Picker 填 `community-name`。
3. 职业 Picker 填 `class-name`、`class-domains`、`evasion`、`class-features`、六个问题模块。
4. 职业 Picker 对 `pick-subclass` 使用 `setResourceDefaultFilter`，字段为“主职”。
5. 职业 Picker 可对 `pick-domain-card` 按职业领域设置默认筛选；若一个职业有两个领域，应把它们作为 filter allowed-values。
6. Picker 的 `创建卡牌` 将领域、种族、社群、子职和野兽形态 Card Instance 创建到统一的 `character-card-table`；依赖多 Library Card Table 前置能力。

### 当前不能声明

1. 职业选择后自动打开子职 Picker。
2. 用“等级 + 护甲基础阈值”算出实际重伤/严重阈值。
3. 选择职业或护甲后改变槽位数量或可用上限。
4. 物品选择后把新条目追加而不是覆盖已有长文本。
5. 两次选择种族，再抽取两条描述合成一个新的混血卡定义；第一版不需要。
6. 一次 Dependency 写入后触发下一条 Dependency；Engine 明确为单轮、非递归。

## 6. Base Framework 能力与包外功能

| 旧功能 | 新归属 | 结论 |
| --- | --- | --- |
| 自动保存、Character JSON 导入/导出、清空 | Base Framework Character Save | 不应在 System Package 重写。 |
| 打印人物卡、卡牌、长文本 | Base Framework 输出模式 + Page `打印` | 包只声明页面/布局/打印资格。 |
| 卡牌拖动、置顶、删除、状态、只读详情 | Card Engine / Card Table | 直接复用框架能力。 |
| 表格筛选、搜索、排序 | Resource Library Browser | 直接复用；筛选状态是 UI 状态，不进入 Character Data。 |
| 头像 Base64 持久化 | `imageField` + Character Data | 直接复用。 |
| 上传自定义卡包并合并运行时全局数组 | 本次不做 | System Package 资源是 Author Data；不迁移旧功能。 |
| 自定义卡牌编辑器 | 本次不做 | Card Definition 来自 Resource Library，Card Detail 保持只读。 |
| 皮肤选择与新窗口 Skin API | 本次不做 | System Package 自身提供核心人物卡布局和样式，不迁移旧皮肤协议。 |
| 卡牌宽度输入 | Base Framework UI preference（若保留） | 不是 System Package Sheet Module。 |
| 禁止 Ctrl 缩放、调试坐标、tooltip 脚本 | Base Framework/无障碍策略 | 不迁入 System Package。 |

## 7. 已确认决策与剩余审阅项

已确认：

1. 生命、压力、金币、希望、护甲和熟练度第一版统一使用 `countableResource` Counter。
2. 种族第一版只做纯血单选。
3. 子职由玩家手动打开 Picker；职业选择只负责设置默认筛选。
4. 阈值由 Validation Check 计算期望值并与玩家填写值比较。Validation Check 只报告 warning/error，不能自动回填。
5. 皮肤、自定义卡包和卡牌编辑器不在本次范围内。
6. 本次以核心人物卡为优先目标。

仍需审阅：

1. **布局保真度**：第一版使用当前 HTML Layout Template + page CSS 模拟固定背景覆盖层，是否可以接受？
2. **背景问题文本**：仅“关系问题”已确认可修改；职业背景问题仍需确认是只读派生内容还是允许玩家改写。

## 8. Future Plan

以下能力不阻塞核心人物卡第一版：

1. 新增三态/容量槽 Sheet Module，表达“已标记、可用但未标记、超出当前上限”，并支持安全地修改上限。
2. 支持选择两个种族并生成混血角色/卡牌；实现前需明确特性选取规则和 Character Data 契约。
3. 如未来需要自动写入护甲派生阈值，设计受控派生值能力；Validation Check 继续保持只读。

## 9. 建议模块边界（供 PRD 审阅）

建议把后续工作分为三个互不混淆的边界：

1. **Daggerheart System Package**：资源转换、稳定 ID、Modules、Pages、Layouts、Dependencies、Guide、Checks、Assets。
2. **System Package 契约缺口**：多 Library Card Table 是核心前置能力并由另一任务处理；三态槽与受控派生计算留在 Future Plan。这些都是 Base Framework 增强，不写成包内特例。
3. **旧产品附加功能**：Player 自定义卡包、卡编辑、皮肤/主题；已排除在本次核心人物卡范围外。

本任务暂挂。恢复后先读取多 Library Card Table 的最终接口，再按“Modules → Resources → Dependencies → 基础 Layout”的顺序继续；像素级布局由 Author 手工调整。
