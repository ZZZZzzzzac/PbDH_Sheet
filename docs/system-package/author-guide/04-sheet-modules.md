# Sheet Modules

Sheet Module 是框架提供的交互或展示部件。共同字段是唯一 `ID`、`类型` 和可选 `默认隐藏`（默认 `false`）。布局只放 `<pb-module>`，不能自己写表单控件。

当前类型：

- `freeText`：单行自由文本；需要 `标签`，可写 `默认值`。
- `longText`：多行文本；需要 `标签`，可写 `默认值`、`行数`（2–20）。
- `checkboxResource`：离散勾选项；需要 `标签` 和非空 `选项`，每项含唯一 `ID`、`标签`，`默认选中` 默认 false。
- `countableResource`：当前值/上下限；需要 `标签`，支持整数 `最小值`、`最大值`、`默认值`、正整数 `步长`、`最大值可改`。
- `readOnlyDisplay`：只读文本或 Asset；需要 `标签`，`内容` 与 `资源ID` 至少一个，可写 `替代文本`。
- `imageField`：Player 上传头像/立绘；需要 `标签`，可写 `替代文本`。
- `resourcePicker`：打开 Resource Library Browser 并发出临时选择事件；不保存选择本身。
- `cardTable`：显示和操作由 Resource Library 定义的 Cards。

普通 Sheet Value 默认按文本保存，不要因为看起来像数字就假设 Validator 会做数值校验。模块完整字段见[Sheet Module Reference](../reference/sheet-modules.md)。
