# ADR-0026: Dependency 派生文本占位符

状态：Accepted
日期：2026-07-22

## 背景

部分 System Package 需要根据 Resource 选择改变空文本字段的打印提示，例如选择种族后，把其第一条推荐经历显示为灰色占位符。用 `fillText` 写入会把提示变成 Player 数据，无法区分“尚未填写”与“Player 接受或修改了该值”。Sheet Module 或 Browser 直接读取 Resource/Character Data 又会越过 Dependency Engine 边界。

## 决策

- Dependency Action 增加 `setTextPlaceholder`，目标仅限 `freeText` 或 `longText`。
- Action 内容使用现有 Resource 字段/模板解析合同，只能由 `resourceSelected` 触发。
- 结果写入 Store 的纯派生 `textPlaceholders`，不修改 Character Data 或 Module Author Data。
- Text Module 优先使用派生占位符，缺失时回退 Module 的静态 `占位文本`。
- `setTextPlaceholder` 是可重建纯派生动作。Resource Picker 使用既有 Derived Source Snapshot；加载、导入或切换 Character Save 时重建占位符，不重放数据写入。
- 空字段打印沿用 Base Framework 已有灰色 placeholder 输出；Player 一旦输入普通 Sheet Value，占位符自然不再显示。

## 理由

- 保留“未填写”状态，避免把推荐值伪装成 Player 已确认内容。
- 复用 Store → Dependency Engine → derived state 边界，不让 Text Module 读取资源。
- 复用现有 placeholder 网页和打印行为，不新增特殊输出逻辑。

## 代价

- Store 多维护一项不持久化的派生状态。
- 第一版只从 Resource selection 派生，不允许任意脚本或 Character Data 模板。
