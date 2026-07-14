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

## 文字 Card description 自动拟合

紧凑文字 Card 会在 Restricted Markdown 完成渲染后测量 description 的真实内容尺寸，并在当前 computed font size 与 `9px` 之间选择能够完整容纳内容的最大字号。拟合只改变 description；Card name 与推断 tags 保持原字号，Card Detail 也保持正常详情字号并显示完整内容。

Card 大小或响应式容器尺寸改变、description 内容改变、实际字体完成加载时会重新拟合。拖动、调整 z-order 或切换 Card state 不改变 Card 尺寸，因此不会触发拟合。卡图加载失败后的文字 fallback 使用相同行为。

若 description 在 `9px` 时仍无法完整显示，紧凑 Card 继续裁切，并在 Card 角落显示独立的省略号标识；该标识不是 Resource Value 的一部分，并通过 tooltip/无障碍名称提示 Player 打开 Card Detail 阅读完整内容。Base Framework 的 Framework Check 同时产生 `TEXT_CONTENT_OVERFLOW` warning，与 Author Validation Check issues 一起显示。

拟合字号与溢出状态只属于当前渲染结果，不写入 Card Definition、Card Instance、Character Data 或 System Package schema。HTML snapshot、Export Preview 和打印使用输出时已经稳定的拟合结果。打印可以把多张 Card 从自由桌面坐标重排为纸面网格，但单张 Card 保持网页紧凑 Card 的宽高、内部布局、拟合字号与颜色；框架为 Card Face 请求精确打印颜色。

Card Instance 属于 Character Data/runtime state，至少通过稳定 instance ID 关联 Definition ID，并保存桌面坐标、z-order 和状态。具体持久字段是框架内部契约，不允许 Author 在 Resource Entry 中伪造实例状态。

Resource Picker `创建卡牌` 发出创建动作；Picker Library 不在目标 Table 的 `资源库IDs` 中为 error。来自多个 Library 的 Cards 共用桌面坐标、z-order、状态选项和 presentation 字段配置。Cards 可拖动、整理、删除、切换状态和打开只读详情；输出模式排除临时详情 Overlay。规则合法性、数量限制和支付不属于 Card Engine。
