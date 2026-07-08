# Dependency Engine PRD 讨论记录

日期：2026-07-08  
状态：讨论已收敛，已创建 PRD 与实现 issues  
范围：本文只记录本次对话中围绕阶段 6 Dependency Engine / Dependency Logic PRD 的设计讨论，不替代 ADR。

## 产物

- PRD issue：[ZZZZzzzzac/PbDH_Sheet#40](https://github.com/ZZZZzzzzac/PbDH_Sheet/issues/40)
- 实现 issue：
  - [#41 Implement resourceSelected fillText Dependency Logic v1](https://github.com/ZZZZzzzzac/PbDH_Sheet/issues/41)
  - [#42 Implement Dependency Logic visibility effects for pages and modules](https://github.com/ZZZZzzzzac/PbDH_Sheet/issues/42)
  - [#43 Implement Resource Picker default filter effects in Dependency Logic](https://github.com/ZZZZzzzzac/PbDH_Sheet/issues/43)
  - [#44 Implement checkboxResource triggers for Dependency Logic v1](https://github.com/ZZZZzzzzac/PbDH_Sheet/issues/44)

## 核心结论

Dependency Engine v1 是事件驱动的便利联动，不是完整规则自动化，也不做合法性强制。

- Author-facing 概念叫 **Dependency Logic**。
- Base Framework 执行组件叫 **Dependency Engine**。
- `selectionText` 不再作为核心模块；资源选择由 `resourcePicker` 触发。
- `resourcePicker` 发出瞬时 `resourceSelected` 事件。
- `checkboxResource` 变更也可作为 v1 输入源。
- `countableResource` / counter 不作为 v1 输入源。
- 手动编辑 `freeText` / `longText` 通常不触发 Dependency Engine。
- Resource Library 的默认筛选是推荐/便利，不是强制限制；Player 可以取消或修改。
- 游戏合法性不由 Dependency Engine 强制，后续由 Validation Checks 报告。

## 事件与持久化边界

`resourceSelected` 是一次性事件：

1. Player 在 Resource Picker 里选择资源。
2. 运行时产生 `resourceSelected` 事件。
3. Dependency Engine 按 Author 声明执行动作。
4. 事件结束后消失。
5. Character Data 只保存最终写入的 Sheet Values。

不保存的内容：

- 不保存 `resourceSelected` 事件本身。
- 不保存隐藏的“选中资源引用”。
- 不在 Character Data 里复制完整 Resource Library。
- 不把 System Package 图片资源写入 Character Data。

会保存的内容：

- `fillText` 写入 `freeText` / `longText` 后产生的文本值。
- Player 手动上传头像/立绘等玩家图片数据。

运行时派生状态：

- 页面/模块显隐是运行时 view state。
- Resource Picker 默认筛选覆盖是运行时 option state。
- `readOnlyDisplay` 被 `fillText` 写入时是运行时显示内容，不写 Character Data。

## 初始化、刷新与导入

v1 不重放旧事件。

讨论中曾考虑 `initOrDataChanged` / 状态规则，用当前 Character Data 恢复页面显隐或默认筛选。最终决定先不做：

- 刷新/导入后，只加载 Character Data 和 System Package 默认状态。
- 如果 Player 手动关掉德鲁伊页面，Engine 不会在刷新或数据变化时自动抢回来。
- 想重新显示，就再次选择对应资源。
- 这符合“框架只推荐/方便，不强制玩家行为”的原则。

## 触发源

v1 支持：

- `resourceSelected`：来自 `resourcePicker`。
- checkbox 事件：来自 `checkboxResource` 选项变更。

v1 不支持：

- `countableResource` / counter。
- 手动 `freeText` / `longText` 输入。
- Resource Library 浏览器里的筛选、排序、hover、dialog open 等 UI 临时状态。
- Card Instance 变更，后续再做。

## sources / targets

规则中 `sources` / `targets` 由 Author 显式写。

原因：

- Author 和协作 AI 能直接看出规则读谁、写谁。
- 未来 Validator 可检查一致性。
- 未来可做冲突检测和 source 索引优化。

Loader/Validator 后续可以从 `触发 / 条件 / 动作` 反查校验，但不替 Author 隐藏推导。

示例：

```json
{
  "ID": "choose-druid-class",
  "sources": [
    { "类型": "resourcePicker", "模块ID": "pick-class" }
  ],
  "targets": [
    { "类型": "module", "模块ID": "class-name" },
    { "类型": "page", "页面ID": "druid-shape-page" },
    { "类型": "module", "模块ID": "pick-subclass" }
  ],
  "触发": {
    "类型": "resourceSelected",
    "来源模块ID": "pick-class"
  },
  "条件": {
    "类型": "selectedResourceFieldEquals",
    "字段": "名称",
    "值": "德鲁伊"
  },
  "动作": [
    {
      "类型": "fillText",
      "目标模块ID": "class-name",
      "内容": { "类型": "selectedResourceField", "字段": "名称" }
    },
    {
      "类型": "setVisibility",
      "目标类型": "page",
      "目标ID": "druid-shape-page",
      "显示": true
    },
    {
      "类型": "setResourceDefaultFilter",
      "目标模块ID": "pick-subclass",
      "字段": "主职",
      "值": ["德鲁伊"]
    }
  ]
}
```

## 执行模型

v1 规则按声明顺序执行一次。

- 一次事件可以匹配多条规则。
- 一条规则可以包含多个动作。
- 推荐用“同一触发下多个动作”表达常见链路。
- 不推荐设计成“选择职业 -> 填字段 -> 再触发字段变化 -> 再显示页面”的下游事件链。
- 不做多轮链式触发、拓扑排序、循环检测或稳定收敛。

冲突策略：

- 同一次 Engine 运行中，如果多条生效规则写同一目标，后面的规则生效。
- 运行时用 `console.warn` 报警。
- Validator 暂不处理冲突。

## 条件

Resource Picker 条件 v1：

```json
{ "类型": "always" }
{ "类型": "selectedResourceFieldEquals", "字段": "名称", "值": "德鲁伊" }
{ "类型": "selectedResourceFieldIn", "字段": "名称", "值": ["德鲁伊", "游侠"] }
{ "类型": "selectedResourceFieldNotEquals", "字段": "名称", "值": "德鲁伊" }
```

checkbox 条件 v1：

- 支持检查某个 checkbox 选项是否 checked。
- 支持检查某个 checkbox 选项是否 unchecked。
- 不做复杂 AND/OR 条件树。

## 动作

v1 动作集合：

```json
[
  {
    "类型": "fillText",
    "目标模块ID": "class-name",
    "内容": { "类型": "selectedResourceField", "字段": "名称" }
  },
  {
    "类型": "fillText",
    "目标模块ID": "note",
    "内容": "固定文本"
  },
  {
    "类型": "setVisibility",
    "目标类型": "page",
    "目标ID": "druid-shape-page",
    "显示": true
  },
  {
    "类型": "setVisibility",
    "目标类型": "module",
    "目标ID": "druid-shape-note",
    "显示": true
  },
  {
    "类型": "setResourceDefaultFilter",
    "目标模块ID": "pick-subclass",
    "字段": "主职",
    "值": ["德鲁伊"]
  }
]
```

### fillText

`fillText` 概念上只有两个核心参数：

- 目标模块 ID。
- 要填入的具体内容。

内容可以来自：

- 选中资源字段。
- 固定文本。

目标语义：

- 目标是 `freeText` / `longText`：写入 Character Data，Player 后续可手动修改；下一次触发会再次覆盖。
- 目标是 `readOnlyDisplay`：写入运行时派生显示内容，不写 Character Data，Player 不可编辑。
- 其他目标类型：v1 不支持。

### setVisibility

用于显示/隐藏页面或模块。

- 模块和页面默认显示。
- Author 需要特别声明隐藏才会隐藏。
- Dependency Engine 之后可以显示或隐藏。
- 隐藏不会删除 Character Data。
- Player 手动关闭后的恢复不由 v1 状态规则保姆式处理。

### setResourceDefaultFilter

用于改变 Resource Picker 打开 Resource Library Browser 时的默认筛选。

语义是默认筛选，不是强制筛选：

- Player 打开后能看到推荐筛选已选中。
- Player 可以取消筛选。
- Player 可以选择其他资源。
- 框架只提供便利，不限制玩家能做什么。

## 与 Character Data 的关系

Character Data 保存 Player 拥有的数据，不保存 System Package 的资源副本。

- 纯文本可以存 Character Data。
- 系统包图片只存资源引用/路径，不复制二进制。
- 玩家头像/立绘是 Player 数据，可以随 Character Data 保存。
- 自动填充后的文本是普通 Sheet Value。
- Resource Picker 的选中引用默认不保存。

## Out of Scope

v1 不做：

- `selectionText` 模块复活。
- `countableResource` / counter 触发。
- 手动自由文本输入触发 Dependency Logic。
- 初始化/导入时重放旧事件。
- 多轮链式依赖。
- 复杂 AND/OR 条件树。
- 强制筛选或规则合法性封锁。
- 自动创建卡牌。
- Card Engine 联动。
- Character Creation Guide 联动。
- 完整 Validator 冲突检查。
- Resource Library 编辑器。

## 原始讨论要点摘录

以下为本次对话的设计收敛记录，按讨论顺序整理。

1. 阶段 6 开始规划 Dependency Engine PRD，并以 `$grill-with-docs` 对照现有文档和 ADR。
2. 明确 `Dependency Logic` 是 Author-facing 规则，`Dependency Engine` 是 Base Framework 执行组件。
3. 明确 `selectionText` 已不适合作为核心模块；核心是 Resource Library + Resource Picker + dependency actions。
4. 明确 Resource Picker 选择后产生 `resourceSelected` 临时事件。
5. 明确自由文本输入正常不触发 Dependency Engine，因为无法判断 Player 输入意图。
6. 明确自动填充 v1 使用 always overwrite，不做 managed/ownership 状态。
7. 明确如果 Author 希望 Player 可改，目标应是 `freeText` / `longText`；如果不希望 Player 改，目标应是 `readOnlyDisplay`。
8. 明确 v1 主要做显示/隐藏模块和页面、自动填充、Resource Picker 默认筛选。
9. 明确 Resource Picker 默认筛选不是强制筛选，Player 可以取消。
10. 明确模块和页面默认显示，Author 需要显式声明隐藏才隐藏。
11. 明确 `fillText` 动作不需要复杂语义，核心是目标模块 ID 和填充内容。
12. 明确 `sources` / `targets` 由 Author 显式声明。
13. 明确冲突时运行时后写覆盖，并 `console.warn`，Validator 暂不管。
14. 明确事件是无状态的，填充后事件消失。
15. 明确不做刷新/导入后的事件重放或状态规则恢复。
16. 明确推荐用同一个触发下的多个动作，而不是下游事件链。
17. 明确支持 checkbox 触发，不支持 counter。
18. 最后按以上结论创建 PRD #40 和实现 issues #41-#44，并 triage 到 `ready-for-agent`。
