# ADR-0015: Character Creation Guide as a Spotlight Tour

状态：Accepted
日期：2026-07-10

## 背景

ADR-0013 将 Character Creation Guide 设计成可维护完成条件并请求资源选择、自动填充、卡牌操作和最终检查的流程编排器。这与 Dependency Engine、Card Engine、Validation Runner 和 Sheet Module action 的职责重叠，也使 Guide Runner 逐渐接近第二套规则与交互系统。

首版实际需要的是帮助新手理解“先填写什么、再选择什么”的线性说明。Player 可以直接操作现有 Sheet Modules；资源筛选、文本填充、卡牌操作和检查继续由各自既有能力负责。

## 决策

第一版 Character Creation Guide 是纯展示的线性聚光灯导览，并替代 ADR-0013 的动作编排模型。

- 每个 System Package 最多声明一个可选 Guide；Guide 是有序 Guide Steps 列表，不支持分支、循环或自定义跳转。
- 每个 Guide Step 只有稳定 ID、纯文本标题、纯文本说明，以及至多一个 page 或 Sheet Module 目标；无目标步骤用于开场或结束说明。
- Guide 只负责遮罩、滚动、高亮、说明和手动的上一步、下一步、完成、退出；它不读取 Character Data，不判断完成条件，也不自动推进。
- 高亮 Sheet Module 保持可交互。Guide 不观察交互结果，不发出 resourceSelected 事件，不执行 fillText，不请求 Dependency Engine、Card Engine 或 Validation Runner 动作。
- Guide 由 Player 从工具栏菜单主动启动。Guide position 不持久化，每次启动从第一步开始；完成只关闭导览。
- 可见目标会自动滚入视口。运行时隐藏的目标不会被 Guide 强制显示；导览改为显示目标不可见提示并保留手动导航。
- 指引遮罩使非目标内容不可交互；高亮目标、Guide controls 和目标打开的框架弹窗保持可交互，Escape 可退出。
- Guide 的响应式展示、定位、样式和可访问性由 Base Framework 统一控制，Author 不能注入 HTML、Markdown、CSS 或行为。

## 理由

- 纯展示边界消除了 Guide Runner 与 Dependency Engine、Card Engine、Validation Runner 的行为耦合。
- 线性步骤覆盖新手建卡说明，不需要为尚未出现的复杂流程建立分支 DSL。
- 只引用 page/module 稳定 ID，既能可靠高亮，也不会与 Author 的 HTML/CSS 结构绑定。
- 无持久进度、完成条件和动作词表使包契约更小，更容易由 Author、AI 和 Validator 维护。

## 代价

- Guide 不能确认 Player 是否完成当前任务，也不能自动完成资源选择、填充或最终检查。
- Author 必须通过步骤文字提醒前置操作；Player 未完成前置操作时，后续目标可能暂时不可见。
- 多套导览、富文本说明、任意目标选择器和自动启动需要未来另行设计。

## 后续信号

出现以下信号时，重新评估 Guide 能力：

- 多个 System Package 明确需要多套独立导览。
- 纯线性说明无法覆盖常见建卡流程。
- Player 普遍需要跨会话恢复 Guide position。
- Author 对富文本、图片或静态布局区域高亮有重复且明确的需求。
