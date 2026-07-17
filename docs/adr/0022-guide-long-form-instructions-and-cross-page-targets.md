# ADR-0022: Guide Long-form Instructions and Cross-page Targets

状态：Accepted
日期：2026-07-17

## 背景

ADR-0015 将 Guide 标题和说明都限制为纯文本，并假设目标已在 Current Page DOM 中。实际 System Package 需要保留较长的 Author 说明、强调与列表，也需要在一条线性 Guide 中覆盖多张 Runtime-Visible Pages。纯文本会暴露 Markdown 标记；未渲染页面上的稳定目标只能降级为不可用，且遮罩阻止 Player 手动切页。

## 决策

- Guide Step `标题` 保持纯文本；`说明` 使用 Base Framework 现有 Restricted Markdown，不开放 links、images、raw HTML 或 Author CSS。
- 说明面板在视口边界内按内容调整尺寸；Guide actions 独立定位在目标左上附近，不参与长说明文档流。
- Page target 直接请求该 Runtime-Visible Page。Module 或 Layout Region target 若属于另一 Runtime-Visible Page，Guide 先选择其所属页，再解析 DOM 几何。
- 上一步和下一步都按新 Step 重新选择目标所属页。完成或退出不恢复 Guide 启动前的 Current Page。
- 隐藏 Page 或 runtime-hidden target 仍使用现有 unavailable 行为；Guide 不改变 Dependency visibility。

## 理由

- 复用 Restricted Markdown 可保留 Author 内容表达，同时延续既有安全边界与视觉语法。
- 独立 actions 保证长说明不会使退出和导航不可达。
- 自动选择 Runtime-Visible Page 只改变临时 UI 状态，不读取或写入 Character Data，也不引入规则行为。
- 保留最后页面符合 Player 正在该目标处继续填写的预期，避免退出时无意义跳转。

## 代价

- Guide instructions 不再是纯文本展示，System Package 可开始依赖 Restricted Markdown 语义。
- 框架必须从静态 HTML Layout Template 确定 Module/Layout Region 的所属 Page；重复挂载仍是不受支持的 Author 结构。
- 超长内容仍可能需要面板内部滚动，只保证 Guide actions 始终可达。

## 后续信号

- Author 反复需要 links、images 或可折叠章节。
- 同一稳定目标需要同时挂载在多张页面。
- 长说明在移动端普遍需要独立摘要字段。
