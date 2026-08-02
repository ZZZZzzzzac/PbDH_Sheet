# Resource Libraries、Composer 与 Cards 合同

## Resource Library

Resource Library 是带稳定 `ID`、显示 `名称`、源 `路径` 和 Entries 的结构化集合。Entry 必须有唯一 `ID`；其余字段由系统包定义。字段值应保持 JSON 可序列化，展示文本可使用受限 Markdown。

库可声明字段模板，告诉 Picker、Composer 与 Card 如何显示或编辑字段；引用的字段必须真实存在。默认查询可按字段多值过滤并按字段升降序排序。不要靠数组位置建立持久引用。

`resourcePicker` 可链接一个或多个库，或使用字面值 `其他` 打开 Character Data 的其他资源。多选、默认过滤与“选择后创建卡牌”均由模块声明控制。

## Resource Composer

Composer 将多个 Resource Library 槽位的选择合成为一个角色资源：

- `来源槽位` 定义槽位 ID、标签、资源库 ID 与可选字段模板；
- `输出字段` 把每个结果字段映射到一个槽位的来源字段；
- `选择关系输出` 可在所有选择相同/不全相同时写固定值；全部相同时还可优先继承首个来源的指定字段，并在该字段为空时使用固定回退值；
- Composite Resource 的 `ID` 由框架生成，不能由输出映射覆盖；
- 可选 `创建卡牌` 把结果加入指定 Card Table。

## Resource Extensions 与“其他资源”

角色导入或用户操作可以产生不属于包内原生库的扩展资源。Base 保留其文本字段与来源，使其可通过 `其他` Picker 和 `otherResourceLibraries` Card 来源继续使用。只有确定身份和字段兼容时才合并到原生 Entry；宁可保留为其他资源，也不要错误拆分或丢字段。

Resource Extension 可在根级 `metadata` 中携带应用专用往返信息。每个键必须使用反向域名式命名空间，例如 `cn.pbdh.cards.workspace`。Base 在导入、持久化和规范化导出时原样保留未知命名空间，但不把 metadata 转换为 Resource Value，也不用于展示、搜索、筛选或 Card Presentation。

## Card Table 与 Card Presentation

`资源来源`可引用 `resourceLibrary`、`resourceComposer` 或 `otherResourceLibraries`（ID 固定为 `其他`）。每个来源可定义：

- `名称模板`
- `描述模板`
- `标签字段`

模板字段必须存在。Card name、description 与 tags 是资源的展示投影，不复制成新的合同数据。

Card Table 可设置 `显示方式: "image" | "text" | "split"`、`卡图字段`、`卡背字段`、`显示方式字段` 与 `背面卡牌ID字段`。Resource Entry 可通过显示方式字段覆盖 Table 默认值；`split` 表示上部卡图与下部结构化文字，文字区至少占卡面一半。`背面卡牌ID` 必须指向同一 Resource Library 的 Entry。来自只含纯图的在线格式时，若文字才是权威内容，Adapter 应输出 text card，而不是把无文字卡图当完整卡牌。

紧凑 text Card 的 description 会自动拟合，最小到 9px；仍放不下时显示省略号，完整内容在 Card Detail 可见。Card name 与 tags 保持可辨识。此拟合不修改 Resource Entry 或 Character Data。

## Card 状态与实例

`状态选项`定义可选状态；`状态外观`可为状态映射六位 `描边颜色`（`#RRGGBB`）与非空 `徽标`。未映射状态使用默认外观。图片 Card 和 Card Detail 都应显示状态语义，打印输出也保留必要指示。

Card Instance 在 Character Data 保存资源引用和交互状态：翻面、顺时针 90° 旋转，以及最多十个边缘指示物。添加指示物使用十色 palette；普通视图显示 36px 指示物，拥挤时只显示放大的数值。左键增加，右键或触屏长按减少，ArrowUp/ArrowDown 可键盘调整；从 1 减到 0 时移除。交互不得回写 Resource Entry。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Resource Library source file

作者资源条目数组；ID/旧ID 为框架身份字段，其余键是系统自定义 Resource Values。

语义约束：

- 同一库内 ID 与所有旧ID必须唯一且互不冲突。
- 复杂 Resource Value 会序列化为 JSON 文本且默认不参与筛选、排序或搜索。
- Resource Values 默认按显示文本处理，不推断数字语义。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | array | 作者资源条目数组；ID/旧ID 为框架身份字段，其余键是系统自定义 Resource Values。 |
| $[] | 是 | object | — |
| $[].ID | 是 | string | 最短 1 |
| $[].旧ID | 否 | string \| array | — |
| $[].旧ID<variant 1> | 否 | string | 最短 1 |
| $[].旧ID<variant 2> | 否 | array | 最少项 1 |
| $[].旧ID<variant 2>[] | 是 | string | 最短 1 |

### Normalized Resource Library

Author Resource 文件归一化后的字段元数据与字符串值。

语义约束：

- Author 脚本读取的是此 normalized shape，而不是原始资源 JSON。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；Author Resource 文件归一化后的字段元数据与字符串值。 |
| ID | 是 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| 路径 | 是 | string | 最短 1 |
| fields | 是 | array | — |
| fields[] | 是 | object | 未知字段不属于合同 |
| fields[].key | 是 | string | 最短 1 |
| fields[].label | 是 | string | 最短 1 |
| fields[].visible | 是 | boolean | — |
| fields[].filterable | 是 | boolean | — |
| fields[].sortable | 是 | boolean | — |
| fields[].searchable | 是 | boolean | 默认 true |
| fields[].width | 否 | "compact" \| "normal" \| "wide" \| "fill" | — |
| entries | 是 | array | — |
| entries[] | 是 | object | 未知字段不属于合同 |
| entries[].ID | 是 | string | 最短 1 |
| entries[].aliases | 否 | array | — |
| entries[].aliases[] | 是 | string | 最短 1 |
| entries[].fields | 是 | object | — |

### Resource Extension document

独立资源扩展的目标包和库贡献。

语义约束：

- 缺失的 Extension/Library/Entry ID 可由导入流程生成；生成后归一化 JSON 会显式写回。
- 根级 metadata 使用反向域名式命名空间；Base 原样保留但不把它归一化为 Resource Value，也不用于展示、搜索、筛选或 Card Presentation。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；独立资源扩展的目标包和库贡献。 |
| ID | 否 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| 版本 | 是 | string | 最短 1 |
| 目标系统包ID | 是 | string | 最短 1 |
| resourceLibraries | 是 | array | 最少项 1 |
| resourceLibraries[] | 是 | object | 未知字段不属于合同 |
| resourceLibraries[].ID | 否 | string | 最短 1 |
| resourceLibraries[].名称 | 是 | string | 最短 1 |
| resourceLibraries[].entries | 是 | array | — |
| resourceLibraries[].entries[] | 是 | object | — |
| metadata | 否 | object | — |

<!-- END GENERATED CONTRACT -->
