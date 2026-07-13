# Sheet Modules

Sheet Module 是框架提供的交互或展示部件。共同字段是唯一 `ID`、`类型` 和可选 `默认隐藏`（默认 `false`）。布局只放 `<pb-module>`，不能自己写表单控件。

当前类型：

- `freeText`：单行自由文本；需要 `标签`，可写 `默认值`、`隐藏标签`、`占位文本`。
- `longText`：多行文本；需要 `标签`，可写 `默认值`、`行数`（2–20）、`隐藏标签`、`占位文本`。
- `checkboxResource`：离散勾选项；需要 `标签` 和非空 `选项`，每项含唯一 `ID`、`标签`，`默认选中` 默认 false；相同 `分组` 可让多个独立 checkbox 共用一份说明文字。
- `countableResource`：当前值/上下限；需要 `标签`，支持整数 `最小值`、`最大值`、`默认值`、正整数 `步长`、`最大值可改`。可选 `显示方式: "标记"`，并用两个不同的单一 Unicode 字素 `当前值标记` / `剩余值标记`（常用 emoji）显示当前值与剩余容量；此时最小值不得为负。
- `readOnlyDisplay`：只读文本或 Asset；需要 `标签`，`内容` 与 `资源ID` 至少一个，可写 `替代文本`。
- `imageField`：Player 上传头像/立绘；需要 `标签`，可写 `替代文本`。
- `resourcePicker`：打开 Resource Library Browser 并发出临时选择事件；不保存选择本身。
- `cardTable`：显示和操作由 Resource Library 定义的 Cards。

普通 Sheet Value 默认按文本保存，不要因为看起来像数字就假设 Validator 会做数值校验。模块完整字段见[Sheet Module Reference](../reference/sheet-modules.md)。

`标签` 字段仍然必填，但可以写成空字符串来隐藏视觉标题，效果等同于 `隐藏标签: true`。隐藏时输入框依次使用非空 `标签`、`占位文本`、Module `ID` 作为无障碍名称。`占位文本` 只在空输入框中提示 Player，不是默认值，也不会进入 Character Data。

freeText/longText value 支持[Restricted Markdown](../reference/restricted-markdown.md)。空或聚焦字段显示原始文本，非空失焦字段显示渲染结果；Character Data 始终保存原字符串。freeText 仍是单行，长列表应放 longText。标签、placeholder 与无障碍名称不解析 Markdown。

`imageField` 的图片区域本身就是上传/替换入口，支持点击和键盘操作；已有图片可通过右上角移除按钮清除，不需要 Author 另放上传按钮。

Countable Resource 的标记展示仍保存 `{current,max}`，也继续接受 `fillCountable`。普通点击 `-` / `+` 修改当前值；仅当有限上限且 `最大值可改: true` 时，右键或触屏长按修改上限。无上限只显示当前值 emoji。标记区保持固定高度，自动换行并缩到最低 5px，极端数量改为内部横向滚动，不会撑高页面布局。完整约束与稳定 parts 见 Reference。
