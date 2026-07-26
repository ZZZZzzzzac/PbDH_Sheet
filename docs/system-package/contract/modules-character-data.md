# Sheet Modules 与 Character Data 合同

## 九种模块

所有模块都需要稳定 `ID` 与 `类型`，可选 `默认隐藏`。当前支持：

| 类型 | 用途 | 主要字段 |
| --- | --- | --- |
| [`freeText`](modules/free-text.md) | 单行文字或下拉 | `标签`、`默认值`、`隐藏标签`、`占位文本`、`选项` |
| [`longText`](modules/long-text.md) | 多行文字 | `标签`、`默认值`、`行数`、`隐藏标签`、`占位文本` |
| [`checkboxResource`](modules/checkbox-resource.md) | 一组选项 | `标签`、`选项` |
| [`countableResource`](modules/countable-resource.md) | 当前值/上限 | `标签`、数值边界、标记展示 |
| [`readOnlyDisplay`](modules/read-only-display.md) | 静态说明或资产 | `标签`、`内容`、`资源路径` |
| [`imageField`](modules/image-field.md) | 玩家图片 | `标签`、`替代文本` |
| [`resourcePicker`](modules/resource-picker.md) | 从资源库选择 | `按钮文本`、`资源库`、`多选`、`创建卡牌` |
| [`resourceComposer`](modules/resource-composer.md) | 多槽组合资源 | `来源槽位`、`输出字段`、关系输出 |
| [`cardTable`](modules/card-table.md) | 持久卡牌实例 | `资源来源`、状态与展示字段 |

每种 Module 的功能、边界、精确字段和自动验证例子都在同一个链接文件中。未知类型不会降级为通用字段。

## Countable Marker Presentation

`countableResource` 可设 `显示方式: "数值" | "标记"`。标记模式必须同时提供 `当前值标记` 与 `剩余值标记`，且两者不同。Marker Descriptor 为：

- `{"类型":"文字","内容":"●"}`：内容必须是一个可见 Unicode 字素；
- `{"类型":"图片","资源路径":"assets/markers/filled.webp"}`：图片以 `contain` 显示，路径遵守资产合同；PNG、WebP、SVG、`.ico` 等仍须能被浏览器安全解码。

`标记尺寸` 与 `加减号字号` 范围为 5–96px。左键/触屏点击改变当前值；右键或触屏长按执行反向操作。无上限时只显示当前值标记。呈现不会改变 Character Data 的 `{current,max}` 共享状态，`fillCountable` 写入同一状态。

## Character Data

Character Data 是独立于 System Package 源文件的持久对象，保存：

- `kind` 与 Character Data schemaVersion；
- 创建它的 System Package `id` / `version`；
- `character.values` 中按 Module ID 存储的值；
- Card Instances 的资源引用、状态、翻面、旋转与指示物；
- `playerImages` 中 Image Field 对应的嵌入图片；
- 更新时间。

典型值语义：free/long text 为字符串；checkbox 为选中 ID 集合；countable 为 current/max；Picker/Composer 为资源选择；readOnlyDisplay 不写入数据；imageField 的二进制内容只进入 Player Images。

默认值只在没有持久值时生效。加载旧 Character Data 时不重放通用依赖来覆盖已有值。改变模块 ID、选项 ID 或资源 Entry ID 会使旧数据失联，因此显示名称可变，身份不可随意变。

## 受限 Markdown

资源文字与 Card 描述可使用受限 Markdown：`**粗体**`、`*斜体*`、`***粗斜体***`、`- 无序项`、`1. 有序项`，以及 `:red[...]`、`:orange[...]`、`:yellow[...]`、`:green[...]`、`:blue[...]`、`:purple[...]`、`:gray[...]`。颜色语法不能嵌套；raw HTML 会被当作文本或过滤。Character Data 不存渲染 HTML。主题可通过如 `--restricted-markdown-blue` 的包作用域变量调整安全颜色。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Character Data

角色值、Cards、Composite Resources、选择快照与 Player Images 的持久格式。

语义约束：

- Character Data 的 systemPackage id/version 必须匹配当前包才可原生导入。
- Player Image dataUrl 只在 Character Data 中嵌入；System Package 资产只保存引用。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；角色值、Cards、Composite Resources、选择快照与 Player Images 的持久格式。 |
| kind | 是 | "pbdh-character-data" | — |
| schemaVersion | 是 | "0.1.0" | — |
| systemPackage | 是 | object | 未知字段不属于合同 |
| systemPackage.id | 是 | string | 最短 1 |
| systemPackage.version | 是 | string | 最短 1 |
| character | 是 | object | 未知字段不属于合同 |
| character.id | 是 | string | 最短 1 |
| character.values | 是 | object | — |
| cards | 是 | object | 默认 {"instances":[]}；未知字段不属于合同 |
| cards.instances | 是 | array | — |
| cards.instances[] | 是 | object | 未知字段不属于合同 |
| cards.instances[].instanceId | 是 | string | 最短 1 |
| cards.instances[].tableModuleId | 是 | string | 最短 1 |
| cards.instances[].definitionRef | 否 | object \| object | — |
| cards.instances[].definitionRef<resourceLibrary> | 否 | object | 未知字段不属于合同 |
| cards.instances[].definitionRef<resourceLibrary>.type | 是 | "resourceLibrary" | — |
| cards.instances[].definitionRef<resourceLibrary>.libraryId | 是 | string | 最短 1 |
| cards.instances[].definitionRef<resourceLibrary>.entryId | 是 | string | 最短 1 |
| cards.instances[].definitionRef<compositeResource> | 否 | object | 未知字段不属于合同 |
| cards.instances[].definitionRef<compositeResource>.type | 是 | "compositeResource" | — |
| cards.instances[].definitionRef<compositeResource>.compositeResourceId | 是 | string | 最短 1 |
| cards.instances[].libraryId | 否 | string | 最短 1 |
| cards.instances[].definitionId | 否 | string | 最短 1 |
| cards.instances[].state | 是 | string | — |
| cards.instances[].xPct | 是 | number | — |
| cards.instances[].yPct | 是 | number | — |
| cards.instances[].zIndex | 是 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| cards.instances[].face | 是 | "front" \| "back" | — |
| cards.instances[].rotation | 是 | number | — |
| cards.instances[].scale | 是 | number | — |
| cards.instances[].indicators | 是 | array \| object | 默认 [] |
| cards.instances[].indicators<variant 1> | 是 | array | 最多项 10 |
| cards.instances[].indicators<variant 1>[] | 是 | object | 未知字段不属于合同 |
| cards.instances[].indicators<variant 1>[].indicatorId | 是 | string | 最短 1 |
| cards.instances[].indicators<variant 1>[].colorIndex | 是 | integer | 最小 0；最大 9 |
| cards.instances[].indicators<variant 1>[].value | 是 | integer | 最小 0；最大 9007199254740991 |
| cards.instances[].indicators<variant 2> | 是 | object | — |
| cards.instances[].tokenCount | 否 | integer | 最小 0；最大 9007199254740991 |
| compositeResources | 是 | object | 默认 {} |
| resourceSelections | 是 | object | 默认 {} |
| playerImages | 是 | object | 默认 {} |
| updatedAt | 是 | string | 最短 1 |

<!-- END GENERATED CONTRACT -->
