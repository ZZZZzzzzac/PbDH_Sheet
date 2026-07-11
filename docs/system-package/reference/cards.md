# Cards reference

Card Definition = Card Table 所引用 Resource Library 的 normalized Resource Entry。`ID`、配置后的 name 与 description 必须非空；art 可选但若存在必须解析到 Asset。

Card Table presentation field resolution：

| 含义 | Module 配置 | 默认 |
| --- | --- | --- |
| name | `卡名字段` | `名称` |
| description | `描述字段` | `描述` |
| artwork | `卡图字段` | `卡图` |
| per-entry presentation | `显示方式字段` | 未启用 |
| table fallback presentation | `显示方式` | 组件默认 |

Card Instance 属于 Character Data/runtime state，至少通过稳定 instance ID 关联 Definition ID，并保存桌面坐标、z-order 和状态。具体持久字段是框架内部契约，不允许 Author 在 Resource Entry 中伪造实例状态。

Resource Picker `创建卡牌` 发出创建动作；Picker/Table Library 不一致为 error。Cards 可拖动、整理、删除、切换状态和打开只读详情；输出模式排除临时详情 Overlay。规则合法性、数量限制和支付不属于 Card Engine。
