# Character Creation Guide

Guide 是 Author 编写的线性聚光灯说明。manifest 的 `characterCreationGuide` 指向 JSON：

```json
{
  "步骤": [
    { "ID": "name", "标题": "填写角色名", "说明": "输入角色的名字。", "目标": { "类型": "module", "模块ID": "character-name" } },
    { "ID": "identity", "标题": "填写身份资料", "说明": "填写这一组资料。", "目标": { "类型": "region", "区域ID": "identity" } },
    { "ID": "finish", "标题": "完成", "说明": "检查所有内容。" }
  ]
}
```

每步需要唯一 `ID`、非空纯文本 `标题` 和 Restricted Markdown `说明`，最多一个 `目标`。目标可以是 Page、Sheet Module、Layout Region，也可以省略。Guide 只维护当前打开会话中的 step index，不保存进度。

Layout Region 用于一次高亮连续布局中的多个模块。在 Page 或 Shell HTML 中给外层安全静态容器声明 package-wide unique ID：

```html
<section data-guide-region-id="identity">
  <pb-module id="character-name"></pb-module>
  <pb-module id="ancestry"></pb-module>
</section>
```

Region 仍是一个矩形目标，不支持模块数组、多个同时高亮区域或任意 CSS selector。

Guide 不读取 Character Data，不自动推进，不触发 Resource Picker，不执行 Dependency，不运行检查，也不修改字段。被 Dependency 隐藏的目标保持隐藏，Guide 会提示目标不可用。Player 仍可正常操作高亮的模块。

目标位于另一张 Runtime-Visible Page 时，Guide 自动切换 Current Page；退出后保留最后显示的页面。长说明在视口范围内滚动，Guide actions 独立定位，不会被说明挤走。

旧版 Guide 的完成条件、动作请求和分支不属于当前契约。
