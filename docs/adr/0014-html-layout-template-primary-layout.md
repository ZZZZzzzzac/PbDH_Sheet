# ADR-0014: HTML Layout Template Is the Primary Author Layout Model

状态：Accepted
日期：2026-07-08

## 背景

之前的 Flow Layout 用 JSON 表达页面、分区、行、列和模块摆放位。它能让框架安全控制布局，但 Author 和辅助 AI 仍需要学习一套框架自定义的布局语言。随着需求转向“Author 用接近原生 Web 的方式排版角色卡”，继续扩展 `rows -> columns -> modules` 会形成第二套 CSS/Grid/Flex 的简化复制品。

项目仍在开发阶段，没有必须保留的历史 System Package。此时可以直接替换作者侧布局模型，避免背负兼容路径。

## 决策

第一版 Author-facing 布局模型改为 HTML Layout Template。

- System Package 用安全 HTML 模板和 scoped CSS 声明页面布局。
- 模板通过 `<pb-module id="..."></pb-module>` 占位符挂载 Base Framework 提供的 Sheet Module。
- 模板允许 Static Layout Content，例如标题、说明文字、分隔线、装饰图片和无状态容器。
- 模板禁止 Author 自定义交互控件和行为，包括 `input`、`button`、`select`、`textarea`、`form`、`script`、事件属性和外部脚本。
- 所有读取或写入 Character Data 的 Player 交互必须来自 Base Framework Sheet Modules、Card Engine 或其他明确允许写入的框架交互面；Guide 只负责展示和高亮。
- CSS 只允许作用于当前模板作用域和框架公开的 module parts；不得影响 app shell、导入导出按钮、存档 UI、其他 System Package 或全局 `html/body`。
- Flow Layout 不再作为 Author-facing 主接口，也不保留兼容要求；现有 rich Flow Layout 实现应被替换，而不是继续扩展。

## 理由

- HTML/CSS 是 Author 和 AI 都更容易生成、解释和调试的布局语言。
- CSS Grid、Flex 和 media query 已经能表达行列、宽度、响应式和装饰，不需要框架再复制一套 JSON 布局 DSL。
- `<pb-module>` 保留了框架对状态、保存、导入导出、依赖、检查和指引的控制权。
- 禁止自定义表单控件能避免出现第二套 Character Data。
- 现在无历史包负担，直接替换比长期维护两套布局模型更简单。

## 代价

- Package Validator 需要 HTML sanitizer、CSS scoping 和模块占位符引用校验。
- Sheet Renderer 需要能把安全模板 AST 渲染为 React 结构，并在 `<pb-module>` 位置挂载模块。
- Author CSS 仍可能把当前 Sheet Tool 视觉写坏，需要 Author Preview 和清晰错误提示。
- 打印、导出、图片等待和响应式测试必须覆盖 HTML Layout Template。

## 后续信号

出现以下信号时，重新评估隔离方式或模板能力：

- scoped CSS 仍能污染框架 UI。
- Author 需要更强隔离，且调试/打印成本可接受，可考虑 Shadow DOM。
- 静态模板不足以表达常见角色卡装饰，但需求仍不涉及状态写入。
- Author 反复需要新交互控件，应优先沉淀为新的 Sheet Module，而不是开放模板脚本。
