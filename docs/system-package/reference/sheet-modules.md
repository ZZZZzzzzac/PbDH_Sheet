# Sheet Module interfaces

共同字段：`ID: non-empty string`（全包唯一）、`类型` discriminator、`默认隐藏?: boolean = false`。

## freeText

| 字段 | 类型 | 必填 | 默认/约束 |
| --- | --- | --- | --- |
| `标签` | string | 是 | 空字符串等价于隐藏视觉标签 |
| `默认值` | string | 否 | `""` at Character initialization |
| `隐藏标签` | boolean | 否 | `false`；为 `true` 时只隐藏视觉标签；`标签: ""` 也会隐藏 |
| `占位文本` | string | 否 | 输入框 placeholder；不写入 Character Data |

Player value 作为原始文本写 Character Data，并按[Restricted Markdown](restricted-markdown.md)展示。空或聚焦时显示单行原始输入；非空失焦时显示渲染结果。预览默认在自然字号与 `9px` 之间自动选择能够保持单行且完整容纳内容的最大字号；若 `9px` 仍超宽，继续单行裁切，并由 Framework Check 产生 `TEXT_CONTENT_OVERFLOW` warning。编辑态保持正常字号并可横向滚动。拟合状态不写 Character Data，也不提供 System Package 配置开关。列表语法不会把 freeText 改成多行控件。
隐藏视觉标签时，输入框依次使用非空 `标签`、`占位文本`、Module `ID` 作为无障碍名称。

## longText

同 freeText（包括 Restricted Markdown、`隐藏标签`、`占位文本`），另有 `行数?: integer`，范围 2–20，省略时为 4。`行数`是编辑态 textarea 与失焦 Markdown 预览共同使用的固定视觉高度，不只是初始高度；两种状态超出时都在内部滚动。

非空 Markdown 预览默认在自然字号与 `9px` 之间自动选择能够完整容纳内容的最大字号。内容、容器尺寸或字体加载完成时重新拟合；拟合状态不写 Character Data。若 `9px` 仍无法容纳，内容保留滚动访问，并由 Base Framework 的 Framework Check 产生 `TEXT_CONTENT_OVERFLOW` warning。该行为是 Base Framework 固有策略，不提供 System Package 配置开关；Author CSS 仍可覆盖 Module 尺寸，但不能向 Validation Script 暴露 DOM。

## checkboxResource

`标签` 必填；`选项` 为至少一项。Option：`ID`、`标签` 必填且非空，`默认选中?: boolean = false`，`分组?: string`。同一模块 option ID 唯一。具有相同 `分组` 的选项显示为多个 checkbox 共用第一项说明文字，但状态仍彼此独立。Character Data 保存选中状态；`checkboxChanged` 可触发 Dependency。

## countableResource

`标签` 必填。可选整数：`最小值`、`最大值`、`默认值`；`步长` 必须为正整数；`最大值可改?: boolean = false`。省略上下限表示框架不施加对应边界。该模块当前不是 Dependency source，但可作为 `fillCountable` target；Dependency 可持久化修改 current 和 max，不受 `最大值可改` 限制（该字段只控制 Player UI）。

`显示方式?: "数值" | "标记"` 省略时为 `数值`，保持当前值/最大值输入形式。`标记`仍是同一个 Countable Resource，并要求：

```json
{
  "ID": "hp",
  "类型": "countableResource",
  "标签": "生命",
  "显示方式": "标记",
  "当前值标记": "❤️",
  "剩余值标记": "🖤",
  "最小值": 0,
  "最大值": 6,
  "默认值": 3,
  "步长": 1,
  "最大值可改": true
}
```

- `当前值标记`、`剩余值标记` 各是一个非空白 Unicode 字素，支持由多个 code point 组成的单个 emoji；两者必须不同。
- 标记展示的 `最小值` 不得为负，省略仍为 `0`。显示 `current` 个当前值标记，再显示 `max - current` 个剩余值标记；无上限时只显示当前值标记。
- 普通点击 `-` / `+` 按 `步长` 修改 current。有限上限且 `最大值可改: true` 时，右键或触屏长按按 `步长` 修改 max；降低 max 会同时把 current 收缩到新 max。无上限时上限操作无效。
- 标记展示没有数字输入框，也不提供上限键盘快捷键或可见操作提示。按钮只在当前值与上限操作都不能生效时禁用。
- 标记区高度固定，允许换行并自动缩小到最低 `5px`；仍溢出时内部横向滚动，不增加 Module 高度。拟合状态不写入 Character Data。
- 标记展示额外公开稳定 parts：`marker-group`、`current-markers`、`remaining-markers`、单个等宽标记格 `marker`。现有 `container`、`label`、`counter`、`decrement-button`、`increment-button` 继续可用。
- 浏览器打印/PDF 与 HTML snapshot 使用固定的 Countable Resource 输出策略，不提供 Player 选择：视觉清零 current；有限 Marker Presentation 按 max 把所有槽位临时替换为字号约 5.5mm 的 Unicode 空心方块 `□`；无上限 Marker Presentation 不显示槽位；数值展示把 current 显示为 `0` 并保留 max。输出不使用 Author 配置的 marker 字形，便于 Player 在纸面用笔涂写。该策略只改变输出视觉结果，不修改 Character Data。

