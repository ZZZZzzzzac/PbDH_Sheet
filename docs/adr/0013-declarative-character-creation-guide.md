# ADR-0013: Declarative Character Creation Guide

状态：Superseded by [ADR-0015](0015-character-creation-guide-as-spotlight-tour.md)
日期：2026-07-07

## 背景

PbDH 玩家建卡时经常需要按顺序选择职业、子职业、种族、社群、属性、装备、护甲、能力卡、背景关系，并在最后检查缺项和冲突。不同 System Package 的建卡步骤、说明文本、资源来源、自动填充目标和最终检查规则都不同，不能由 Base Framework 硬编码。

同时，第一版已经决定 System Package 是声明式数据包，Author 不能注入任意 UI 逻辑或写脚本修改 Character Data。车卡指引必须帮助玩家一步一步建卡，但不能变成第二套规则引擎、第二套依赖系统或任意脚本入口。

## 决策

第一版支持声明式 Character Creation Guide。

- System Package 可以声明一个或多个 Character Creation Guide。
- Guide 由 Guide Steps 组成；每步可声明说明文本、目标页面、目标 Sheet Module、目标 Resource Library、目标 Card 区域、完成条件和允许的框架动作。
- Base Framework 提供 Guide Runner 运行这些声明。
- Guide Runner 可以输出导航、聚焦、高亮、打开资源库选择、打开卡牌区域、运行检查等 view effects 或 action requests。
- Guide Runner 不执行 Author 脚本，不读取 DOM，不直接写 IndexedDB，不直接 patch Character Data。
- Guide 中的自动填充必须复用 Dependency Engine 的 data patch 契约和冲突处理。
- Guide 中的卡牌添加、移动或排序必须复用 Card Engine。
- 简单完成条件可由 Guide Runner 判断；复杂规则合法性仍由 Validation Runner 和 Validation Scripts 报告。
- Guide progress 是绑定当前 Character Save 的运行时状态，不是 Sheet Value，不作为规则检查输入。
- MVP 的 Character JSON export 可以不包含 Guide progress；Player 可重新打开或重跑指引。

## 理由

- Author 可以为不同 PbDH 系统定义贴合规则的建卡流程。
- Player 得到一步一步的建卡体验，减少查表、漏填和找不到字段的摩擦。
- Guide Runner 只编排已有框架能力，避免绕过 Sheet Module、Dependency Engine、Card Engine 和 Validation Runner。
- 声明式步骤适合 AI 生成和 Validator 校验，比任意 UI 脚本更稳定。
- 把最终合法性留给 Validation Runner，避免车卡指引和检查规则表达同一套复杂规则。

## 代价

- System Package schema 和 Validator 需要新增 guide definitions、step references、completion conditions 和 action requests 的校验。
- Base Framework 需要维护 Guide Runner、Guide progress 和对应 UI。
- Author 不能制作任意自定义导览 UI，只能使用框架提供的指引展示和动作类型。
- Guide action vocabulary 需要谨慎扩展，否则容易变成隐藏的脚本系统。

## 后续信号

出现以下信号时，重新评估 Guide Runner 的能力范围：

- 多个 System Package 都需要 Guide Step 中表达复杂分支或循环。
- Author 需要图形化车卡指引编辑器。
- Guide actions 开始重复 Dependency Engine 的条件和写入规则。
- Player 明确需要在 Character JSON 中保留 Guide progress。
- Guide Step 的完成条件需要读取 Validation Script 之外的复杂规则结果。
