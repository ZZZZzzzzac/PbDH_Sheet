# 文档地图

每类事实只维护一个主要来源。其他文档应链接它，不复制会随实现变化的清单或字段合同。

| 需要了解 | 唯一主要来源 | 不应包含 |
|---|---|---|
| 玩家操作与使用技巧 | [`player-guide.md`](player-guide.md) | 内部实现、System Package 制作方法 |
| 领域词汇和稳定关系 | [`CONTEXT.md`](../CONTEXT.md) | 当前源码结构、JSON 字段清单 |
| 产品问题、能力范围、非目标 | [`PRD.md`](PRD.md) | 技术栈、模块枚举、实现计划 |
| 当前运行时架构和数据流 | [`architecture.md`](architecture.md) | 决策讨论、精确包 schema |
| 架构决策理由与历史 | [`adr/`](adr/README.md) | 持续更新的当前合同副本 |
| System Package 唯一合同 | [`system-package/`](system-package/README.md) | 产品路线图、内部实现细节 |
| System Package 制作与排错 | [`system-package/authoring-workflow.md`](system-package/authoring-workflow.md) | 另一套规范定义 |
| 发布和部署操作 | [`release.md`](release.md) | 产品或架构总览 |
| 实际行为 | `src/`、测试、预置 System Packages | 仅靠文档声明的未实现行为 |

## 变更规则

- 产品范围变化：先更新 PRD；需要长期理由时新增 ADR。
- 当前模块边界或数据流变化：更新代码、测试和 architecture。
- System Package 可见合同变化：以 reference、schema、示例和 Validator 测试为一组更新。
- 旧 ADR 不删除或重写成新决定；标记 `Superseded`，并链接替代 ADR。
- 临时计划和探索记录放 GitHub Issues/PR，不进入长期架构文档。
