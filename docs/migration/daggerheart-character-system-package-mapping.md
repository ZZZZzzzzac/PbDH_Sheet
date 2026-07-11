# DaggerHeart Character 车卡器 → System Package 重构映射（审阅稿）

状态：核心范围与模块方向已确认；等待最后两项行为决策后进入实现规划。

已确认的产品决定（2026-07-11）：

- 不需要三态 Checkbox；资源轨道使用 `countableResource` Counter，其 `最大值可改` 能力满足玩家调整上限的需求。
- 第一版只支持纯血种族；混血选择与合成列入 Future Plan。
- 职业选择后不自动弹出子职选择器；由玩家手动选择子职。
- 阈值关系“实际阈值 = 护甲基础阈值 + 等级”由 Validation Check 计算并报告，不自动回填。
- 皮肤、Player 自定义卡包和卡牌编辑器不在本次范围内。
- 本次优先完成核心人物卡、核心 Resource Libraries、选择填充和 Character Data。
- 多 Resource Library 共用一个 Card Table 已由提交 `0c1040b` 完成；本方案使用正式的 `资源库IDs` 接口。
- 不要求控件绝对定位。实现阶段先按大致关系组织语义 HTML，Author 后续手工调整布局。
- 生命、压力、金币、希望、护甲和熟练度使用 `countableResource` counter，不展开为多个 Checkbox options。
- 关系问题允许玩家修改，使用 `freeText`。
- 旧 JavaScript/JSON 数据允许清洗、拆分、合并和补充派生显示字段，以适配 Resource Library、Dependency 和 Card Definition 契约。
- 不迁移仅用于旧实现暂存领域名的 `ClassDomainTextbox`。

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
| `character-main` | 人物卡 | `index.html #page-1` | HTML Layout Template；按身份与属性、资源 Counter、经历与职业特性、装备与物品等大致关系组织 `pb-module`。不做绝对定位。 |
| `character-story` | 背景与关系 | `index.html #page-2` | HTML Layout Template；按事件/形象、背景、关系分组。不做绝对定位。 |
| `character-cards` | 卡牌桌面 | 全局 `#card-container` | 单独 Page，放置使用 `资源库IDs` 的统一 `cardTable`。 |

两张人物卡背景图可登记为 `sheet-page-1`、`sheet-page-2` Assets，供 Author 后续布局调试使用。第一轮 HTML 只提供清晰的分组、标题和模块占位；不迁移旧 inline 坐标，也不以像素级还原为验收条件。

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
| `primary-weapon-hands` | `TwohandedCheckbox1` | `freeText` | 近似 | 由武器资源的“单手/双手”字段直接填入，避免用非互斥 Checkbox 模拟。 |
| `backup-weapon-1-hands`、`backup-weapon-2-hands` | `TwohandedCheckbox2/3` | 2 × `freeText` | 近似 | 由所选武器资源填入。 |
| `backup-weapon-1-kind`、`backup-weapon-2-kind` | Primary/Secondary 方框 | 2 × `freeText` | 近似 | 在合并后的 `backup-weapons` Library 中增加“武器类别”字段并填入“主武器/副武器”。 |

Counter 直接替代旧纸卡槽视觉，并使用 `最大值可改: true` 的模块内置能力让玩家调整生命、压力和护甲等上限；不再规划三态 Checkbox。

### 4.4 装备与物品文本

| 建议 Module ID | 原控件 | Module 类型 | 等级 |
| --- | --- | --- | --- |
| `primary-weapon-name/stat/range/damage/type/trait` | PrimaryWeapon 控件 | 5 × `freeText` + 1 × `longText` | 直接 |
| `secondary-weapon-name/stat/range/damage/type/trait` | SecondaryWeapon 控件 | 5 × `freeText` + 1 × `longText` | 直接 |
| `armor-name/base-major/base-severe/score/trait` | Armor 控件 | 5 × `freeText` + 1 × `longText` | 直接 |
| `item-1` … `item-5` | 原单一物品长文本区 | 5 × `freeText` | 直接 |
| `backup-weapon-1-name/stat/range/damage/type/trait` | Backup1 控件 | 5 × `freeText` + 1 × `longText` | 直接 |
| `backup-weapon-2-name/stat/range/damage/type/trait` | Backup2 控件 | 5 × `freeText` + 1 × `longText` | 直接 |

装备字段不再要求预先组合“属性/距离”或“伤害/类型”。Resource Library 可以保留独立的 `属性`、`距离`、`伤害`、`伤害类型`、`描述` 字段，Dependency 分别写入对应 Sheet Values。旧数据允许在迁移时重命名和正规化字段。

