# Dependency Rule interfaces

Rule：`ID` 非空唯一；`sources`、`targets`、`动作` 都至少一项；`触发` 必填；`条件` 可选（省略等价无额外条件）。

## Source / trigger

- Source `{类型:"resourcePicker"|"resourceComposer", 模块ID}` ↔ trigger `{类型:"resourceSelected", 来源模块ID}`。
- Source `{类型:"checkboxResource", 模块ID}` ↔ trigger `{类型:"checkboxChanged", 来源模块ID}`。

触发模块必须出现在 `sources`，实际 Module type 必须匹配。

## Target

- `{类型:"module", 模块ID}`
- `{类型:"page", 页面ID}`

## Condition

- `{类型:"always"}`
- `{类型:"selectedResourceFieldEquals", 字段, 值:string}`
- `{类型:"selectedResourceFieldNotEquals", 字段, 值:string}`
- `{类型:"selectedResourceFieldIn", 字段, 值:string[]}`，数组至少一项
- `{类型:"checkboxOptionChecked", 选项ID}`
- `{类型:"checkboxOptionUnchecked", 选项ID}`

资源字段条件只用于 resourceSelected；checkbox 条件只用于 checkboxChanged，option 必须存在。

## Action

- `fillText`：`{目标模块ID, 内容, 写入方式?:"替换"|"追加", 追加分隔符?:string}`。目标只能 freeText/longText/readOnlyDisplay；`追加`只允许 freeText/longText。省略`写入方式`等价`替换`；追加时仅在旧值与新值都非空时插入`追加分隔符`，默认两个换行。
  - `内容`可为 string。
  - `{类型:"selectedResourceField", 字段, 选择索引?: non-negative integer, 分隔符?: string}`复制一个字段。
  - `{类型:"selectedResourceTemplate", 格式, 选择索引?: non-negative integer, 分隔符?: string}`用`{{字段}}`占位符组合多个字段。多选且省略`选择索引`时，每个 Resource Entry 独立套用模板，再用`分隔符`连接；默认两个换行。模板引用字段必须存在；运行时个别 Entry 缺值时替换为空字符串。
  - 两种资源内容只用于 resourceSelected。模板输出和追加结果都是原始文本，Restricted Markdown 在模块展示时解析。
- `fillCountable`：`{目标模块ID, 当前值?, 最大值?}`，至少声明一项，目标只能 countableResource。当前值接受整数常量或 `{类型:"selectedResourceField", 字段, 选择索引?}`；最大值还接受 `null`（移除上限）。资源字段只用于 resourceSelected，并按去除首尾空白后的完整十进制整数解析；多选 Picker 必须声明 `选择索引`。未声明的状态保持原值，无效整数产生运行时 warning 并跳过该项。最终 `max` 不低于模块 `最小值`，`current` 按模块 `最小值` 与最终 `max` 约束。
- `setVisibility`：`{目标类型:"page"|"module", 目标ID, 显示:boolean}`。
- `setResourceDefaultFilter`：`{目标模块ID, 字段, 值:string[]}`，目标必须 resourcePicker，值至少一项且字段必须存在于目标 Library。

Engine 对当前已提交数据单轮求值，输出 view effects、typed data patches、option effects 和 errors；不递归触发本轮 patch，不读 DOM/UI/Guide/Validation result。同一轮对同一 countableResource 的 current/max 分别检测覆盖冲突。
