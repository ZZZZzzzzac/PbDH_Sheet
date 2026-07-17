# Character Creation Guide interface

Root：`{ 步骤: GuideStep[] }`，至少一项。

GuideStep：

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `ID` | string | 是 | 非空、Guide 内唯一 |
| `标题` | string | 是 | 非空纯文本 |
| `说明` | string | 是 | 非空 Restricted Markdown |
| `目标` | GuideTarget | 否 | 至多一个 |

GuideTarget：`{类型:"page", 页面ID:string}`、`{类型:"module", 模块ID:string}` 或 `{类型:"region", 区域ID:string}`，引用必须存在。

Layout Region 由 HTML Layout Template 中 package-wide unique 的 `data-guide-region-id` 声明。Region target 高亮该容器的单个矩形边界，容器内的 Sheet Modules 保持可交互。Region 不是 Sheet Module，不存 Character Data；不支持多个 region/module target、任意 CSS selector 或非连续区域。

```html
<section data-guide-region-id="basic-info">
  <pb-module id="character-name"></pb-module>
  <pb-module id="ancestry"></pb-module>
</section>
```

```json
{ "ID": "basic-info", "标题": "基本资料", "说明": "填写基本资料。", "目标": { "类型": "region", "区域ID": "basic-info" } }
```

Guide Session 只保存当前打开会话的 zero-based step index。Spotlight 通过 Renderer 的稳定 target markers 获取几何和可见性。目标不可见时不覆盖 Dependency visibility。

Module、Page 或 Layout Region target 属于另一 Runtime-Visible Page 时，Guide 先选择该 Current Page，再滚动并高亮目标。上一步/下一步都按当前 Step 重新解析所属页；完成或退出 Guide 后保留最后选择的 Current Page。

`说明` 使用与 Sheet Value/Card 相同的 Restricted Markdown；支持范围见 [Restricted Markdown](restricted-markdown.md)。`标题`、按钮、进度与不可用提示仍是纯文本。说明面板在视口边界内按内容调整尺寸；Guide actions 使用独立定位，不会被长说明推到内容末尾。

禁止字段/语义：完成条件、分支、自动推进、action requests、脚本、Character Data 读取或持久进度。旧 ADR-0013 已由 ADR-0015 取代。
