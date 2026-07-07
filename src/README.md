# src 结构约定

- `domain/`：纯领域数据结构、校验、导入导出格式。不得读取 DOM、网络、IndexedDB。
- `loaders/`：System Package 来源适配。负责从静态文件、未来上传文件或 zip 中读数据，并调用 Validator。
- `store/`：Zustand 运行时状态和 action。Sheet Module 只发 action，不直接写 Storage Service。
- `storage/`：IndexedDB/localStorage 访问。组件不得直接调用 Dexie。
- `rendering/`：Sheet Tool 渲染。只接收已验证的 System Package 和 runtime state，不重新校验包。
- `test/`：测试夹具和测试环境设置，不进入生产运行路径。
