# ADR-0033: Current Package Projection for Native Character Import

状态：Accepted
日期：2026-07-31

## 背景

原生 Character Data 记录创建它的 System Package ID 与版本。此前导入要求两者都与 Current System Package 完全一致。这个规则把包版本误当成数据兼容性证明：只改 Skin、布局或名称也会阻止合法数据导入，而相同版本的手工修改数据仍可能包含当前包无法使用的 Module Value、Card 或资源引用。

为每个包版本维护迁移脚本、旧 Package 快照或 Module 类型快照会扩大 Character Data 合同，并要求 Author 为大量无数据影响的版本变化维护迁移关系。Character Data 的目标是保存 Player Data，不是保存创建它的 System Package 结构。

## 决策

原生 Character Data 导入采用 **Current Package Projection**：

- System Package ID 仍是原生数据的兼容边界；来源版本不参与准入判断。
- 导入从 Current System Package 的空白 Character Data 与默认值开始。
- 每项来源数据只有在 Current System Package 能按当前合同直接合法使用时才原样保留。
- Base 不转换值、不猜测语义、不按名称或相似 ID 匹配，也不保留隐藏的不兼容数据。
- 不存在的 Module、当前配置不接受的 Module Value、无效 Composite Resource、Resource Selection Snapshot、Player Image、Card Table、Card Source 或 Resource Entry 都被丢弃并产生 diagnostic。
- Card 仅状态失效时保留其他合法数据，并把状态设为 Current Card Table 的第一个状态；没有状态选项时设为空字符串。该变化产生 diagnostic。
- 导入结果写入 Current System Package 版本并生成新的 Character ID，始终创建新的 Character Save，不覆盖来源 ID 对应的现有存档。
- 无数据损失时直接完成导入；存在丢弃或状态重置时，复用 Character Format Adapter 的有损转换确认体验，Player 确认后才创建存档。

Character Data 不增加 Module 类型、Package 配置或迁移历史快照。来源版本保留为输入元数据，但成功导入后的数据只声明 Current System Package 版本。

## 理由

- 实际兼容性由当前包能否使用具体数据决定，而不是由版本字符串推断。
- 从当前默认值开始能自然处理新增 Module，并保证被丢弃数据有合法替代状态。
- 原样保留或丢弃的二元规则容易解释、测试和诊断，不需要 Author 维护版本迁移表。
- 丢弃缺失 Resource Entry 引用避免例外状态；Player 可安装所需 Resource Extension 后重新导入原文件。
- 新 Character ID 与确认步骤保证导入非破坏性，原文件和原存档承担恢复职责。

## 代价

- Base 无法恢复已重命名的 Module、Resource Entry 或其他稳定 ID；Author 应继续遵守稳定身份合同。
- 缺失 Resource Extension 时导入会丢弃相关数据，Player 需要安装扩展后重新导入原文件。
- 当前配置合法性检查必须覆盖所有持久化 Module Value 与 Character Data 辅助集合。
- 版本不再提供导入阻断能力；确需数据迁移的包更新必须依赖稳定 ID、当前默认值与明确 diagnostics，而不是版本号本身。

## 拒绝的替代方案

### 按版本维护迁移器

拒绝。多数版本变化不影响 Player Data，迁移矩阵会把简单包发布变成长期兼容负担。

### 在 Character Data 中记录 Module 类型或 Package 快照

拒绝。Character Data 应只保存 Player Data；结构快照会重复 System Package，并仍不能自动解释游戏语义变化。

### 保留无法解析的隐藏数据或陈旧资源引用

拒绝。隐藏数据会让导出物继续携带 Current System Package 无法使用的状态。原文件可在依赖补齐后重新导入。

## 后续信号

- 大量真实包更新需要稳定 ID 无法表达的语义迁移。
- diagnostics 规模使逐项确认难以使用，需要分组或下载报告。
- 某类持久数据无法通过 Current System Package 合同独立判断合法性。