五个物品槽分别配套 `pick-item-1` … `pick-item-5`，五个 Picker 都引用同一个 `loot` Resource Library，各自把所选条目的显示文本写入对应 `item-N`。这样无需追加字符串或动态判断下一个空槽。

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
| `pick-class` | `add-class-card-btn` | `resourcePicker` | `classes` → 填职业、闪避、特性、问题，并设置子职/领域卡默认筛选 | 近似 |
| `pick-subclass` | 隐藏 `add-subclass-card-btn` | `resourcePicker` | `subclasses` → 按主职默认筛选、创建卡牌 | 近似 |
| `pick-primary-weapon` | 主武器 + 号 | `resourcePicker` | 分别填名称、属性、距离、伤害、类型、描述 | 直接 |
| `pick-secondary-weapon` | 副武器 + 号 | `resourcePicker` | 分别填名称、属性、距离、伤害、类型、描述 | 直接 |
| `pick-backup-weapon-1/2` | 两个备用武器 + 号 | 2 × `resourcePicker` | 分别填各自名称、属性、距离、伤害、类型、描述 | 直接 |
| `pick-armor` | 护甲 + 号 | `resourcePicker` | 填护甲名称、基础阈值、护甲值、描述 | 近似 |
| `pick-item-1` … `pick-item-5` | 五个物品槽选择入口 | 5 × `resourcePicker` | 全部引用 `loot`，分别填 `item-1` … `item-5` | 直接 |
| `pick-domain-card` | 添加领域卡 | `resourcePicker` | `domain-cards` → 创建到 `character-card-table` | 直接 |
| `pick-beast-form` | 添加野兽形态卡 | `resourcePicker` | `beast-forms` → 创建到 `character-card-table` | 直接 |
| `character-card-table` | 原统一卡牌桌面 | `cardTable` | `资源库IDs: ["ancestries", "communities", "subclasses", "domain-cards", "beast-forms"]` | 直接；已由当前框架支持 |

多 Resource Library Card Table 已在提交 `0c1040b` 落地。Card Instance 使用 `libraryId + definitionId` 解析，因此不同 Library 可以安全复用条目 ID。所有创建卡牌的 Resource Picker 均指向 `character-card-table`，且各 Picker 的 `资源库ID` 必须包含在该 Table 的 `资源库IDs` 中。

## 5. Dependency Logic 映射

### 可直接声明

1. 各装备 Picker 将资源字段分别填入名称、属性、距离、伤害、伤害类型和描述模块，不依赖字符串格式化。
2. 社群 Picker 填 `community-name`。
3. 职业 Picker 填 `class-name`、`evasion`、`class-features` 和六个问题模块；不创建 `ClassDomainTextbox` 对应模块。
4. 职业 Picker 对 `pick-subclass` 使用 `setResourceDefaultFilter`，字段为“主职”。
5. 职业 Picker 可对 `pick-domain-card` 按职业领域设置默认筛选；若一个职业有两个领域，应把它们作为 filter allowed-values。
6. Picker 的 `创建卡牌` 将领域、种族、社群、子职和野兽形态 Card Instance 创建到统一的 `character-card-table`。
7. 五个物品 Picker 分别将同一个 `loot` Library 的资源写入五个独立物品槽。

### 当前不能声明

1. 职业选择后自动打开子职 Picker。
2. 用“等级 + 护甲基础阈值”算出实际重伤/严重阈值。
3. Dependency 的 `fillText` 目标只支持 `freeText`、`longText`、`readOnlyDisplay`，不能写入 `countableResource`。因此职业选择不能自动设置 HP Counter，护甲选择也不能自动设置 Armor Counter 的当前值或最大值；玩家仍可用 Counter 自带 UI 手动调整。
4. 两次选择种族，再抽取两条描述合成一个新的混血卡定义；第一版不需要。
5. 一次 Dependency 写入后触发下一条 Dependency；Engine 明确为单轮、非递归。

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

1. **职业初始生命**：职业选择无法写入 HP Counter。第一版是否接受玩家按职业资料手动设置 HP Counter 上限，Validation Check 只负责报告不一致？
2. **护甲 Counter**：护甲选择无法写入 Armor Counter 或最大值。第一版是否接受玩家按所选护甲的“护甲值”手动设置，Validation Check 只负责报告不一致？
3. **背景问题文本**：仅“关系问题”已确认可修改；职业背景问题仍需确认是只读派生内容还是允许玩家改写。

## 8. Future Plan

以下能力不阻塞核心人物卡第一版：

1. 支持选择两个种族并生成混血角色/卡牌；实现前需明确特性选取规则和 Character Data 契约。
2. 如未来需要自动写入职业初始生命、护甲 Counter 或护甲派生阈值，设计受控的 Counter/派生值写入能力；Validation Check 继续保持只读。

## 9. 建议模块边界（供 PRD 审阅）

建议把后续工作分为三个互不混淆的边界：

1. **Daggerheart System Package**：资源转换、稳定 ID、Modules、Pages、Layouts、Dependencies、Guide、Checks、Assets。
2. **System Package 契约缺口**：多 Library Card Table 已完成。Counter 的 Dependency 写入和受控派生计算留在 Future Plan，不写成包内特例。
3. **旧产品附加功能**：Player 自定义卡包、卡编辑、皮肤/主题；已排除在本次核心人物卡范围外。

确认剩余行为决策后，按“Modules → Resources → Dependencies → Validation Check → 语义化基础 Layout”的顺序继续；布局精调由 Author 手工完成。
