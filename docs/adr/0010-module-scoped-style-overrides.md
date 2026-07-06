# ADR-0010: Module Scoped Style Overrides

状态：Accepted
日期：2026-07-06

## 背景

Author 需要调整单个 Sheet Module 的显示形态。例如某个自由文本模块默认显示为“姓名: [输入框]”，Author 可能希望改成“[输入框] 特工ID”，并单独调整该模块的字体、颜色和布局。样式自由度不足会限制 System Package 表达；全局 CSS 又会破坏其他模块和 Base Framework 操作界面。

## 决策

第一版支持模块实例级样式覆盖：

- 样式作用域边界是 `moduleId`，不是模块类型，也不是整页。
- Author 可以为单个 Sheet Module instance 提供 CSS 覆盖。
- Base Framework 为模块内部公开稳定 parts/classes，如 `.container`、`.label`、`.input`、`.button`、`.value`。
- Author CSS 只允许影响目标模块根节点内部。
- Base Framework 对 Author CSS 做 selector scoping，例如把 `.label` 包装到目标 `data-module-id` 下。
- 禁止 Author CSS 影响 app shell、检查/导出/存档按钮、其他模块或全局 `html/body`。
- 禁止外部 `@import`；`url()` 资源只允许引用 System Package 内 asset。
- MVP 优先使用 selector scoped CSS 和固定 wrapper；Shadow DOM 作为后续增强选项。

## 理由

- 实例级样式满足 Author 对单个模块的自由设计需求。
- 稳定 parts/classes 让 Author 文档和示例可维护。
- selector scoping 比 Shadow DOM 更容易和 React、打印样式、调试工具集成。
- 限制作用域能防止一个 System Package 样式破坏整个 Sheet Tool。

## 代价

- CSS 作用域转换需要可靠实现和测试。
- Author 仍可能把单个模块样式写坏，需要 Author Preview 发现。
- 若未来需要更强隔离，可能迁移到 Shadow DOM。
- 每种 Sheet Module 必须维护稳定 part class 契约。

## 后续信号

出现以下信号时，升级样式隔离：

- scoped CSS 仍能污染模块外 UI。
- Print Mode 中模块样式互相影响。
- Author 需要更稳定的 slot/part 机制。
- 移动端布局因自定义 CSS 频繁破坏。
