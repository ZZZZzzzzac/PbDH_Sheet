# Cards

Card Definition 是被 Card Table 使用的 Resource Entry，可来自 Resource Library 或 Resource Composer 的角色专属输出。

Card Table 需要 `ID`、`类型: cardTable`、`标签`、非空且不重复的 `资源来源`。每项写 `类型: resourceLibrary|resourceComposer` 与 `ID`，可选 `卡牌展示`。省略展示时名称取 `名称`、描述取 `描述`，其他普通字段成为标签；特殊来源可写名称模板、描述模板和标签字段。可选 `显示方式` 为 `image` 或 `text`；`卡图字段` 默认 `卡图`，`卡背字段` 默认 `卡背`，图片值必须引用 `assets/**` 下自动发现的相对路径。

需要让同一个 Composite Card 在不同组合关系下切换图片/文字时，为 Table 声明 `显示方式字段`，并让 Resource Composer 的 `选择关系输出` 写入该字段。所有槽选择同一 Entry 可输出 `image`，存在不同 Entry 时输出 `text`；这是通用的来源关系判断，不应在框架配置中写死某个游戏的种族或混血规则。

Resource Picker 与 Resource Composer 可通过 `创建卡牌.卡牌桌面模块ID` 创建 Card Instance，并用 `默认状态` 设置初始状态。对应生产者必须出现在目标 Card Table 的 `资源来源` 中。

Card name、description 与推断 tags 支持[Restricted Markdown](../reference/restricted-markdown.md)，并在文字 Card、详情和图片失败 fallback 中保持一致。控件、菜单、空状态和无障碍名称仍是纯文本。

紧凑文字 Card 会自动缩小 description 以尽量显示完整内容：从当前样式计算出的字号开始，最低缩至 `9px`。Card name、tags 与 Card Detail 不缩放。极端长文本在 `9px` 仍放不下时会保留裁切并显示独立省略号角标，Player 可打开 Card Detail 阅读完整 description。因此 Author 不需要也不能在 Resource Value 中写字号或溢出提示，拟合结果也不会进入角色存档或 System Package 数据。打印时框架只把自由桌面上的多张 Card 重排成纸面网格，单张紧凑 Card 的尺寸、内部布局、拟合字号和颜色保持与网页一致。

Card Definition 是不可变 Author Data；Card Instance 是 Player 状态，包含位置、层级和状态。框架负责创建、删除、拖动、整理、状态切换和只读详情，不实现抽牌、费用、上限或游戏合法性。此类规则由 Validation Check 报告。

双面 Card 在正面 Resource Entry 的 `背面卡牌ID` 写同一 Resource Library 内另一张 Card Definition 的 ID。若包使用不同字段名，在 Card Table 用 `背面卡牌ID字段` 指定。背面也必须具备 Card Table 配置后的名称和描述，不能引用不存在的条目或正面自身。Player 通过 Card 右键菜单翻面，Card Detail 显示当前面。

若背面只是卡背图片而没有独立规则文本，直接在 Entry 写 `卡背: "assets/cards/backs/common.webp"`。直接卡背优先于 `背面卡牌ID`，翻面时沿用正面的名称、描述与 Definition identity，只替换图片。Resource Composer 需要把来源槽位的 `卡图` 与 `卡背`分别路由到同名输出字段。

卡牌指示物不需要 Author 配置。每张 Card Instance 的右键菜单都提供 `添加指示物`，最多添加十个；框架用十种固定背景色区分。圆形徽章只显示数值：左键或轻点增加，右键或触屏长按减少。从 1 减到 0 会保留；在 0 上再次减少才移除。卡牌指示物不是 Countable Resource，不参与 `fillCountable` 或 Countable 打印策略。

Card 右键菜单只提供顺时针 90° 旋转和恢复竖置；需要 180° 或 270° 时继续顺时针旋转。整理桌面会把 Card 恢复为竖置。翻面、旋转和指示物都属于 Character Data，并保留在保存、导入和输出中。

`标记为宝库`一类文字完全来自 Author 在 Card Table `状态选项` 中写入的 `宝库` state，不是 Base Framework 术语或 Card Definition 字段。Author 可写任意 state，并用 `状态背景色` 为其中部分状态指定 `#RRGGBB` 背景色，例如 `{ "宝库": "#d8e2f3" }`。未映射状态保持默认卡面颜色；配色会用于紧凑卡面、详情和输出，但不会写入 Character Data。

图片加载失败会使用文字 fallback。不要把大型图片转成 base64 写进资源 JSON；将图片放入 `assets/**` 并直接引用相对路径。
