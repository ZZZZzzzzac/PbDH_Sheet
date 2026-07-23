# AI generation checklist

生成或修改前：

1. 使用 `schemaVersion: 0.2.0` 和中文框架键名。
2. 先列 manifest、稳定 ID 和文件引用，再生成内容。
3. 只使用当前九种 Sheet Module。
4. 使用 HTML Layout Template、`pb-module` 和可选单一 `pb-page-outlet`；不要生成 Flow Layout。
5. Resource Picker 是 transient trigger；不要生成 `selectionText` 或隐藏选择字段。
6. 普通 Resource Value 保持显示文本语义，不自行收紧为游戏数值类型。
7. Dependency 只用已定义 trigger/condition/action，声明 sources/targets，假设单轮且无链式；不要生成手动重放开关，框架只自动重建纯派生动作。
   Free Text 筛选使用 `freeTextChanged` + `setResourceDefaultFilter` + `freeTextValues`；把每个读取的 Free Text 列入 Rule `sources`，不要让 Resource Library 或 Browser 读取 Character Data。
8. Guide 只生成 Restricted Markdown 线性说明和单个 Page、Module 或 Layout Region 目标，不生成目标数组、任意 selector、完成条件、动作或 Character Data 访问。Layout Region 使用 package-wide unique `data-guide-region-id`；跨页目标由框架切换 Current Page。
9. Validation Script 只读输入并返回 issues；不访问 DOM、网络或框架状态。
10. 所有路径安全相对，所有 ID 唯一，所有引用存在。
11. `fillCountable` 只使用整数常量、可严格解析的 Resource 字段或受限 `integerCalculation`；计算引用的 Countable/Picker 均列入规则 `sources`，多选 Picker 字段声明 `选择索引`。
12. Card Definition 只有在被 Card Table 消费时才要求 name/description；按 Module 配置字段检查。
13. 运行 Validator 后按 `location/entities/evidence` 修复；不要要求或虚构 suggestion，不要尝试关闭规则。
14. 只在自由输入 freeText/longText value 与 Card name/description/tags 中生成 Restricted Markdown；只用批准语法和七个命名颜色，不格式化框架 UI 文本。Free Text `选项`必须是非空、无重复的纯文本字符串列表，`默认值`必须属于列表，且下拉模式不能作为`fillText`追加目标。
   Resource selection 需要动态灰色提示时使用纯派生 `setTextPlaceholder`，不要用 `fillText`伪造 Player 已填写值，也不要让 Text Module 直接读取 Resource。
15. Countable Resource 标记展示仍用 `countableResource`；生成 `显示方式:"标记"` 时同时提供两个不同的 Marker Descriptor `当前值标记` / `剩余值标记`，并保证 `最小值 >= 0`。每侧显式使用 `{类型:"文字",内容:"单个可见 Unicode 字素"}` 或 `{类型:"图片",资源路径:"assets/**"}`，可混用。图片只用 PNG、JPEG、WebP、GIF、AVIF、SVG 包内路径，不用 `.ico`、外链或 base64。可用 5–96 的 `标记尺寸` / `加减号字号`声明 marker / 加减号 CSS 像素尺寸；不要写单位字符串，也不要创建新的 counter Module 或 Character Data shape。
16. Resource Composer 只声明固定单选槽位和一对一字段路由；需要区分全部同源与异源组合时，可额外声明受限的 `选择关系输出`。不保存来源，不生成其他模板、条件或脚本。
17. Card Table 只用 `资源来源`；每个来源可选声明 `卡牌展示.名称模板`、`描述模板` 与 `标签字段`。
18. Resource Entry ID 可以使用中文；优先生成可读的稳定命名空间，不生成无必要的随机哈希。迁移已发布 ID 时显式写 `旧ID`，不得按名称猜测引用。
19. Skin 默认只生成全包 scoped CSS 和 `assets/skins/<skin-id>/**`；不要修改 Base Layout。只有 CSS 无法表达且任务明确允许时才生成该 Skin 自己的 HTML override。
20. Skin HTML override 必须保持对应 Base Page/Shell 完全相同的 `<pb-module>` ID 多重集合，不能跨 Page/Shell 移动；Shell 保持唯一 outlet 和打印标记数量，Guide Region 在每个有效 Skin 中仍可用。
21. Skin 禁止 `@import`、`@font-face`、字体文件、外部 URL、脚本、事件属性和自定义交互控件。用系统字体栈和包内图片；Framework 配色只声明 `light` 或 `dark` 建议。
22. A4 Page 内部主列使用 `%`/`fr`/`minmax(0, …)`；不要用固定 `mm`/`px` 定义立绘栏、正文栏等主轨道，并比较网页与打印中的关键区域占比。

生成顺序建议：manifest → resources/assets 图片树 → modules → pages/layouts/shell → dependencies → guide → checks → skins → Validator → Preview。
