# System Package 文档中心

System Package 是 Author 提供给 Base Framework 的声明式资料包。它包含页面、Sheet Modules、Resource Libraries、Dependency Logic、Character Creation Guide、Validation Checks、样式与 Assets；它不是可执行插件，也不能修改框架 UI 或绕过框架写 Character Data。

当前包格式版本：`0.2.0`。实现、Accepted ADR 与本目录共同描述当前契约。

## 按读者选择路线

### 非程序员 Author

从 [快速开始](author-guide/01-quick-start.md) 开始，依次阅读：

1. [文件结构](author-guide/02-file-structure.md)
2. [Pages 与布局](author-guide/03-pages-and-layout.md)
3. [Sheet Modules](author-guide/04-sheet-modules.md)
4. [Resource Libraries](author-guide/05-resource-libraries.md)
5. [Dependency Logic](author-guide/06-dependency-logic.md)
6. [Cards](author-guide/07-cards.md)
7. [Character Creation Guide](author-guide/08-character-creation-guide.md)
8. [Validation Checks](author-guide/09-validation-checks.md)
9. [Author Preview](author-guide/10-author-preview.md)
10. [调试](author-guide/11-debugging.md)
11. [制作 Resource Extension](author-guide/12-resource-extensions.md)
12. [制作 System Package Skin](author-guide/13-system-package-skins.md)

### 程序员与 AI

从 [Package 管线](reference/package-pipeline.md) 和 [manifest 参考](reference/manifest.md) 开始，再按需要查询 [Reference 索引](reference/README.md)。生成包前阅读 [AI checklist](reference/ai-checklist.md)。

## 示例

- `docs/system-package/examples/demo-minimal`：最小可运行包。
- `docs/system-package/examples/demo`：九种 Sheet Modules、Pages、Shell、Resources、Dependencies、Cards、Guide、Checks 的完整组合；覆盖矩阵见包内 `README.md`。
- `public/system-packages/`：随应用发布的预制 System Packages；工具栏会在构建时自动发现并列出这里的每个包，Player 无需上传即可切换。
- `tests/fixtures/system-packages/errors`：故意损坏的测试包源目录和预期错误码，不随生产构建发布。
- `public/resource-extensions/the-void-20260710.json`：向一个 System Package 贡献多个 Libraries 的完整 Resource Extension。
- [最小包讲解](examples/minimal-package.md)
- [完整包讲解](examples/complete-package.md)
- [常见错误](examples/common-errors.md)
- [AI 协作提示词模板](examples/ai-prompt-template.md)
- [Skin starter](examples/skin-starter.md)

## 当前与废弃接口

当前布局是 HTML Layout Template，使用 `<pb-module>`；Flow Layout 已废弃。资源选择入口是 `resourcePicker`，不是 `selectionText`。Guide 是线性聚光灯说明，不执行规则动作。System Package Validator 只检查框架结构契约；游戏规则由 Validation Checks 报告。

## System Package 测试边界

具体 System Package 是 Author Data。包级自动测试只负责发现 Loader、schema、引用、路径、安全规则或 Validator 能实际报告的错误；不得固定 Author 可随时调整的内容，例如文案、模块/字段数量、默认值、placeholder、页面区域顺序、尺寸、`行数`、CSS 数值或具体布局选择。

具体包保留“通过正常 package pipeline 加载且无 fatal/error”的冒烟测试。Dependency Engine、Card、Validation、Renderer 等框架行为使用通用 fixtures 测试，不借某个具体 System Package 规定 Author 应该怎么写。

架构依据：[System Package Contract](../adr/0002-system-package-contract.md)、[Validator](../adr/0003-system-package-validator.md)、[Dependency Engine](../adr/0004-dependency-engine-boundary.md)、[HTML Layout](../adr/0014-html-layout-template-primary-layout.md)、[Guide](../adr/0015-character-creation-guide-as-spotlight-tour.md)。
