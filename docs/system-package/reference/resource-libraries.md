# Resource Library interfaces

manifest reference：`{ ID: string, 名称: string, 路径: path }`，三者必填。Library 文件必须是 JSON object array。

Resource Entry 的 `ID` 必填、非空且在本 Library 唯一。其余键允许任意 JSON value。Normalizer 转换规则：null/undefined → `""`；string 原样；number/boolean/bigint → `String(value)`；array/object → `JSON.stringify(value)`。因此 runtime `entry.fields` 是 `Record<string,string>`。

推断 Field metadata：

```text
{ key, label, visible, filterable, sortable, searchable, width? }
```

框架标识字段 `ID` 始终保留在 normalized Entry 中供引用和验证使用，但推断 metadata 默认设置为不可见、不可筛选、不可排序、不可搜索，因此 Resource Picker 默认不向 Player 展示 ID。Author 如确有诊断或展示需要，可在 Picker `字段模板` 中显式声明 `键: "ID"` 并启用相应选项。

Author `字段模板`：

`字段模板` 按 `键` 局部覆盖推断 metadata，而不是替换完整字段列表。未在模板中声明的 Library 字段保留推断配置和原始顺序；同键模板只覆盖显式提供的属性。模板声明但 Library 未推断出的字段追加到末尾，并使用下表默认值补全。省略或提供空模板都直接使用完整推断字段。

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
