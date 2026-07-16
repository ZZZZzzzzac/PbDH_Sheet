# Resource Library interfaces

manifest reference：`{ ID: string, 名称: string, 路径: path }`，三者必填。Library 文件必须是 JSON object array。

Resource Entry 的 `ID` 必填、非空且在本 Library 唯一。ID 是稳定身份而不是显示值，可以使用中文；推荐用可读命名空间消除重名，例如 `职业:德鲁伊`、`子职:德鲁伊:元素结社:基础`、`领域卡:奥术:符文护符`。发布后不要因显示名称润色而修改 ID。

迁移已发布 ID 时，可选 `旧ID` 声明一个非空字符串或不重复的非空字符串数组。当前 ID 与同 Library 内所有旧 ID 共同占用身份命名空间，任何当前/旧 ID 冲突都是 error。框架在载入 Character Data 时把旧 Card Definition Reference 和 Derived Source Snapshot 改写为当前 ID；`旧ID` 只用于显式迁移，框架不会按名称猜测。其余键允许任意 JSON value。Normalizer 转换规则：null/undefined → `""`；string 原样；number/boolean/bigint → `String(value)`；array/object → `JSON.stringify(value)`。因此 runtime `entry.fields` 是 `Record<string,string>`。

Resource Library Browser 的可见表格值按[Restricted Markdown](restricted-markdown.md)展示；列标题、筛选控件、搜索框和无障碍名称保持纯文本。查询、筛选和排序仍使用原始字符串。

推断 Field metadata：

```text
{ key, label, visible, filterable, sortable, searchable, width? }
```

框架标识字段 `ID` 始终保留在 normalized Entry 中供引用和验证使用；Author-only 的 `原名` 可保留资源的原文名称，`旧ID` 可保留迁移别名。三者的推断 metadata 默认都设置为不可见、不可筛选、不可排序、不可搜索，因此 Resource Picker、Resource Composer 和 Other Resources Picker 默认不向 Player 展示它们。Author 如确有诊断或展示需要，可在普通 Picker 链接或 Composer 来源槽位的 `字段模板` 中显式启用。

Author `资源库[].字段模板` 与 `resourceComposer.来源槽位[].字段模板`：

每个 Picker-Library 链接的 `字段模板` 按 `键` 局部覆盖推断 metadata，而不是替换完整字段列表。未在模板中声明的 Library 字段保留推断配置和原始顺序；同键模板只覆盖显式提供的属性。模板声明但 Library 未推断出的字段追加到末尾，并使用下表默认值补全。省略或提供空模板都直接使用完整推断字段。

| 字段 | 类型 | 必填 | 默认 |
| --- | --- | --- | --- |
| `键` | string | 是 | — |
| `标签` | string | 否 | 推断 label 或 key |
| `默认显示` | boolean | 否 | `true` |
| `可筛选` | boolean | 否 | 推断；通常普通值 true |
| `可排序` | boolean | 否 | 推断 |
| `可搜索` | boolean | 否 | `默认显示`，再回退推断 |
| `列宽` | enum | 否 | 根据显示长度推断 |

`queryResourceLibraryEntries` 的顺序是 exact filters → keyword search → sort。Filters 对同一字段使用 allowed-values OR，不同字段 AND。Keywords 按空白拆词；每个词必须命中该 entry 至少一个 searchable field。Sort 使用 `zh-Hans` localeCompare，默认 asc。

Card Table 消费的 Library 额外要求每条有非空配置后的 name/description 字段。
