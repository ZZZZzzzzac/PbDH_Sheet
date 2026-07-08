# System Package Resource Picker 与 Dependency Logic v1 接口

读者：System Package Author，以及协助 Author 写包的 AI

本文定义 Author 如何声明 Resource Library、Resource Picker 触发器，以及如何用 Dependency Logic 把所选资源字段填入已有 Sheet Modules。

## 文件关系

```text
manifest.json
  -> resourceLibraries[] 声明资源库 ID、名称、JSON 路径
  -> modules 指向 modules.json
  -> dependencies 指向 dependencies.json

resources/*.json
  -> 资源库条目，必须是 JSON 对象数组

modules.json
  -> resourcePicker 按钮触发器
  -> freeText / longText 等被填充的目标模块

dependencies.json
  -> resourceSelected / checkboxChanged 触发后的 Dependency Logic 规则

layouts/*.html
  -> <pb-module id="..."></pb-module> 放置按钮和目标模块
```

## Resource Library

`manifest.json` 中声明资源库入口：

```json
{
  "resourceLibraries": [
    {
      "ID": "classes",
      "名称": "职业",
      "路径": "resources/classes.json"
    }
  ]
}
```

资源文件必须是 JSON 对象数组。每个条目必须有唯一稳定字符串 `ID`。普通字段按字符串处理，缺失字段在 normalized Resource Library 中填空字符串。系统包图片只存路径或 asset 引用，不写入 Character Data。

## Resource Picker Module

`resourcePicker` 是按钮式 Sheet Module。它只负责打开资源库弹窗并发出临时 `resourceSelected` 事件，不显示当前选择，也不默认写 Character Data。

```json
{
  "ID": "pick-class",
  "类型": "resourcePicker",
  "按钮文本": "选择职业",
  "资源库ID": "classes",
  "字段模板": [
    { "键": "名称", "标签": "职业", "默认显示": true, "可筛选": false, "可排序": true, "列宽": "normal" },
    { "键": "领域1", "标签": "领域1", "默认显示": true, "可筛选": true, "可排序": true, "列宽": "compact" },
    { "键": "领域2", "标签": "领域2", "默认显示": true, "可筛选": true, "可排序": true, "列宽": "compact" },
    { "键": "职业特性", "标签": "职业特性", "默认显示": true, "可筛选": false, "可排序": false, "列宽": "fill" }
  ],
  "默认查询": {
    "sort": { "field": "名称", "direction": "asc" }
  }
}
```

字段说明：

| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ID` | 是 | 无 | 模块稳定 ID，也是 dependency 触发来源。 |
| `类型` | 是 | 无 | 固定为 `resourcePicker`。 |
| `按钮文本` | 是 | 无 | 按钮文字和 accessible name。 |
| `资源库ID` | 是 | 无 | 引用 `manifest.json.resourceLibraries[].ID`。 |
| `字段模板` | 否 | 从资源数据推导 | 控制弹窗字段顺序、显示名、是否显示、筛选/排序参与。 |
| `多选` | 否 | `false` | `false` 为单选；`true` 为多选。 |
| `默认查询` | 否 | 无筛选、不排序 | 打开弹窗时的初始筛选/排序状态。 |

如果声明了 `字段模板`，弹窗表格、筛选和排序只使用模板列出的字段；未列出的字段仍保留在 selected snapshot 中，可供 dependency rule 使用。

### 字段模板

`字段模板` 的每项格式：

```json
{
  "键": "描述",
  "标签": "效果",
  "默认显示": true,
  "可筛选": false,
  "可排序": false,
  "列宽": "fill"
}
```

| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `键` | 是 | 无 | 对应资源条目的字段名。 |
| `标签` | 否 | `键` | 表头、筛选区和排序选项显示名。 |
| `默认显示` | 否 | `true` | 是否在弹窗表格中显示。 |
| `可筛选` | 否 | normalized 字段元信息 | 是否进入筛选区。复杂对象/数组默认不可筛选。 |
| `可排序` | 否 | normalized 字段元信息 | 是否进入排序下拉框。复杂对象/数组默认不可排序。 |
| `列宽` | 否 | 框架自动推断 | 语义列宽提示：`compact`、`normal`、`wide`、`fill`。 |

`列宽` 只表达数据密度，不是 CSS。Resource Library Browser 的实际像素、换行和响应式布局由 Base Framework 统一控制，Author 不需要也不能为资源库表格写自定义 CSS。

推荐用法：

| 值 | 适合字段 | 行为意图 |
| --- | --- | --- |
| `compact` | `等级`、`类型`、`领域`、`属性`、`消耗`、`生命`、`闪避` 等短值 | 尽量窄，避免短字段浪费横向空间。 |
| `normal` | `名称`、普通短文本 | 常规列宽。 |
| `wide` | 图片路径、较长但不是主体内容的文本 | 给更多空间，但不吃掉剩余宽度。 |
| `fill` | `描述`、`效果`、`简介`、`特性`、`规则文本` 等长文本 | 吃掉剩余空间，通常用于最后一个或少数几个长内容字段。 |

同一个弹窗里如果有多个字段声明为 `fill`，框架只保留最后一个 `fill` 作为主体列，前面的 `fill` 会按 `wide` 显示。这样可以避免多个长文本列平分宽度后一起变窄。资源库表格允许横向滚动，优先保证长文本字段可读。

没有显式 `列宽` 时，框架会按字段名和资源数据样本推断：常见短字段推为 `compact`，`名称/name` 推为 `normal`，常见长文本字段推为 `fill`，其他字段按样本显示长度推为 `compact`、`normal`、`wide` 或 `fill`。

## resourceSelected 事件

Player 选择资源后，运行时产生临时事件：

```json
{
  "type": "resourceSelected",
  "sourceModuleId": "pick-class",
  "libraryId": "classes",
  "selectedEntries": [
    {
      "ID": "class:战士",
      "fields": {
        "名称": "战士",
        "领域": "利刃+骸骨"
      }
    }
  ]
}
```

事件只存在于本次交互中，不写入 Character Data。运行时会 `console.log("resourceSelected", ...)` 输出 moduleId、libraryId、selected item ids 和 snapshots，方便 Author debug。

## Dependency Logic v1

`manifest.json` 可声明依赖文件：

```json
{
  "dependencies": "dependencies.json"
}
```

`dependencies.json` 中声明事件驱动规则。每条规则必须显式声明 `sources` 和 `targets`，方便 Author、Validator 和 AI 辅助工具看清这条规则读谁、写谁。

```json
[
  {
    "ID": "choose-druid-class",
    "sources": [
      { "类型": "resourcePicker", "模块ID": "pick-class" }
    ],
    "targets": [
      { "类型": "module", "模块ID": "class-name" },
      { "类型": "page", "页面ID": "druid-shape-page" },
      { "类型": "module", "模块ID": "pick-subclass" }
    ],
    "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" },
    "条件": { "类型": "selectedResourceFieldEquals", "字段": "名称", "值": "德鲁伊" },
    "动作": [
      { "类型": "fillText", "目标模块ID": "class-name", "内容": { "类型": "selectedResourceField", "字段": "名称" } },
      { "类型": "setVisibility", "目标类型": "page", "目标ID": "druid-shape-page", "显示": true },
      { "类型": "setResourceDefaultFilter", "目标模块ID": "pick-subclass", "字段": "主职", "值": ["德鲁伊"] }
    ]
  }
]
```

### sources / targets

`sources` 目前支持：

| 类型 | 字段 | 说明 |
| --- | --- | --- |
| `resourcePicker` | `模块ID` | Resource Picker 选择资源后触发。 |
| `checkboxResource` | `模块ID` | Checkbox Resource 选项变化后触发。 |

`targets` 目前支持：

| 类型 | 字段 | 说明 |
| --- | --- | --- |
| `module` | `模块ID` | `fillText`、模块显隐、Resource Picker 默认筛选等模块目标。 |
| `page` | `页面ID` | 页面显隐目标。 |

`countableResource` / counter 不支持作为 v1 触发源。手动编辑 `freeText` / `longText` 也不会触发 Dependency Logic。

### 触发

Resource Picker 触发：

```json
{ "类型": "resourceSelected", "来源模块ID": "pick-class" }
```

Checkbox 触发：

```json
{ "类型": "checkboxChanged", "来源模块ID": "creation-toggles" }
```

事件都是临时事件，不写入 Character Data，不在刷新或导入后重放。

### 条件

Resource Picker 条件：

```json
{ "类型": "always" }
{ "类型": "selectedResourceFieldEquals", "字段": "名称", "值": "德鲁伊" }
{ "类型": "selectedResourceFieldIn", "字段": "名称", "值": ["德鲁伊", "游侠"] }
{ "类型": "selectedResourceFieldNotEquals", "字段": "名称", "值": "德鲁伊" }
```

Checkbox 条件：

```json
{ "类型": "checkboxOptionChecked", "选项ID": "show-background-helper" }
{ "类型": "checkboxOptionUnchecked", "选项ID": "show-background-helper" }
```

v1 不做复杂 AND/OR 条件树。

### fillText

`fillText` 可把选中资源字段或固定文本写到目标模块：

```json
{ "类型": "fillText", "目标模块ID": "class-name", "内容": { "类型": "selectedResourceField", "字段": "名称" } }
{ "类型": "fillText", "目标模块ID": "helper", "内容": "固定提示文本" }
```

| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `类型` | 是 | 无 | 固定为 `fillText`。 |
| `目标模块ID` | 是 | 无 | 目标必须是 `freeText`、`longText` 或 `readOnlyDisplay`。 |
| `内容` | 是 | 无 | 固定字符串，或 `{ "类型": "selectedResourceField", "字段": "..." }`。 |

`selectedResourceField` 内容可选 `选择索引` 和 `分隔符`。多选时不指定 `选择索引` 会把所有选中项的字段值按 `分隔符` 拼接，默认分隔符是空行。

目标语义：

| 目标类型 | 行为 |
| --- | --- |
| `freeText` / `longText` | 写入 Character Data，之后 Player 仍可手动修改。 |
| `readOnlyDisplay` | 更新运行时派生展示内容，不写 Character Data。 |

### setVisibility

页面和模块默认显示；Author 可在 page 或 module 上写 `"默认隐藏": true`。Dependency Logic 可用 `setVisibility` 在运行时显示或隐藏页面/模块：

```json
{ "类型": "setVisibility", "目标类型": "page", "目标ID": "druid-shape-page", "显示": true }
{ "类型": "setVisibility", "目标类型": "module", "目标ID": "druid-shape-note", "显示": false }
```

显隐是运行时 view state，不写 Character Data。隐藏模块不会删除已保存的 Sheet Values。

### setResourceDefaultFilter

`setResourceDefaultFilter` 更新另一个 Resource Picker 下次打开时的默认筛选：

```json
{ "类型": "setResourceDefaultFilter", "目标模块ID": "pick-subclass", "字段": "主职", "值": ["德鲁伊"] }
```

这是建议筛选，不是强制限制。Player 打开 Resource Library Browser 后可以清除、修改或添加筛选。运行时默认筛选不写 Character Data。

### 冲突策略

同一次 Dependency Engine 运行中，如果多条生效规则写同一个文本目标、显隐目标或默认筛选目标，后面的规则生效，并用 `console.warn` 输出冲突提示。Validator v1 暂不做静态冲突分析。

Character Data 只保存被填充后的 `freeText` / `longText` / checkbox 状态等真实角色数据，不保存 `resourceSelected` 事件、资源选择引用、页面显隐、readOnlyDisplay 派生内容或 Resource Picker 默认筛选覆盖。

## 页面布局

Resource Picker 和被填充的目标模块都用普通 `pb-module` 放置：

```html
<section aria-label="职业">
  <pb-module id="pick-class"></pb-module>
  <pb-module id="class-name"></pb-module>
  <pb-module id="class-domains"></pb-module>
  <pb-module id="class-feature"></pb-module>
</section>
```

HTML Layout Template 仍禁止 `<button>`、`<input>` 等自定义交互控件。交互必须来自框架提供的 Sheet Modules。

## Out Of Scope

- `countableResource` / counter 触发。
- 手动 `freeText` / `longText` 输入触发。
- 多轮链式依赖计算。
- 刷新/导入后重放旧事件。
- 复杂 AND/OR 条件树。
- 强制筛选或规则合法性封锁。
- 创建卡牌实例。
- 持久保存选中资源引用。

## 参考

可参考 `public/system-packages/demo-selection/`：

- `manifest.json` 定义资源库和 `dependencies.json` 路径。
- `modules.json` 定义 `resourcePicker` 按钮和被填充的文本模块。
- `dependencies.json` 定义资源选择、checkbox、填充、显隐和默认筛选动作。
- `resources/*.json` 使用真实 Daggerheart 数据。
