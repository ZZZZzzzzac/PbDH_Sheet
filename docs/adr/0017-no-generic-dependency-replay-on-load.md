# ADR-0017: 不在加载时通用重放依赖事件

状态：Accepted
日期：2026-07-15

## 背景

Resource Picker 的 `resourceSelected` 是临时事件，Character Data 默认只保存 Dependency Engine 最终写入的 Sheet Values，不保存选择来源。依赖产生的默认筛选、可见性和只读展示属于内存派生状态，因此刷新页面或切换 Character Save 后会被清空；例如选择职业后产生的领域卡默认筛选不会自动恢复。

通用重放全部依赖事件并不安全：`fillText` 可能覆盖 Player 后续修改，追加写入可能重复内容，`fillCountable` 可能覆盖当前状态，Card 创建可能生成重复实例。要安全重建，还需要持久化 Resource Picker 选择来源、迁移 Character Data，并区分可幂等重建的派生动作与一次性写入动作。

## 决策

第一版不在加载 System Package、刷新页面或切换 Character Save 时通用重放 Dependency Events，也不为此持久化 Resource Picker 选择来源或 Dependency Engine 派生状态。

刷新后丢失的默认筛选属于可接受的便利性损失；Player 可重新选择来源资源或手动筛选。规则合法性由 Validation Checks 兜底，不依赖默认筛选保证。

## 理由

- 保持 ADR-0004 已确定的临时 `resourceSelected` 边界，不让 Character Data 隐式保存 UI 交互来源。
- 避免重放非幂等动作造成数据覆盖、重复追加或重复 Card Instance。
- 该问题只降低刷新后的操作便利性，不破坏已保存的角色数据，当前收益不足以承担 schema、迁移和执行语义复杂度。

## 代价

- 刷新页面或切换 Character Save 后，依赖产生的 Resource Picker 默认筛选不会自动恢复。
- 其他仅存在于内存的依赖派生状态也需要重新触发来源交互才能恢复。

## 后续信号

出现以下信号时重新评估：

- 多个 System Package 频繁依赖加载后恢复默认筛选、可见性或只读展示。
- Player 经常因刷新后派生状态丢失而选错资源或无法继续流程。
- Character Data 引入可选的 Resource Selection Provenance。
- Dependency Actions 能明确分为可幂等重建的纯派生动作与不可重放的一次性写入动作；届时只重建前者，不无差别重放事件。

## 追加说明（2026-07-15）

后续信号已经出现：领域卡默认筛选需要在刷新后恢复，德鲁伊专属参考页的可见性也必须随 Character Save 恢复。后者影响功能可达性，不再只是便利性损失。

因此补充以下决策，同时保留“不通用重放事件”的核心边界：

- Character Data 保存最小 **Derived Source Snapshot**：仅为参与纯派生动作的 Resource Picker 记录 Resource Library ID 与有序 Entry ID。
- Resource Composer 不重复保存来源槽位；重建时使用 Character Data 中现有的 Composite Resource。
- 加载、导入或切换 Character Save 后，Dependency Engine 从默认派生状态重新计算纯派生动作。
- `setVisibility`、`setResourceDefaultFilter`、写入 `readOnlyDisplay` 的 `fillText` 是纯派生动作，由框架按动作合同自动识别。
- 写入 freeText/longText、追加文本、`fillCountable`、Card 创建和其他 Player 数据副作用仍不得重放。
- 不持久化最终 visibility、默认查询或只读展示内容；System Package 更新后始终按当前资源与规则重新计算。
- 旧 Character Data 没有快照时继续加载，不从可编辑文本猜测来源。失效引用产生 warning，并跳过对应派生结果。

这不是 Resource Picker 持久值。快照只用于恢复 Dependency Logic 的纯展示结果，不能被模块当作 Player 当前选项或 Sheet Value 使用。
