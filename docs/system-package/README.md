# System Package 文档中心

System Package 是 Author 提供给 Base Framework 的声明式资料包。它包含页面、Sheet Modules、Resource Libraries、Dependency Logic、Character Creation Guide、Validation Checks、样式与 Assets；它不是可执行插件，也不能修改框架 UI 或绕过框架写 Character Data。

当前包格式版本：`0.1.0`。实现、Accepted ADR 与本目录共同描述当前契约。

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

### 程序员与 AI

从 [Package 管线](reference/package-pipeline.md) 和 [manifest 参考](reference/manifest.md) 开始，再按需要查询 [Reference 索引](reference/README.md)。生成包前阅读 [AI checklist](reference/ai-checklist.md)。

## 示例

- `public/system-packages/demo-minimal`：最小可运行包。
- `public/system-packages/demo-modules`：核心 Sheet Modules。
- `public/system-packages/demo-selection`：Pages、Shell、Resources、Dependencies、Cards、Guide、Checks 的完整组合。
- `public/system-packages/error-fixtures`：故意损坏的包和预期错误码。
- [最小包讲解](examples/minimal-package.md)
- [完整包讲解](examples/complete-package.md)
- [常见错误](examples/common-errors.md)
- [AI 协作提示词模板](examples/ai-prompt-template.md)

## 当前与废弃接口

当前布局是 HTML Layout Template，使用 `<pb-module>`；Flow Layout 已废弃。资源选择入口是 `resourcePicker`，不是 `selectionText`。Guide 是线性聚光灯说明，不执行规则动作。System Package Validator 只检查框架结构契约；游戏规则由 Validation Checks 报告。

架构依据：[System Package Contract](../adr/0002-system-package-contract.md)、[Validator](../adr/0003-system-package-validator.md)、[Dependency Engine](../adr/0004-dependency-engine-boundary.md)、[HTML Layout](../adr/0014-html-layout-template-primary-layout.md)、[Guide](../adr/0015-character-creation-guide-as-spotlight-tour.md)。
