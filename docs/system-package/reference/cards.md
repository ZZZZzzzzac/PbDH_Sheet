# Cards reference

Card Definition = Card Table 的 `资源库IDs` 所引用任一 Resource Library 的 normalized Resource Entry。每个 Card Instance 通过 `libraryId + definitionId` 解析 Definition，因此不同 Library 可以安全使用相同的条目 ID。所有被引用 Library 的 `ID`、配置后的 name 与 description 必须非空；art 可选但若存在必须解析到 Asset。

Card Table presentation field resolution：

| 含义 | Module 配置 | 默认 |
| --- | --- | --- |
| name | `卡名字段` | `名称` |
| description | `描述字段` | `描述` |
| artwork | `卡图字段` | `卡图` |
| per-entry presentation | `显示方式字段` | 未启用 |
| table fallback presentation | `显示方式` | 组件默认 |

Card name、description 与推断 tags 都按[Restricted Markdown](restricted-markdown.md)展示；Card Detail、文字模式和卡图加载失败 fallback 使用同一合同。Card 控件、菜单、空状态和无障碍名称不解析 Markdown。

Card Instance 属于 Character Data/runtime state，至少通过稳定 instance ID 关联 Definition ID，并保存桌面坐标、z-order 和状态。具体持久字段是框架内部契约，不允许 Author 在 Resource Entry 中伪造实例状态。

Resource Picker `创建卡牌` 发出创建动作；Picker Library 不在目标 Table 的 `资源库IDs` 中为 error。来自多个 Library 的 Cards 共用桌面坐标、z-order、状态选项和 presentation 字段配置。Cards 可拖动、整理、删除、切换状态和打开只读详情；输出模式排除临时详情 Overlay。规则合法性、数量限制和支付不属于 Card Engine。
