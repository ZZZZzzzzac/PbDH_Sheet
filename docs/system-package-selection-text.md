# System Package Selection Text 与 Resource Library 接口

> 过时文档：`selectionText` 模块已被 `resourcePicker` + `resourceSelected` Dependency Fill 取代。新 System Package 应使用 [System Package Resource Picker 与 Dependency Fill 接口](system-package-resource-picker.md)。

读者：System Package Author，以及协助 Author 写包的 AI

本文定义 Author 如何在 System Package 中声明 Resource Library，并用 `selectionText` Sheet Module 让 Player 从资源库中选择条目。选择后的结果写入 Character Data；自动填充其他模块、创建卡牌、显示隐藏模块等行为属于后续 Dependency Engine，不在本文接口内。

## 文件关系

一个选择文本模块至少涉及 4 处声明：

```text
manifest.json
  -> resourceLibraries[] 声明资源库 ID、名称、JSON 路径
  -> modules 指向 modules.json

resources/*.json
  -> 资源库条目，必须是 JSON 对象数组

modules.json
  -> selectionText 模块，引用 resourceLibraries[].ID，并声明本模块的字段模板

layouts/*.html
  -> <pb-module id="..."></pb-module> 把模块放到页面上
```

## Resource Library

在 `manifest.json` 中声明资源库：

```json
{
  "resourceLibraries": [
    {
      "ID": "domain-cards",
      "名称": "领域卡",
      "路径": "resources/domain_cards.json"
    }
  ]
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `ID` | 是 | 资源库稳定 ID。`selectionText.资源库ID` 引用它。 |
| `名称` | 是 | Player 在资源库弹窗中看到的名称。 |
| `路径` | 是 | 指向包内 JSON 文件。路径相对包根目录，禁止绝对路径、`..` 和外部 URL。 |

### 资源文件格式

资源文件必须是 JSON 对象数组。每个条目必须有稳定字符串 `ID`：

```json
[
  {
    "ID": "domain-card:卷土重来",
    "名称": "卷土重来",
    "类型": "领域卡",
    "领域": "利刃",
    "等级": "1",
    "属性": "能力",
    "回想": "1",
    "描述": "当你承受严重伤害时，你可以标记 1 压力点来将伤害等级降低一级。",
    "卡图": "assets/flame-card.svg"
  }
]
```

约定：

- `ID` 必须稳定且在同一资源库内唯一。
- 缺少 `ID` 或重复 `ID` 是 System Package error，Sheet Tool 不渲染。
- 条目按最大字段集规范化；某条缺少某字段时填空字符串。
- 普通 Resource Value 默认按字符串显示、筛选和排序。数字不会被当成游戏数值解释。
- 对象/数组会被转成 JSON 字符串；不建议作为 v1 筛选字段。
- 系统包图片只写资源路径或 asset 引用，例如 `"卡图": "assets/flame-card.svg"`。不要把图片 base64 写进资源文件或 Character Data。

## Selection Text Module

在 `modules.json` 中定义选择文本模块。字段模板写在模块里，因为同一个资源库可能被不同模块用不同方式浏览：

```json
{
  "ID": "domain-card-single",
  "类型": "selectionText",
  "标签": "领域卡",
  "资源库ID": "domain-cards",
  "字段模板": [
    { "键": "名称", "标签": "卡名", "默认显示": true, "可筛选": false, "可排序": true },
    { "键": "领域", "标签": "领域", "默认显示": true, "可筛选": true, "可排序": true },
    { "键": "等级", "标签": "等级", "默认显示": true, "可筛选": true, "可排序": true },
    { "键": "描述", "标签": "描述", "默认显示": true, "可筛选": false, "可排序": false }
  ],
  "默认查询": {
    "filters": {
      "领域": ["利刃"],
      "等级": ["1"]
    },
    "sort": {
      "field": "名称",
      "direction": "asc"
    }
  }
}
```

字段说明：

| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ID` | 是 | 无 | Sheet Module 稳定 ID，也是 Character Data 写入键。 |
| `类型` | 是 | 无 | 固定为 `selectionText`。 |
| `标签` | 是 | 无 | 页面上显示的模块标题。 |
| `资源库ID` | 是 | 无 | 引用 `manifest.json.resourceLibraries[].ID`。 |
| `字段模板` | 否 | 从资源数据推导 | 控制本模块弹窗的字段顺序、显示名、默认显示、筛选/排序参与。 |
| `多选` | 否 | `false` | `false` 为单选；`true` 为多选。 |
| `默认查询` | 否 | 无筛选、不排序 | 打开资源库弹窗时的初始筛选/排序状态。 |

### 字段模板

`字段模板` 的每项格式：

| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `键` | 是 | 无 | 对应资源条目的字段名。 |
| `标签` | 否 | 等于 `键` | 表格列头、筛选组标题。 |
| `默认显示` | 否 | `true` | 是否默认作为表格列显示。 |
| `可筛选` | 否 | 普通字段为 `true`，复杂字段为 `false` | 是否出现在筛选区。 |
| `可排序` | 否 | 普通字段为 `true`，复杂字段为 `false` | 是否出现在排序字段列表。 |

如果模块声明了 `字段模板`，弹窗的表格、筛选和排序只使用模板列出的字段；未列出的字段仍保留在 normalized Resource Entry 和选择 `snapshot` 中，但默认不在弹窗中显示。这适合隐藏 `ID`、`原名`、内部标记等字段。

如果模块没有声明 `字段模板`，弹窗从资源数据自动推导字段集合。

多选示例：

```json
{
  "ID": "domain-card-multi",
  "类型": "selectionText",
  "标签": "领域卡组",
  "资源库ID": "domain-cards",
  "多选": true
}
```

## 默认查询

`默认查询.filters` 是字段名到可选值数组的映射：

```json
{
  "filters": {
    "领域": ["利刃", "骸骨"],
    "等级": ["1"]
  }
}
```

筛选规则：

- 同字段多个值是 OR：`领域 = 利刃 OR 骸骨`。
- 不同字段之间是 AND：`(领域 = 利刃 OR 骸骨) AND 等级 = 1`。
- 字段和值都按字符串匹配。

`默认查询.sort`：

```json
{
  "sort": {
    "field": "名称",
    "direction": "asc"
  }
}
```

`direction` 可选 `asc` 或 `desc`，省略时等同 `asc`。

当前 `默认查询` 只影响弹窗初始状态。未来 Dependency Engine 可从外部改变默认筛选/排序，但本阶段不执行依赖动作。

## 页面布局中放置模块

在 HTML Layout Template 中用模块 ID 放置：

```html
<section class="selection-demo-grid" aria-label="选择文本">
  <pb-module id="domain-card-single"></pb-module>
  <pb-module id="domain-card-multi"></pb-module>
</section>
```

`pb-module id` 必须引用 `modules.json` 中存在的模块。

## Character Data 形状

Player 选择后，Character Data 写入模块自己的 `ID`。单选和多选都使用同一种值类型：

```json
{
  "kind": "resource-selection",
  "mode": "single",
  "libraryId": "domain-cards",
  "selected": [
    {
      "libraryId": "domain-cards",
      "entryId": "domain-card:卷土重来",
      "snapshot": {
        "ID": "domain-card:卷土重来",
        "名称": "卷土重来",
        "领域": "利刃",
        "等级": "1",
        "卡图": "assets/flame-card.svg"
      }
    }
  ]
}
```

约定：

- `entryId` 保存资源条目引用。
- `snapshot` 保存选择当时的文本快照，便于导出和调试。
- Character Data 不复制完整资源库。
- System Package 图片只保存路径或 asset 引用，不保存图片 bytes/base64。
- 选择后运行时会输出 `console.log("selectionText.select", ...)`，包含 `moduleId`、`libraryId`、选中 ID 和 snapshot，方便调试。

## 校验错误

常见 error：

| code | 原因 |
| --- | --- |
| `MISSING_RESOURCE_LIBRARY_REFERENCE` | `selectionText.资源库ID` 引用了不存在的资源库。 |
| `RESOURCE_LIBRARY_NOT_ARRAY` | 资源文件不是 JSON 数组。 |
| `RESOURCE_LIBRARY_ENTRY_NOT_OBJECT` | 资源数组内有非对象条目。 |
| `RESOURCE_ENTRY_ID_MISSING` | 资源条目缺少稳定字符串 `ID`。 |
| `DUPLICATE_RESOURCE_ENTRY_ID` | 同一资源库内条目 `ID` 重复。 |
| `DUPLICATE_RESOURCE_LIBRARY_ID` | `manifest.resourceLibraries` 中资源库 `ID` 重复。 |
| `PACKAGE_FILE_MISSING` | `路径` 指向的资源文件不存在。 |
| `PACKAGE_PATH_UNSAFE` | `路径` 使用绝对路径、`..` 或外部 URL。 |

## 完整参考

可参考 `public/system-packages/demo-selection/`：

- `manifest.json` 定义 `classes`、`subclasses`、`domain-cards` 三个资源库。
- `modules.json` 定义职业、子职、领域卡单选和领域卡多选，以及各自的字段模板。
- `resources/domain_cards.json` 使用真实 Daggerheart 领域卡数据。
- `resources/classes.json` 将职业的 `领域` 拆成 `领域1` / `领域2`，便于筛选。
