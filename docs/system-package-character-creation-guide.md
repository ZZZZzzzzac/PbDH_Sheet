# System Package Character Creation Guide 接口

状态：已实现  
适用 schemaVersion：`0.1.0`  
读者：System Package Author，以及协助 Author 写包的 AI

Character Creation Guide 是 Player 主动启动的线性聚光灯导览。它只解释建卡顺序并高亮页面或 Sheet Module，不读取 Character Data，不判断完成度，也不触发 Resource Picker、Dependency Logic、Card Engine 或 Validation Runner。

## manifest 引用

`manifest.json` 可选引用一个 Guide definition：

```json
{
  "characterCreationGuide": "guides/character-creation.json"
}
```

没有该字段时 System Package 仍然合法，Sheet Tool 工具栏不会显示“车卡指引”。每个 System Package 最多一个 Guide。

## Guide definition

Guide 文件包含非空的有序 `步骤` 数组。数组顺序就是播放顺序：

```json
{
  "步骤": [
    {
      "ID": "intro",
      "标题": "开始创建角色",
      "说明": "先填写身份信息，再选择职业。"
    },
    {
      "ID": "choose-class",
      "标题": "选择职业",
      "说明": "打开职业资源库并选择职业。",
      "目标": {
        "类型": "module",
        "模块ID": "pick-class"
      }
    },
    {
      "ID": "class-page",
      "标题": "查看职业页面",
      "说明": "职业选择后可能显示专属页面。",
      "目标": {
        "类型": "page",
        "页面ID": "class-page"
      }
    }
  ]
}
```

## Guide Step 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `ID` | 是 | Guide 内唯一的稳定字符串 ID。 |
| `标题` | 是 | 非空纯文本标题。 |
| `说明` | 是 | 非空纯文本说明；保留换行。 |
| `目标` | 否 | 一个 Sheet Module 目标、一个页面目标，或省略。 |

模块目标格式：

```json
{ "类型": "module", "模块ID": "pick-class" }
```

页面目标格式：

```json
{ "类型": "page", "页面ID": "main" }
```

无目标步骤用于开场白、通用提示或结束语。

## Player 行为

- Player 从包含系统包与检查操作的工具栏菜单主动启动。
- 每次启动都从第一步开始；Guide position 不写入 Character Data、localStorage 或 IndexedDB。
- Player 手动使用上一步、下一步、完成、退出；Escape 随时退出。
- 可见目标自动滚入视口并被高亮。高亮 Sheet Module 保持可交互，其余调暗区域不可交互。
- Resource Library 等由目标打开的框架弹窗显示在 Guide 之上；关闭后仍停留原步骤。
- 静态存在但运行时隐藏的目标不会被强制显示；Guide 显示“当前目标不可见”提示。
- “完成”只关闭导览，不运行检查、不保存、不导出，也不表示角色合法。

## Validator 行为

- manifest 引用文件缺失或 JSON 无法解析：`fatal`。
- `步骤` 为空、必填字段缺失或字段形状错误：`error`。
- Guide Step ID 重复：`error`。
- page/module 目标引用不存在：`error`。
- 目标静态存在但运行时隐藏：合法，不属于导入错误。

## Out of Scope

- 多个 Guides、自动启动和 Guide position 持久化。
- 分支、循环、条件步骤、自定义跳转和自动完成判断。
- Markdown、HTML、图片、链接、自定义 CSS 或 Author-defined Guide UI。
- 任意 CSS selector、多目标、静态 HTML 区域或框架弹窗内部控件。
- resourceSelected、fillText、Card actions、Validation Checks 或任何 Character Data 写入。

## 示例

参考 `public/system-packages/demo-selection/` 的 manifest 与 Guide definition。
