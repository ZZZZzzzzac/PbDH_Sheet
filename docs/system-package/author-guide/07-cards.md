# Cards

Card Definition 是被 Card Table 使用的 Resource Entry。普通 Resource Entry 只要求 `ID`；一旦 Library 被 Card Table 消费，每条还必须提供配置后的卡名和描述字段，默认是 `名称`、`描述`。

Card Table 需要 `ID`、`类型: cardTable`、`标签`、非空且不重复的 `资源库IDs`。数组中的每个 Library 都使用同一套 presentation 配置，并在同一坐标系中混放 Cards。旧的单数 `资源库ID` 不受支持。可选 `显示方式` 为 `image` 或 `text`；还可改变 `卡名字段`、`描述字段`、`卡图字段`（默认 `卡图`）和逐条目的 `显示方式字段`。卡图值必须引用 manifest Asset 的 ID 或路径。

Resource Picker 可通过 `创建卡牌.卡牌桌面模块ID` 把选中资源创建为 Card Instance，并用 `默认状态` 设置初始状态。每个 Picker 仍只浏览一个 `资源库ID`；只要该 ID 出现在目标 Card Table 的 `资源库IDs` 中，多个 Picker 就可以把不同 Library 的 Cards 放到同一桌面。

Card name、description 与推断 tags 支持[Restricted Markdown](../reference/restricted-markdown.md)，并在文字 Card、详情和图片失败 fallback 中保持一致。控件、菜单、空状态和无障碍名称仍是纯文本。

Card Definition 是不可变 Author Data；Card Instance 是 Player 状态，包含位置、层级和状态。框架负责创建、删除、拖动、整理、状态切换和只读详情，不实现抽牌、费用、上限或游戏合法性。此类规则由 Validation Check 报告。

图片加载失败会使用文字 fallback。不要把大型图片转成 base64 写进资源 JSON；将图片放入 Assets。
