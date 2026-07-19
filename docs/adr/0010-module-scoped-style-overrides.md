# ADR-0010: Module Scoped Style Overrides

状态：Accepted
日期：2026-07-06

## 背景

Author 需要调整单个 Sheet Module 的显示形态。例如某个自由文本模块默认显示为“姓名: [输入框]”，Author 可能希望改成“[输入框] 特工ID”，并单独调整该模块的字体、颜色和布局。样式自由度不足会限制 System Package 表达；全局 CSS 又会破坏其他模块和 Base Framework 操作界面。

## 决策

第一版不新增模块专属 CSS 文件、Module schema 样式字段或第二套样式 Loader。模块实例样式写在所属页面 HTML Layout Template 的 `layout.css` 中，并使用框架公开的稳定选择面：

- `[data-module-id="..."]` 是模块实例边界。Author 用它精确指定一个模块，例如只修改 `charname` 而不影响同为 `freeText` 的 `main-class`。
- `[data-module-type="..."]` 是模块类型选择面，用于同类型模块的页面级默认样式；实例 ID 规则可以覆盖它。
- `[data-part="..."]` 是模块内部稳定部件接口，例如 `container`、`label`、`input`、`button`、`value`。具体 parts 由 Author 文档逐种模块列出。
- 普通实现 class 和内部 DOM 层级不是 Author-facing 兼容契约。
- Sheet Renderer 继续把整个 `layout.css` scope 到当前 page；Author 不需要重复写 page selector，且 CSS 不能影响 App Shell 或其他页面。
- Author 编写实例规则时负责以 `[data-module-id="..."]` 限定目标。框架不再把另一份模块 CSS 自动重写到 module ID，因为页面 CSS 已提供同一能力，再增加 schema/Loader 会形成重复接口。
- 禁止外部 `@import`；`url()` 资源只允许引用 System Package 内 asset。
- Shadow DOM 仍只作为未来需要更强隔离时的备选。

## 理由

- HTML Layout Template CSS 已经是 Author 调整页面布局与视觉的唯一入口；复用它比新增模块样式字段更简单。
- `data-module-id` 能直接满足实例隔离，`data-module-type` 能表达类型默认值，`data-part` 能稳定定位模块内部部件。
- 一个页面只维护一个 CSS 来源，更适合 Author 和 AI 生成、排查及 Preview 刷新。
- page scoping 隔离 App Shell 和其他页面；显式 module ID selector 隔离同页模块实例。
- 属性选择器比依赖 React DOM 层级或内部 class 更稳定，也便于打印样式和浏览器调试工具检查。

## 代价

- Author 忘记写 `data-module-id` 时，规则可能影响当前页面内多个模块；文档、示例、Validator warning 和 Author Preview 负责降低该风险。
- 每种 Sheet Module 必须维护并测试稳定 `data-part` 契约。
- 新增或重构模块内部 DOM 时，不能无意破坏已公开 parts。
- 若未来需要更强隔离，可能迁移到 Shadow DOM。

## 后续信号

出现以下信号时，升级样式隔离：

- page-scoped CSS 仍频繁误伤同页其他模块，且文档与 warning 无法降低问题。
- Print Mode 中模块样式互相影响。
- Author 需要当前 `data-part` 无法表达的 slot/part 机制。
- 移动端布局因自定义 CSS 频繁破坏。

## 2026-07-19 修订：Countable Resource 语义字号

`countableResource` 新增两个范围受限的语义化配置：`标识字号`控制数值或 Marker glyph，`加减号字号`控制框架步进按钮中的字形。它们是 Countable Resource 固有展示语义的一部分，用于让 Author 在切换 Numeric/Marker Presentation 时保持同一配置，并不开放任意样式对象、按钮几何或通用 Module CSS 字段。其余实例样式仍通过本 ADR 定义的 Page/Skin scoped CSS 与稳定 parts 完成。
