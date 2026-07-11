# Character Creation Guide

Guide 是 Author 编写的线性聚光灯说明。manifest 的 `characterCreationGuide` 指向 JSON：

```json
{
  "步骤": [
    { "ID": "name", "标题": "填写角色名", "说明": "输入角色的名字。", "目标": { "类型": "module", "模块ID": "character-name" } },
    { "ID": "finish", "标题": "完成", "说明": "检查所有内容。" }
  ]
}
```

每步需要唯一 `ID`、非空 `标题` 和 `说明`，最多一个 `目标`。目标可以是 Page 或 Sheet Module，也可以省略。Guide 只维护当前打开会话中的 step index，不保存进度。

Guide 不读取 Character Data，不自动推进，不触发 Resource Picker，不执行 Dependency，不运行检查，也不修改字段。被 Dependency 隐藏的目标保持隐藏，Guide 会提示目标不可用。Player 仍可正常操作高亮的模块。

旧版 Guide 的完成条件、动作请求和分支不属于当前契约。
