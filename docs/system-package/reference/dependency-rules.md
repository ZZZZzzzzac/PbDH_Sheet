# Dependency Rule interfaces

Rule：`ID` 非空唯一；`sources`、`targets`、`动作` 都至少一项；`触发` 必填；`条件` 可选（省略等价无额外条件）。

## Source / trigger

- Source `{类型:"resourcePicker", 模块ID}` ↔ trigger `{类型:"resourceSelected", 来源模块ID}`。
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

- `fillText`：`{目标模块ID, 内容}`。目标只能 freeText/longText/readOnlyDisplay。内容是 string，或 `{类型:"selectedResourceField", 字段, 选择索引?: non-negative integer, 分隔符?: string}`。资源字段内容只用于 resourceSelected。
- `setVisibility`：`{目标类型:"page"|"module", 目标ID, 显示:boolean}`。
- `setResourceDefaultFilter`：`{目标模块ID, 字段, 值:string[]}`，目标必须 resourcePicker，值至少一项且字段必须存在于目标 Library。

Engine 对当前已提交数据单轮求值，输出 view effects、data patches、option effects 和 errors；不递归触发本轮 patch，不读 DOM/UI/Guide/Validation result。
