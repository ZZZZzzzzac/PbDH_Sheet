# Sheet Module interfaces

共同字段：`ID: non-empty string`（全包唯一）、`类型` discriminator、`默认隐藏?: boolean = false`。

## freeText

| 字段 | 类型 | 必填 | 默认/约束 |
| --- | --- | --- | --- |
| `标签` | string | 是 | 空字符串等价于隐藏视觉标签 |
| `默认值` | string | 否 | `""` at Character initialization |
| `隐藏标签` | boolean | 否 | `false`；为 `true` 时只隐藏视觉标签；`标签: ""` 也会隐藏 |
| `占位文本` | string | 否 | 输入框 placeholder；不写入 Character Data |

Player value 作为原始文本写 Character Data，并按[Restricted Markdown](restricted-markdown.md)展示。空或聚焦时显示单行原始输入；非空失焦时显示渲染结果。列表语法不会把 freeText 改成多行控件。
隐藏视觉标签时，输入框依次使用非空 `标签`、`占位文本`、Module `ID` 作为无障碍名称。

## longText

同 freeText（包括 Restricted Markdown、`隐藏标签`、`占位文本`），另有 `行数?: integer`，范围 2–20；省略时由组件默认高度决定。longText 编辑时仍是 textarea。

## checkboxResource

`标签` 必填；`选项` 为至少一项。Option：`ID`、`标签` 必填且非空，`默认选中?: boolean = false`，`分组?: string`。同一模块 option ID 唯一。具有相同 `分组` 的选项显示为多个 checkbox 共用第一项说明文字，但状态仍彼此独立。Character Data 保存选中状态；`checkboxChanged` 可触发 Dependency。

## countableResource

`标签` 必填。可选整数：`最小值`、`最大值`、`默认值`；`步长` 必须为正整数；`最大值可改?: boolean = false`。省略上下限表示框架不施加对应边界。该模块当前不是 Dependency source，但可作为 `fillCountable` target；Dependency 可持久化修改 current 和 max，不受 `最大值可改` 限制（该字段只控制 Player UI）。

## readOnlyDisplay

`标签` 必填。`内容?: non-empty string` 与 `资源ID?: non-empty string` 至少一个；`替代文本?: string`。`资源ID` 必须匹配 Asset ID 或路径。`fillText` 可改变内存派生内容，不写 Character Data。

## imageField

`标签` 必填；`替代文本?: string`。Player 图片以 data URL/base64 随 Character Data 恢复；System Package 图片应使用 Asset/readOnlyDisplay。

Player 点击图片区域或在其聚焦时按 Enter/Space 打开本地文件选择器；上传后可点击右上角移除按钮清除图片。再次点击图片区域可替换现有图片。稳定部件包括 `container`、`label`、`surface-frame`、`surface`、`image`、`image-fallback`、`remove-button`、`input`。

## resourcePicker

| 字段 | 类型 | 必填 | 默认/约束 |
| --- | --- | --- | --- |
| `按钮文本` | string | 是 | 非空 |
| `资源库ID` | string | 是 | 必须存在 |
| `字段模板` | FieldTemplate[] | 否 | 按 `键` 局部覆盖推断 Library fields；未声明字段保留 |
| `多选` | boolean | 否 | `false` |
| `默认查询.filters` | record<string,string[]> | 否 | `{}` |
| `默认查询.sort.field` | string | 条件 | sort 存在时非空 |
| `默认查询.sort.direction` | `asc|desc` | 否 | `asc` |
| `创建卡牌.卡牌桌面模块ID` | string | 条件 | 目标必须 cardTable，且其 `资源库IDs` 必须包含 Picker 的 Library |
| `创建卡牌.默认状态` | string | 否 | Card Engine 默认状态 |

选择是临时事件，不存隐藏资源引用。

## cardTable

`标签`、非空且不重复的 `资源库IDs: string[]` 必填。每个 ID 都必须引用已声明的 Resource Library。多个 Library 共用该桌面的状态选项、坐标系、层级和 Card Presentation 配置。旧的单数 `资源库ID` 不受支持。`状态选项?: string[]`；`显示方式?: image|text`；`卡名字段` 默认 `名称`，`描述字段` 默认 `描述`，`卡图字段` 默认 `卡图`，`显示方式字段?: string`。详见[Cards](cards.md)。
