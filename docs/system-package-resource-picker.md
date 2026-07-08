# System Package Resource Picker 与 Dependency Fill 接口

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
  -> resourceSelected 触发后的 fillText 规则

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

## Dependency Fill

`manifest.json` 可声明依赖文件：

```json
{
  "dependencies": "dependencies.json"
}
```

`dependencies.json` 中声明选择后的填充动作：

```json
[
  {
    "ID": "fill-class-from-picker",
    "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" },
    "动作": [
      { "类型": "fillText", "目标模块ID": "class-name", "资源字段": "名称" },
      { "类型": "fillText", "目标模块ID": "class-domains", "资源字段": "领域" },
      { "类型": "fillText", "目标模块ID": "class-feature", "资源字段": "职业特性" }
    ]
  }
]
```

`fillText` v1 规则：

| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `类型` | 是 | 无 | 固定为 `fillText`。 |
| `目标模块ID` | 是 | 无 | 目标必须是 `freeText` 或 `longText`。 |
| `资源字段` | 是 | 无 | 从 selected resource entry 的哪个字段取值。 |
| `选择索引` | 否 | 全部选中项 | 多选时指定第几个条目；不指定则把所有选中项字段值拼接。 |
| `分隔符` | 否 | `\n\n` | 多选拼接分隔符。 |

Character Data 只保存被填充后的目标模块值，不保存资源选择引用。

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

- `fillText` 以外的 dependency actions。
- 显示/隐藏模块。
- 创建卡牌实例。
- 持久保存选中资源引用。
- 多轮链式依赖计算。

## 参考

可参考 `public/system-packages/demo-selection/`：

- `manifest.json` 定义资源库和 `dependencies.json` 路径。
- `modules.json` 定义 `resourcePicker` 按钮和被填充的文本模块。
- `dependencies.json` 定义资源选择后的 `fillText` 动作。
- `resources/*.json` 使用真实 Daggerheart 数据。