## readOnlyDisplay

`标签` 必填。`内容?: non-empty string` 与 `资源路径?: non-empty string` 至少一个；`替代文本?: string`。`资源路径` 必须匹配 `assets/**` 下自动发现的图片路径。`fillText` 可改变内存派生内容，不写 Character Data。

## imageField

`标签` 必填；`替代文本?: string`。Player 图片以 data URL/base64 随 Character Data 恢复；System Package 图片应使用自动发现的图片路径与 readOnlyDisplay。

Player 点击图片区域或在其聚焦时按 Enter/Space 打开本地文件选择器；上传后可点击右上角移除按钮清除图片。再次点击图片区域可替换现有图片。稳定部件包括 `container`、`label`、`surface-frame`、`surface`、`image`、`image-fallback`、`remove-button`、`input`。

## resourcePicker

| 字段 | 类型 | 必填 | 默认/约束 |
| --- | --- | --- | --- |
| `按钮文本` | string | 是 | 非空 |
| `资源库` | LibraryLink[] \| `"其他"` | 是 | 普通 Picker 至少一个不重复链接；Other Picker 使用字面值 `"其他"` |
| `资源库[].ID` | string | 条件 | 普通 Picker 必填且必须存在 |
| `资源库[].字段模板` | FieldTemplate[] | 否 | 仅作用于该链接；按 `键` 局部覆盖推断 Library fields |
| `资源库[].默认查询.filters` | record<string,string[]> | 否 | 仅作用于该链接；`{}` |
| `资源库[].默认查询.sort.field` | string | 条件 | sort 存在时非空 |
| `资源库[].默认查询.sort.direction` | `asc|desc` | 否 | `asc` |
| `多选` | boolean | 否 | `false` |
| `创建卡牌.卡牌桌面模块ID` | string | 条件 | 目标必须 cardTable；普通 Picker 的全部 Library 必须是显式来源，Other Picker 需要一个 `otherResourceLibraries` 来源 |
| `创建卡牌.默认状态` | string | 否 | 目标 Card Table 的第一个 `状态选项`，再回退内部 `default` |

普通 Picker 可链接多个 Library。Browser 同时只显示一个表；多库时左上角名称变为单选下拉。每个链接独立使用自己的字段模板和默认查询，打开期间也独立保留搜索、筛选、排序；关闭 Browser 后全部清空。选择、多选、Dependency 与创建 Card 行为不因库数量改变，事件携带实际选择所在 Library ID。

`资源库: "其他"` 声明 Other Resources Picker：运行时只显示 Resource Extension 新建、且未被普通 Picker 或 Resource Composer 使用的独立 Library。合并进 System Package 既有 Library 的 contribution 不会出现在这里。该集合由框架计算，Author 不为它声明字段模板或默认查询，Player 不能配置链接。选择是临时事件，不存隐藏资源引用。若配置 `创建卡牌`，目标 Card Table 必须声明 `{ "类型":"otherResourceLibraries", "ID":"其他" }`；Card Instance 保存选择时的实际 Library ID，而不是字面值 `"其他"`。

## resourceComposer

`按钮文本`、非空 `来源槽位` 和非空 `输出字段` 必填。每槽从自己的 `资源库ID` 单选，并可用 `字段模板` 对该槽 Browser 的推断字段做局部覆盖；每条输出映射包含 `字段`、`来源槽位ID`、`来源字段`。只保存一个稳定 Composite Resource，不保存来源选择。可选 `选择关系输出: {字段, 全部相同时, 不全相同时}` 根据各槽 Entry ID 是否全部相同写入一个派生字段；它不解释游戏规则，常用于通过 Card Table 的 `显示方式字段` 在同源组合显示卡图、异源组合显示文字。可选 `创建卡牌` 与 Resource Picker 相同。详见 [Resource Composer](resource-composer.md)。

## cardTable

`标签`、非空且不重复的 `资源来源` 必填。来源是 `{类型:"resourceLibrary"|"resourceComposer", ID, 卡牌展示?}`，或至多一个 `{类型:"otherResourceLibraries", ID:"其他", 卡牌展示?}` 动态来源。每个来源可选配置名称模板、描述模板和标签字段；省略时默认 `{{名称}}`、`{{描述}}` 与其他普通字段标签。动态来源适用于当前 Other Resources Picker 集合，不把具体 Extension Library ID 写入 System Package。多个来源共用状态、坐标系和层级。`状态选项?: non-empty unique string[]`；`状态背景色?: Record<string,"#RRGGBB">`；`显示方式?: image|text`；`卡图字段`、`卡背字段`、`显示方式字段`、`背面卡牌ID字段` 均是 Table 级配置。详见[Cards](cards.md)。
