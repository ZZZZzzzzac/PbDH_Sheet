# System Package 文档

这里是 PbDH System Package Interface 的唯一文档入口。作者、AI 与程序员使用同一套合同，不再维护角色专属副本。

当前框架合同版本：`schemaVersion: 0.2.0`。每个主题文件前半解释功能、语义和边界，分隔线后是由运行时 Zod Schema 与约束注册表生成的字段、格式和例子；作者、AI 与程序员都只读这一份主题文档。CI 会阻止生成区块落后于实现。

## 文档格式

```text
# 主题

功能、语义、边界和作者建议（手写）

---

精确字段、枚举、默认值、格式、语义约束和例子（自动生成）
```

Package Script 的 `.d.ts` 作为相关主题的类型附件，由生成区块直接链接；它不是另一套给 AI 的文档。字段表本身由 Zod Schema 在内存中生成，不另行提交一批 JSON Schema 文件。

## 从哪里开始

- 第一次制作：复制 [`templates/system-package-minimal/`](../../templates/system-package-minimal/)，然后阅读[快速开始](getting-started.md)。
- 持续制作、预览与排错：阅读[制作工作流](authoring-workflow.md)。
- 修改、生成或诊断包：先阅读下方相关合同，再运行 Author Preview 与 Validator。
- 查完整实现：看 [`public/system-packages/`](../../public/system-packages/) 中实际随产品发布的包。
- 查广覆盖测试数据：看 [`tests/fixtures/system-packages/kitchen-sink/`](../../tests/fixtures/system-packages/kitchen-sink/)；它不是推荐起点。

## 合同目录

| 主题 | 权威文档 |
| --- | --- |
| 包入口、加载管线、文件与资产 | [Package 与资产](contract/package-and-assets.md) |
| Pages、HTML Layout、Shell、打印与 Skins | [页面、布局与皮肤](contract/pages-layout-skins.md) |
| 九类 Sheet Module 与 Character Data | [模块与角色数据](contract/modules-character-data.md) |
| Resource Libraries、Cards、Composer 与扩展资源 | [资源与卡牌](contract/resources-cards.md) |
| 触发、条件与动作 | [依赖逻辑](contract/dependencies.md) |
| Guide、Validation Script 与诊断 | [引导与验证](contract/guides-validation.md) |
| 隔离问卷与 Resource Picker 结果回放 | [问卷式车卡](contract/questionnaire-character-creation.md) |
| Resource/Character Format Adapter | [扩展与适配器](contract/extensions-adapters.md) |

## 三种可执行材料的边界

- `templates/system-package-minimal/`：可复制的最小骨架，只展示必需文件与最小布局。
- `public/system-packages/`：真实发布实现，可学习组合方式，但不是接口定义。
- `tests/fixtures/system-packages/`：测试覆盖数据，可能刻意复杂或无效，不应直接作为新包起点。

不要使用已移除的 `selectionText`、Flow Layout 或旧 Author/AI 专属文档。主题文件的手写部分与自动生成部分共同构成合同。
