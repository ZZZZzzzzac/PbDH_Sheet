# Dependency Rule interfaces

Rule：`ID` 非空唯一；`sources`、`targets`、`动作` 都至少一项；`触发` 必填；`条件` 可选（省略等价无额外条件）。

## Source / trigger

- Source `{类型:"resourcePicker"|"resourceComposer", 模块ID}` ↔ trigger `{类型:"resourceSelected", 来源模块ID}`。
- Source `{类型:"checkboxResource", 模块ID}` ↔ trigger `{类型:"checkboxChanged", 来源模块ID}`。
- Source `{类型:"countableResource", 模块ID}` ↔ trigger `{类型:"countableChanged", 来源模块ID}`。Player 修改 current 或 max 后触发；事件携带提交后的 `{current,max}`。

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

- `fillText`：`{目标模块ID, 内容, 写入方式?:"替换"|"追加", 追加分隔符?:string}`。目标只能 freeText/longText/readOnlyDisplay；`追加`只允许没有`选项`的自由输入 freeText 与 longText。省略`写入方式`等价`替换`；追加时仅在旧值与新值都非空时插入`追加分隔符`，默认两个换行。替换可以写入下拉 Free Text；若结果不在其选项中，字符串仍保留并作为临时不可选项显示。
  - `内容`可为 string。
  - `{类型:"selectedResourceField", 字段, 选择索引?: non-negative integer, 分隔符?: string}`复制一个字段。
  - `{类型:"selectedResourceTemplate", 格式, 选择索引?: non-negative integer, 分隔符?: string}`用`{{字段}}`占位符组合多个字段。多选且省略`选择索引`时，每个 Resource Entry 独立套用模板，再用`分隔符`连接；默认两个换行。模板引用字段必须存在；运行时个别 Entry 缺值时替换为空字符串。
  - 两种资源内容只用于 resourceSelected。模板输出和追加结果都是原始文本，Restricted Markdown 在模块展示时解析。
- `fillCountable`：`{目标模块ID, 当前值?, 最大值?}`，至少声明一项，目标只能 countableResource。当前值接受整数常量、`selectedResourceField` 或下述 `integerCalculation`；最大值还接受 `null`（移除上限）。资源字段只用于 resourceSelected，并按完整十进制整数解析；多选 Picker 必须声明 `选择索引`。未声明的状态保持原值。最终 `max` 不低于目标模块 `最小值`，`current` 随最终 max 收缩。
  - `integerCalculation`：`{类型:"integerCalculation", 初始值:int, 运算:[...], 最小值?:int, 最大值?:int}`。运算至少一项，按声明顺序执行；每项 `{操作:"add"|"subtract", 值}`。
  - 运算值可为整数常量、`{类型:"countableCurrent", 模块ID}` 或 `{类型:"resourceSelectionCount", 模块ID}`。前者读取 Countable 当前值；后者读取持久 Derived Source Snapshot 中的 Entry 数量，无选择时为 0。
  - 计算引用的模块必须同时列入规则 `sources`，且类型必须匹配。结果超出安全整数时产生 warning 并跳过该成员。
- `setVisibility`：`{目标类型:"page"|"module", 目标ID, 显示:boolean}`。
- `setResourceDefaultFilter`：`{目标模块ID, 字段, 值}`，目标必须 resourcePicker，目标字段必须存在于目标 Library。`值`可为至少一项的 `string[]`，也可为 `{类型:"selectedResourceField", 字段, 选择索引?}`，在 `resourceSelected` 时从选中 Entry 动态取得筛选值；后者的来源字段必须存在，因而一条规则可适用于扩展新增的同类资源，而无需枚举 Entry 名称或 ID。

Engine 对当前已提交数据单轮求值，输出 view effects、typed data patches、option effects 和 errors；不递归触发本轮 patch，不读 DOM/UI/Guide/Validation result。同一轮对同一 countableResource 的 current/max 分别检测覆盖冲突。

## 纯派生重建

框架按动作合同自动分类，不提供 Author 手动 `可重建` 开关：

- `setVisibility` 可重建。
- `setResourceDefaultFilter` 可重建。
- 目标为 `readOnlyDisplay` 的 `fillText` 可重建。
- 写 freeText/longText 的 `fillText`、追加文本和 `fillCountable` 不可重建。

当 Resource Picker 参与至少一个可重建动作时，Character Data 保存该 Module 最近一次选择的最小 Resource Reference。Resource Composer 使用其现有 Composite Resource；Checkbox Resource 使用已保存的 Checkbox State。加载、导入、切换 Character Save 或提交新资源选择后，Engine 从默认派生状态按规则声明顺序重算全部可用纯派生动作；不执行不可重建动作，不创建 Card，也不持久化最终派生结果。相同目标写入相同结果可合并；不同结果仍报告冲突 warning。

当 `integerCalculation` 使用 `resourceSelectionCount` 时，对应 Resource Picker 也保存最小 Resource Reference，使之后的 `countableChanged` 能读取选择数量。计算出的 Countable 值本身正常写入 Character Data，因此加载时不重放该写入。
