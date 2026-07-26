# ADR-0023: System Package Skins Own Package-scoped Presentation

状态：Accepted
日期：2026-07-17

## 背景

不同 System Package 需要表达不同视觉身份，但把包样式应用到整个应用会污染 App Shell；只允许一套共享页面 DOM 又会永久限制视觉设计。

## 决策

- System Package 可以内置多个可选 Skin。
- 每个 Skin 拥有一份包范围内的 scoped CSS，并可选择覆盖 Shell 或 Page HTML Layout Template。
- 未提供的覆盖回退到 Base Layout Template；覆盖必须保持每个 Page 或 Shell 中原有的模块所有权。
- Base Framework 继续拥有交互、Character Data、Validation 与固定 A4 页面盒。
- Framework-owned surfaces 使用独立的中性 Light/Dark Color Scheme，System Package 不能为 App Shell 注入样式。
- 不支持第三方 Skin 安装、捆绑字体、逐 Page 选择 Skin、跨 Page 移动模块或通过 Skin 改变游戏行为。

## 理由

包范围的样式与可选模板覆盖能提供足够的视觉自由，同时保持框架交互边界和 CSS 隔离。复用 HTML Layout Template 合同也避免引入第二套渲染模型。

## 代价

Loader、Validator、Renderer、偏好存储和测试都需要覆盖 Skin 分支；Author 也必须维护覆盖模板与原模块所有权的一致性。

## 后续信号

只有出现多个实际包共同需要的字体、独立安装或逐页组合场景时，才扩展 Skin 来源和选择范围；不能用 Skin 承载业务行为。
