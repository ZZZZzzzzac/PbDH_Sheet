# Sheet Modules

Sheet Module 是框架提供的交互或展示部件。共同字段是唯一 `ID`、`类型` 和可选 `默认隐藏`（默认 `false`）。布局只放 `<pb-module>`，不能自己写表单控件。

当前类型：

- `freeText`：单行文本；需要 `标签`，可写 `默认值`、`隐藏标签`、`占位文本`。声明非空、无重复的字符串`选项`列表后改用单选下拉框；其默认值必须属于选项。
- `longText`：多行文本；需要 `标签`，可写 `默认值`、`行数`（2–20）、`隐藏标签`、`占位文本`。
- `checkboxResource`：离散勾选项；需要 `标签` 和非空 `选项`，每项含唯一 `ID`、`标签`，`默认选中` 默认 false；相同 `分组` 可让多个独立 checkbox 共用一份说明文字。
- `countableResource`：当前值/上下限；需要 `标签`，支持整数 `最小值`、`最大值`、`默认值`、正整数 `步长`、`最大值可改`。可选 `显示方式: "标记"`；`当前值标记` / `剩余值标记`各使用对象声明为单个 Unicode/emoji 文字或 `assets/**`图片，两侧可混用且必须不同，此时最小值不得为负。`标记尺寸`控制文字字号或图片正方形单元格，`加减号字号`控制 `-` / `+`，均为 5–96 CSS px。
- `readOnlyDisplay`：只读文本或图片；需要 `标签`，`内容` 与 `资源路径` 至少一个，可写 `替代文本`。
- `imageField`：Player 上传头像/立绘；需要 `标签`，可写 `替代文本`。
- `resourcePicker`：`资源库` 使用非空链接数组或字面值 `"其他"`。普通 Picker 可链接多个 Library；Browser 用左上角下拉切换表，每个链接独立定义 `字段模板` 与 `默认查询`。Other Picker 自动显示 Extension 新建且未被普通 Picker 或 Composer 使用的独立 Library；合并到既有库的资源仍由原 Picker/Composer 接收。两者都只发出临时选择事件，不保存选择本身；Other Picker 若创建 Card，目标 Card Table 用 `otherResourceLibraries` 动态来源接收，无需枚举扩展库 ID。
- `resourceComposer`：每个 `来源槽位` 可声明 `字段模板`，用来隐藏或重命名该槽 Resource Browser 的字段；`原名` 默认属于 Author-only 字段，不向 Player 展示。需要区分同一 Entry 的重复选择与不同 Entry 的组合时，可声明通用的 `选择关系输出`；例如把结果接到 Card Table 的 `显示方式字段`，让同源组合显示图片、异源组合显示文字。框架不会把这种关系解释成某个游戏的“混血”等规则。
- `cardTable`：显示和操作由 Resource Library 定义的 Cards。

普通 Sheet Value 默认按文本保存，不要因为看起来像数字就假设 Validator 会做数值校验。模块完整字段见[Sheet Module Reference](../reference/sheet-modules.md)。

`标签` 字段仍然必填，但可以写成空字符串来隐藏视觉标题，效果等同于 `隐藏标签: true`。隐藏时输入框或下拉框依次使用非空 `标签`、`占位文本`、Module `ID` 作为无障碍名称。`占位文本`只在空输入框或下拉空提示中提醒 Player，不是默认值，也不会进入 Character Data。

自由输入 freeText 与 longText value 支持[Restricted Markdown](../reference/restricted-markdown.md)。空或聚焦字段显示原始文本，非空失焦字段显示渲染结果；Character Data 始终保存原字符串。下拉 Free Text 的选项按纯文本显示，但选择结果仍保存为同一种字符串。freeText 仍是单行，长列表应放 longText。标签、placeholder 与无障碍名称不解析 Markdown。

`imageField` 的图片区域本身就是上传/替换入口，支持点击和键盘操作；已有图片可通过右上角移除按钮清除，不需要 Author 另放上传按钮。

Countable Resource 的标记展示仍保存 `{current,max}`，也继续接受 `fillCountable`。普通点击 `-` / `+` 修改当前值；仅当有限上限且 `最大值可改: true` 时，右键或触屏长按修改上限。无上限只显示当前值标记。图片沿用包内 PNG、JPEG、WebP、GIF、AVIF、SVG Asset，保持宽高比并完整放入标记格；不支持 `.ico`、外链或 base64。标记区以配置的`标记尺寸`为自然尺寸，保持固定高度，自动换行并缩到最低 5px，极端数量改为内部横向滚动，不会撑高页面布局。省略尺寸字段时保留框架/Skin/Page CSS 默认值。完整约束与稳定 parts 见 Reference。
