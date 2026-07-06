# ADR-0008: Zustand State Management

状态：Accepted
日期：2026-07-06

## 背景

Sheet Tool 有大量运行时状态：当前 System Package、当前 Character Save、字段值、卡牌实例、依赖派生状态、检查报告、导入导出状态和 UI 状态。如果组件各自保存和持久化状态，自动保存、导入导出和跨模块依赖会难以维护。

## 决策

第一版使用 Zustand 管理前端内存状态：

- 全局 store 保存当前运行时状态。
- Character Data 变更通过 action 进入 store。
- Sheet Module 组件只渲染状态并发出 action，不直接写 IndexedDB。
- Sheet Module 组件不直接调用 Dependency Engine。
- Zustand store action 是运行时数据流枢纽：接收模块 action，调用 Dependency Engine，提交 data patches / derived view state，再触发 UI 重渲染和自动保存。
- Storage Service 独立负责 IndexedDB 和 localStorage。
- Dependency Engine 独立计算 derived view state 和跨模块 patch。
- Dependency Engine 保持纯函数风格，不直接读写 Zustand store。
- 自动保存由 store 层或应用协调层 debounce 后调用 Storage Service。
- 不使用 Redux Toolkit 作为第一版默认方案。

## 理由

- Zustand 比 Redux 轻，适合中型前端应用。
- 全局 store 能让模块、依赖引擎、导出和保存共享同一份状态。
- action 边界让跨模块修改可追踪。
- store 作为运行枢纽，引擎作为纯计算器，可以避免 Sheet Module、Dependency Engine、Storage Service 互相引用。
- Storage Service 独立能避免 UI 组件耦合 IndexedDB。

## 代价

- 需要约定 action 命名和状态切片边界。
- Zustand 本身不强制架构纪律，需要代码规范约束。
- 需要避免把业务规则塞进 store；复杂规则应留在 Dependency Engine。
- 复杂时间旅行调试和严格事件溯源不如 Redux 完整。

## 后续信号

出现以下信号时，重新评估状态管理：

- action 变更难以追踪。
- 依赖引擎 patch 和用户输入冲突频繁。
- 需要撤销/重做或事件溯源。
- store 性能或订阅边界成为瓶颈。
