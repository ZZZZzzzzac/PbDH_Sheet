# ADR-0004: Dependency Engine Boundary

状态：Accepted
日期：2026-07-06

## 背景

PbDH Sheet Tool 需要大量跨模块联动：Resource Picker 选择系统资源、筛选其他资源库选项、显示或隐藏模块、根据资源条目字段自动填充文本。依赖逻辑是第一版最复杂的核心部件。

## 决策

Dependency Engine 是独立核心模块：

- 依赖逻辑不放进单个 Sheet Module 内部。
- Sheet Module 只负责显示当前值、接收玩家输入、发出 action。
- Sheet Module 不直接调用 Dependency Engine。
- Zustand store action 是 Dependency Engine 的调用入口。
- Dependency Engine 读取 Character Data、Resource Libraries 和 dependency rules。
- Dependency Engine 输出 derived view state、view effects 和有限 data patches。
- Dependency Engine 尽量实现为纯函数：同一输入得到同一输出，不读写外部状态，不直接修改 store、IndexedDB 或 UI。
- 只有 Dependency Engine 可以执行跨模块写入；模块之间不能互相改状态。
- 自动填充是依赖逻辑中唯一允许写 Character Data 的动作。
- 依赖条件允许读取 Resource Library 条目字段。
- 依赖条件只读取角色卡相关数据：Character Data、Resource Libraries、Card Instance State 和 System Package metadata；不读取 DOM、UI 临时状态或 Validation Script 结果。
- 依赖动作分为三类：
  - `view effect`：显示/隐藏页面或模块、高亮模块等影响模块可见性的效果。
  - `data patch`：自动填充字段、设置勾选值、清空字段等有限 Character Data 修改。
  - `option effect`：筛选、包含或排除资源库选项。
- `fillText` 动作按目标模块类型分流：写入 freeText/longText 产 data patch（修改 Character Data）；写入 readOnlyDisplay 只更新内存中的派生展示内容，不写 Character Data，也不算 view effect（它不改变模块可见性），是 ReadOnlyDisplay 专属的派生展示状态更新。
- 每条 dependency rule 应声明 `sources` 和 `targets`，用于校验、冲突检测和未来性能优化。
- 依赖冲突是 System Package 错误，由 Validator 或运行时依赖检查报 error，Author 负责修复。
- MVP 不支持链式触发。规则基于当前已提交 Character Data 单轮计算，产生 patch 后提交，不继续用本轮结果触发下一轮。
- Card 实例创建也通过 Dependency Engine 统一管道：`resourceSelected` 事件触发 `evaluateDependencies`，Engine 检测 source 模块的 `创建卡牌` 配置后，在 `cardCreationInstructions` 中返回创建指令，由 Store 的 `applyDependencyResult` 统一执行。Card 创建不再是 Dependency Engine 之外的独立写通道。

## 理由

- 独立依赖引擎能避免模块互相耦合。
- 纯函数引擎便于 Author 和开发者用样例数据测试依赖规则，也便于 AI 辅助生成和修复规则。
- 由 Zustand action 调用引擎，能让用户输入、依赖计算、patch 提交和自动保存形成可追踪的数据流。
- 单轮计算降低循环、顺序和冲突复杂度。
- 通过 action/patch 边界，未来可扩展链式触发、循环检测和最大深度。
- 资源库字段条件是 PbDH 资源筛选的核心需求。
- `view effect` 和 `data patch` 分离后，页面显示、模块特效和真实角色数据修改不会混在一起。
- `sources` 和 `targets` 允许 MVP 先全量遍历规则，未来按 source 建索引优化，不改变 System Package 契约。

## 代价

- MVP 无法表达“自动填充值再触发下一条规则”的链式逻辑。
- 需要维护引擎输入/输出数据结构，避免把 store 或 UI 细节泄漏进纯函数。
- 需要 Validator 识别明显依赖冲突和 MVP 不支持的链式依赖。
- 自动填充覆盖策略等细节仍需在实现阶段细化。
- 动作类型、合并优先级和默认行为需要形成 engine policy；新增破坏性动作时需要升级 package schema version。

## 后续信号

出现以下信号时，升级为多轮依赖计算：

- 多个 System Package 真实需要两步以上依赖链。
- Author 经常用重复规则绕过单轮限制。
- Validation Script 频繁被滥用于 UI 依赖提示。

## 追加说明（2026-07-08）

Resource Library 选择不再建模为可见的 `selectionText` Sheet Module。资源选择是一次交互事件：`resourcePicker` 负责打开 Resource Library Browser 并发出临时 `resourceSelected` 事件，Dependency Engine 根据 Author 声明的 dependency rules 生成 data patches，例如把选中条目的字段填入 `freeText` 或 `longText` 模块。

默认情况下，`resourceSelected` 事件不写入 Character Data，也不保存隐藏的资源引用。Character Data 只保存 Dependency Engine 最终写入的 Sheet Values。这样资源选择更接近“帮玩家抄表”的操作，而不是角色数据本身。

## 追加说明（2026-07-18）：Countable 触发与受限整数计算

真实 System Package 已出现“一个 Countable 的 current 改变另一个 Countable 的 max”的需求，因此 Dependency Engine 接受 `countableChanged` 事件。Countable Module 仍只提交自身状态；跨模块写入继续由 Store 调用 Dependency Engine 完成，不把依赖逻辑放入 Module。

`fillCountable` 可使用受限 `integerCalculation`：从整数初值出发，按顺序加减整数常量、Countable current 或持久 Resource Selection 数量，并可声明结果上下界。该能力不开放任意表达式、脚本、DOM 或 Validation 结果读取，仍符合纯函数和有限 data patch 边界。

当计算引用 Resource Selection 数量时，框架保存对应 Picker 的最小 Derived Source Snapshot。它只提供稳定引用与数量，不把 Resource Picker 变成普通 Sheet Value；计算结果作为 Countable State 正常持久化，加载时不重放 `fillCountable`。
