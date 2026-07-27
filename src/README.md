# src 结构约定

- `domain/`：纯领域数据结构、校验、导入导出格式。不得读取 DOM、网络、IndexedDB。复杂合同使用同名子目录：入口文件只维持公共导出，子目录按 schema、类型和独立校验 concern 拆分。
- `loaders/`：System Package 来源适配。负责从静态文件、未来上传文件或 zip 中读数据，并调用 Validator。
- `store/`：Zustand 运行时状态和 action。`runtimeStore.ts` 只创建、组合并导出扁平 Store；`slices/` 按稳定职责声明状态与 action；`workflows/` 编排跨职责流程；`runtimeEnvironment.ts` 持有 Storage、timer、asset resolver 等实例私有运行依赖。Slice 不互相调用 action。Sheet Module 只发 action，不直接写 Storage Service。
- `storage/`：IndexedDB/localStorage 访问。组件不得直接调用 Dexie。
- `rendering/`：Sheet Tool 渲染。只接收已验证的 System Package 和 runtime state，不重新校验包。`rendering/app/` 放 App Shell 的菜单、对话框协调和输出 hook；根 `App.tsx` 只保留生命周期与区域组合。`rendering/cardTable/` 按桌面协调、Card Instance 视图、Card Face、Card 操作界面和 Card Indicator 分责；`CardTableModule.tsx` 只保留桌面级尺寸、拖拽生命周期与区域组合。
- `test/`：测试夹具和测试环境设置，不进入生产运行路径。
