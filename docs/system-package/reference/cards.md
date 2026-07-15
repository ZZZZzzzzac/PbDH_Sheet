# Cards reference

Card Definition 是 Card Table `资源来源` 解析出的 normalized Resource Entry，可来自 System Package Resource Library 或 Character Data Composite Resource。Card Instance 保存显式 Resource Definition Reference；Renderer 通过统一 Resolver 解析。不同 Library 可安全复用 Entry ID，Composite Resource 使用稳定角色内 ID。

Card Table presentation field resolution：

| 含义 | Module 配置 | 默认 |
| --- | --- | --- |
| name | 来源 `卡牌展示.名称模板` | `{{名称}}` |
| description | 来源 `卡牌展示.描述模板` | `{{描述}}` |
| tags | 来源 `卡牌展示.标签字段` | 未被模板消费的其他普通非空字段 |
| artwork | `卡图字段` | `卡图` |
| per-entry presentation | `显示方式字段` | 未启用 |
| table fallback presentation | `显示方式` | 组件默认 |

Card Table 可用 `背面卡牌ID字段` 指定哪个 Resource Entry 字段保存背面 Definition ID，默认字段名是 `背面卡牌ID`。该值省略或为空表示单面卡；非空值必须引用同一 Resource Library 中另一张 Card Definition，不能引用自身。Card Instance 始终以原始 `libraryId + definitionId` 作为正面身份，只把当前 `face` 保存为实例状态。右键菜单仅在背面引用有效时显示翻面操作，紧凑 Card Face 与 Card Detail 都展示当前面。

每个 Card Instance 都可使用框架内建指示物，不需要 Author 在 System Package 中声明类型。Player 从 Card 右键菜单选择 `添加指示物`，每次创建一个初始值为 0 的独立指示物；同一实例最多十个。框架按添加顺序从固定十色 palette 分配尚未使用的背景色，删除后新指示物优先复用空出的颜色。

36px 圆形徽章沿 Card 右边缘排列在删除按钮下方，只显示放大的数值；颜色名称进入 tooltip 和无障碍名称。左键/轻点/键盘 `+` 或 `ArrowUp` 增加，右键/触屏长按/键盘 `-` 或 `ArrowDown` 减少。从 1 减到 0 时徽章保留；在 0 上再次减少才移除，Character Data 不保存负数。

徽章是 Card Instance 控件，不是 Author 配置或 `countableResource` Sheet Module。两者可共享框架的纯计数转移逻辑，但指示物不成为 Sheet Value、Dependency source/target，也不应用 Countable Resource 打印策略。徽章位于 Card Face 内容与 description 测量区域之外，不触发额外字号缩小；随 Card 输出，临时菜单不输出。

Card 右键菜单只提供顺时针 90° 旋转以及恢复竖置；连续顺时针操作仍可到达 180° 和 270°。实例 rotation 规范化为 `0 | 90 | 180 | 270`，整理 Card Table 会恢复 0°。

Card Instance 的 `state` 是 Author 定义的不透明字符串，不是 Card Definition 属性。Card Table 用非空且不重复的 `状态选项` 声明可切换状态，右键菜单只原样显示 `标记为{下一个状态}`，不会翻译或解释 state。省略 `状态选项` 时不显示状态切换菜单。Resource Picker `创建卡牌.默认状态` 决定初始值；省略时使用目标 Card Table 的第一个状态，再回退内部 `default`。可选 `状态背景色` 把其中部分 state 映射到严格的 `#RRGGBB` 背景色：

```json
{
  "状态选项": ["当前", "宝库", "已消耗"],
  "状态背景色": {
    "宝库": "#123456",
    "已消耗": "#abcdef"
  }
}
```

映射键必须出现在 `状态选项` 中。框架不预设哪些状态需要颜色；未映射 state 的紧凑 Card Face、Card Detail 和输出继续使用现有默认背景色。映射只属于 System Package presentation，不写入 Card Definition 或 Character Data；Author 应选择能让现有文字保持可读的背景色。

Card name、description 与推断 tags 都按[Restricted Markdown](restricted-markdown.md)展示；Card Detail、文字模式和卡图加载失败 fallback 使用同一合同。Card 控件、菜单、空状态和无障碍名称不解析 Markdown。

## 文字 Card description 自动拟合

紧凑文字 Card 会在 Restricted Markdown 完成渲染后测量 description 的真实内容尺寸，并在当前 computed font size 与 `9px` 之间选择能够完整容纳内容的最大字号。拟合只改变 description；Card name 与推断 tags 保持原字号，Card Detail 也保持正常详情字号并显示完整内容。

Card 大小或响应式容器尺寸改变、description 内容改变、实际字体完成加载时会重新拟合。拖动、调整 z-order 或切换 Card state 不改变 Card 尺寸，因此不会触发拟合。卡图加载失败后的文字 fallback 使用相同行为。

若 description 在 `9px` 时仍无法完整显示，紧凑 Card 继续裁切，并在 Card 角落显示独立的省略号标识；该标识不是 Resource Value 的一部分，并通过 tooltip/无障碍名称提示 Player 打开 Card Detail 阅读完整内容。Base Framework 的 Framework Check 同时产生 `TEXT_CONTENT_OVERFLOW` warning，与 Author Validation Check issues 一起显示。

拟合字号与溢出状态只属于当前渲染结果，不写入 Card Definition、Card Instance、Character Data 或 System Package schema。HTML snapshot 和浏览器打印使用输出时已经稳定的拟合结果。打印可以把多张 Card 从自由桌面坐标重排为纸面网格，但单张 Card 保持网页紧凑 Card 的宽高、内部布局、拟合字号与颜色；框架为 Card Face 请求精确打印颜色。

Card Instance 属于 Character Data/runtime state，至少通过稳定 instance ID 关联 Definition ID，并保存桌面坐标、z-order、状态、当前面、旋转和指示物。具体持久字段是框架内部契约，不允许 Author 在 Resource Entry 中伪造实例状态。

Resource Picker 或 Resource Composer 的 `创建卡牌` 发出创建动作；生产者不在目标 Table 的 `资源来源` 中为 error。每个来源拥有自己的 Card Presentation，但共享桌面坐标、z-order 与状态选项。Composer 重复确认更新 Composite Resource，不重建已有 Card Instance；删除 Card 不删除 Composite Resource。Cards 可拖动、整理、删除、切换状态、翻面、四分之一圈旋转、操作指示物和打开只读详情；输出模式排除临时详情 Overlay。规则合法性、数量限制和支付不属于 Card Engine。
