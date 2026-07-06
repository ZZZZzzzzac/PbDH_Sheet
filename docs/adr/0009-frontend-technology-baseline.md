# ADR-0009: Frontend Technology Baseline

状态：Accepted
日期：2026-07-06

## 背景

PbDH Sheet Framework 是复杂的前端离线优先应用。它需要根据 System Package 动态渲染 Sheet Modules，管理 IndexedDB、Web Worker、PWA、zip 导入、导出打印和大量跨模块状态。项目目标是可维护、可扩展，并适合 AI 辅助实现。

## 决策

第一版前端技术基线为：

- Vite 作为开发服务器和静态构建工具。
- React 作为 UI 组件框架。
- TypeScript 作为主要开发语言。
- Zustand 管理运行时状态。
- IndexedDB 存储大数据，优先通过 Dexie 等轻封装访问。
- Zod 或等价 schema 工具校验 JSON 结构；复杂引用校验由自写 Validator 完成。
- fflate 作为 zip 解包优先候选，需通过大包压测确认；如不合适再替换。
- Vitest 测纯逻辑，Testing Library 测组件，Playwright 测端到端和移动端视口。

## 理由

- Vite 产物是静态资源，符合无服务器 API 的主架构。
- React 适合把 Sheet Modules 做成可组合组件。
- TypeScript 能约束 System Package、Character Data、Validation Issue 等复杂数据结构。
- Zustand 比 Redux 轻，能覆盖中型前端状态管理。
- Dexie 降低直接使用 IndexedDB 的样板代码。
- Zod 能把运行时校验和 TypeScript 类型靠近，便于 Author/AI 错误反馈。
- Playwright 能验证导入、编辑、检查、打印预览等真实浏览器流程。

## 代价

- 开发环境需要 Node.js 和前端工具链。
- TypeScript 和 React 增加学习成本。
- Zustand 需要项目规范约束 action 和 store 切片，不能靠库本身强制架构。
- zip 解包库和 IndexedDB 封装是可替换依赖，需要保持边界清楚。

## 后续信号

出现以下信号时，重评技术基线：

- React 动态渲染性能无法满足大 System Package。
- Zustand action 难以追踪，需要更强事件模型。
- zip 大包导入在移动端无法接受，需要流式或服务端方案。
- PWA 或 IndexedDB 兼容问题成为主要用户阻塞。
