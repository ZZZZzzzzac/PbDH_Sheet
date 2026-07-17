# ADR-0021: Guide Layout Region Target

状态：Accepted
日期：2026-07-17

## 背景

ADR-0015 将每个 Guide Step 限制为至多一个 page 或 Sheet Module target。Author 实际需要把同一步骤涉及的多个相邻 Sheet Modules 作为一个视觉与交互区域说明。直接支持目标数组会引入非连续几何、多个滚动位置、复杂遮罩和多分支 inert 处理。

## 决策

- GuideTarget 新增 `{类型:"region", 区域ID:string}`。
- Author 在 HTML Layout Template 的安全静态容器上用非空 `data-guide-region-id` 声明 Layout Region；Region ID 在整个 System Package 的 Shell 与 Pages 中唯一。
- Spotlight 将 Layout Region 作为一个矩形目标，复用单目标滚动、遮罩、面板定位、可见性和目标不可用处理。
- Layout Region 子树保持可交互，因此其内部多个 Sheet Modules 可在同一步骤中正常使用。
- Guide Step 仍至多一个 target；不支持目标数组、任意 selector、非连续或非矩形区域。

## 理由

- 一个命名容器直接表达 Author 的布局意图，契约小于多个 DOM target 的组合规则。
- 单矩形保持现有 Spotlight 几何、响应式定位和无障碍边界。
- 专用稳定 ID 可由 Validator 检查引用与重复，避免任意 selector 绑定 Author CSS 或 React DOM。

## 代价

- Author 需要在 HTML Layout Template 中增加外层容器标记。
- 不相邻模块不能在一个步骤中分别打孔高亮；需要调整布局分组或拆成多个 Guide Steps。
- Region 容器矩形内的静态内容也会一并显示并保持可交互语义。

## 后续信号

- 多个 System Package 明确需要非连续目标，且拆分步骤会破坏说明语义。
- 单矩形经常暴露大量不相关内容，需要重新评估 union geometry。
