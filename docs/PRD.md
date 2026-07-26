# PbDH Sheet Framework 产品需求

## 文档职责

本文只记录产品为什么存在、服务谁、提供什么能力以及明确不做什么。当前系统如何实现见 [architecture.md](architecture.md)，架构决策理由见 [ADR](adr/README.md)，System Package 精确合同见 [System Package 文档](system-package/README.md)。

## 产品问题

Powered by Daggerheart（PbDH）有多个衍生规则。规则作者通常需要一套可分发的线上车卡器，但为每个规则重复开发 Web 应用成本高，非程序员作者也难以维护布局、资源、规则和导入导出逻辑。

玩家需要一个一致的工具来创建和维护角色、管理卡牌与资源、保存和迁移数据，并输出适合分享或打印的角色卡。

## 产品定位

PbDH Sheet Framework 是一个通用的浏览器端角色卡框架：

- **System Package Author** 用声明式文件和少量受限脚本定义规则资源、页面、模块、样式、依赖、指引、检查与外部格式适配；
- **Player** 加载 System Package 后获得对应的 Sheet Tool，用它建立、编辑、检查、导入、导出和打印角色；
- **Base Framework** 提供安全加载、校验、渲染、持久化和通用交互，不解释具体规则中的“等级”“费用”或“伤害”。

System Package 是可分发的规则与表现扩展，不能替换框架运行时或注入任意 UI 行为。

## 核心原则

1. **纸笔优先**：普通角色字段以作者和玩家写入的文字为准；只有模块自身状态、引用和包结构采用严格类型。
2. **作者拥有规则与表现**：规则资源、页面布局、包内皮肤和检查逻辑来自 System Package。
3. **框架拥有安全边界**：文件读取、路径、脚本隔离、结果校验、持久化和交互入口由 Base Framework 控制。
4. **检查而非强制**：游戏规则限制优先由只读检查报告表达，不让通用组件替玩家作规则决定。
5. **本地可携带**：角色在浏览器本地自动保存，并可通过文件导入导出；玩家图片随角色数据恢复。
6. **可供人和 AI 维护**：Author 合同有稳定文档、示例、校验诊断和真实包测试。

## 产品能力

### Author

- 创建、导入、预览和校验 System Package；
- 定义多个页面、安全 HTML/CSS 布局、通用 Sheet Modules 与包内 Skins；
- 定义资源库、卡牌、组合资源和 Resource Extensions；
- 用有限声明式依赖响应玩家操作，并用只读检查脚本报告整张角色的问题；
- 提供线性 Character Creation Guide，说明并高亮页面、模块或布局区域；
- 可选地提供隔离问卷，用 Author 自定义问题与表现推荐资源，并在确认后复用现有 Resource Picker 行为；
- 用受限 Format Adapter Script 兼容外部角色或资源格式；
- 使用 Author Guide、Reference、完整示例和机器可读诊断完成调试。

### Player

- 选择预置包，或导入本地 zip/目录 System Package；
- 新建、切换、复制、重命名和删除本地角色存档；
- 编辑文字、勾选项、计数资源、图片、资源选择和组合资源；
- 浏览和管理卡牌，在自由卡牌桌上调整状态、位置、朝向、正反面和指示物；
- 导入/导出原生角色 JSON，并在包提供 Adapter 时导入/导出外部格式；
- 导入额外资源包，形成当前 System Package 的有效资源目录；
- 主动启动车卡指引，手动运行检查，并在输出前查看检查结果；
- 导出 HTML 或使用浏览器打印能力生成纸面/PDF 输出。

## 成功标准

- 一个新 System Package 可以只依赖公开合同、示例和校验诊断完成开发；
- 不修改 Base Framework 源码即可支持不同 PbDH 规则、布局和资源；
- 角色在刷新、切换存档和文件迁移后保持可恢复；
- 第三方包的路径、HTML/CSS 和脚本不能绕过框架边界；
- 核心 System Packages 与外部格式由自动化 fixture 和集成测试覆盖；
- 产品能力增长时，精确合同只在 System Package Reference 和可执行代码中维护，不复制到本 PRD。

## 非目标

- 账号、服务器 API、云同步、在线市场或多人协作；
- PWA 安装、Service Worker 或离线应用壳；
- 通用低代码编辑器、拖拽式布局设计器或任意脚本插件平台；
- 由框架理解所有 PbDH 规则语义，或自动阻止所有不合法角色；
- 服务端 PDF、远程 URL 包导入或托管大型资源；
- Guide 读取角色数据、判断完成条件或编排业务动作。

这些边界可以由新的产品需求和 ADR 重新评估，但不得在实现文档中隐式改变。

## 验收依据

- 产品范围：本文；
- 当前运行方式和边界：[architecture.md](architecture.md)；
- Author-facing 验收合同：[System Package 文档](system-package/README.md)；
- 历史理由：[ADR 索引](adr/README.md)；
- 实际行为：源码、单元/集成测试与预置 System Packages。
