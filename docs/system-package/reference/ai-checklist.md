# AI generation checklist

生成或修改前：

1. 使用 `schemaVersion: 0.1.0` 和中文框架键名。
2. 先列 manifest、稳定 ID 和文件引用，再生成内容。
3. 只使用当前九种 Sheet Module。
4. 使用 HTML Layout Template、`pb-module` 和可选单一 `pb-page-outlet`；不要生成 Flow Layout。
5. Resource Picker 是 transient trigger；不要生成 `selectionText` 或隐藏选择字段。
6. 普通 Resource Value 保持显示文本语义，不自行收紧为游戏数值类型。
7. Dependency 只用已定义 trigger/condition/action，声明 sources/targets，假设单轮且无链式；不要生成手动重放开关，框架只自动重建纯派生动作。
8. Guide 只生成线性说明和单目标，不生成完成条件、动作或 Character Data 访问。
9. Validation Script 只读输入并返回 issues；不访问 DOM、网络或框架状态。
10. 所有路径安全相对，所有 ID 唯一，所有引用存在。
11. `fillCountable` 只使用整数常量或可严格解析为整数的 Resource 字段；多选 Picker 声明 `选择索引`。
12. Card Definition 只有在被 Card Table 消费时才要求 name/description；按 Module 配置字段检查。
13. 运行 Validator 后按 `location/entities/evidence` 修复；不要要求或虚构 suggestion，不要尝试关闭规则。
14. 只在 freeText/longText value 与 Card name/description/tags 中生成 Restricted Markdown；只用批准语法和七个命名颜色，不格式化框架 UI 文本。
15. Countable Resource 标记展示仍用 `countableResource`；生成 `显示方式:"标记"` 时同时提供两个不同的单一可见 Unicode 字素 `当前值标记` / `剩余值标记`，并保证 `最小值 >= 0`。不要创建新的 counter Module 或 Character Data shape。
16. Resource Composer 只声明固定单选槽位和一对一字段路由；需要区分全部同源与异源组合时，可额外声明受限的 `选择关系输出`。不保存来源，不生成其他模板、条件或脚本。
17. Card Table 只用 `资源来源`；每个来源可选声明 `卡牌展示.名称模板`、`描述模板` 与 `标签字段`。
18. Resource Entry ID 可以使用中文；优先生成可读的稳定命名空间，不生成无必要的随机哈希。迁移已发布 ID 时显式写 `旧ID`，不得按名称猜测引用。

生成顺序建议：manifest → resources/assets 图片树 → modules → pages/layouts/shell → dependencies → guide → checks → Validator → Preview。
