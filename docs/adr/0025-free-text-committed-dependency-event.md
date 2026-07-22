# ADR-0025: Free Text 失焦提交 Dependency Event

状态：Accepted
日期：2026-07-22

## 背景

部分 System Package 需要用多个 Free Text 值生成 Resource Picker 默认筛选，例如用主领域和次领域共同筛选领域卡。Free Text 在 Player 输入时仍需持续写入 Character Data 并自动保存，但每次按键都重算 Browser 默认筛选会造成无意义的 UI 更新。Resource Library 和 Browser 也不能越过 Dependency Engine 直接读取 Character Data。

## 决策

- `freeText` Sheet Module 的 `onChange` 继续只更新 Character Data 和自动保存。
- Player 离开普通输入框或下拉框时，Store 提交一次 `freeTextChanged` Dependency Event，事件包含来源 Module ID 和最终文本值。
- Dependency Rule 用 `{类型:"freeText", 模块ID}`声明 Free Text 来源。
- `setResourceDefaultFilter` 可用 `{类型:"freeTextValues", 模块IDs:[...]}`读取同一规则中已声明的多个 Free Text 来源。Engine 从当前 Character Data 读取值，去除首尾空白并忽略空值，再为同一字段生成 OR 筛选。
- `freeTextChanged` 第一版只允许执行 `setResourceDefaultFilter`。它不能触发 `fillText`、`fillCountable`、Card 创建或其他 Character Data 写入。
- Free Text 值本身已属于 Character Data，因此加载、导入或切换 Character Save 时可直接重建这类纯筛选，不增加 Derived Source Snapshot。
- Resource Library、Resource Picker 和 Resource Library Browser 只接收 Engine 产生的默认查询，不读取 Free Text 或 Character Data。

## 理由

- 输入保存与跨模块提交分离，既保留自动保存，又避免每次按键重算派生 UI。
- 多来源读取显式列在 Rule sources 和 Action 中，Validator 可检查缺失、类型错误和未声明引用。
- 限制为纯筛选，保证加载时重建不会重放 Player 数据写入。
- 继续遵守 ADR-0004 的 Store 编排和纯 Dependency Engine 边界。

## 代价

- 同一个筛选由多个 Free Text 触发时，需要为每个触发源声明一条规则。
- Player 在输入框仍聚焦时，Browser 默认筛选保留上一次已提交结果。
- 第一版不能用 Free Text 失焦事件驱动其他依赖动作；出现真实需求后再扩展合同。
