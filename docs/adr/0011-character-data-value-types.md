# ADR-0011: Character Data Value Types

状态：Accepted  
日期：2026-07-07

## 背景

PRD 和 CONTEXT 把 Sheet Value 定义为“默认字符串，如同线下纸笔每个格子里写的是字符”，基础框架不理解“等级”“费用”“伤害”的游戏语义。第一版 Character Data 的 `values` 曾因此被定为 `Record<string, string>`，所有模块状态都 stringify 成字符串存储。

阶段 5 加入 checkboxResource 和 countableResource 后，勾选状态 `{ wounded: false, ... }` 和 `{ current: 3, max: 6 }` 被强行 `JSON.stringify` 成字符串。导出的 Character JSON 里出现 `"conditions": "{\"wounded\":false,...}"` 这种双重编码，既难读也违背“结构化状态应结构化存储”的常识。

## 决策

Character Data 的 `values` 值类型是分层联合 `SheetValue`：

- 标量 Sheet Value 用 `string`。姓名、等级、伤害、背景等玩家填写的格子里写什么就是什么，`"3"` 和 `"X"` 都合法。基础框架不解释其游戏语义。
- 模块自身的结构化运行时状态用对象，不 stringify：
  - checkboxResource 勾选状态：`Record<string, boolean>`
  - countableResource 当前值与上限：`{ current: number; max: number | null }`
- `SheetValue = string | CheckboxState | CountableState`。
- 读取侧（`readModuleState`）兼容旧的字符串化数据：遇到 string 时尝试 `JSON.parse`，保证阶段 5 早期导出的 Character JSON 仍可导入。

## 理由

- 标量用 string 保留纸笔灵活度，不强迫作者把“等级X”这类非标准表述转成数字。
- 结构化状态用对象，导出 JSON 可读、不双重编码，模块读写无需反复 stringify/parse。
- 联合类型让 schema 仍可校验：导入时 zod 按 union 校验，非法形状会被拒。
- 兼容旧字符串数据避免阶段 5 内部数据格式微调破坏已有导出。

## 代价

- `values` 不再是纯 string map，消费方需按模块类型解释值形状。
- 未来新增结构化模块要扩展 `SheetValue` 联合和 zod schema，不能只加 string。
- 兼容旧字符串数据的 try-parse 路径需在真正废弃旧格式后清理。

## 后续信号

出现以下信号时，重新评估值类型策略：

- 某模块需要更复杂的嵌套状态（如卡牌实例数组），联合类型膨胀难维护。
- 标量字段普遍需要类型化（如都要 int），string 默认不再合适。
- 旧字符串化导出在实际用户中消失，可移除兼容解析。
