# ADR-0016: Character-owned Composite Resources

状态：Accepted
日期：2026-07-15

Resource Composer 使用多个 Author-defined Resource Library 单选槽位，通过一对一字段路由生成一个稳定 Composite Resource。Composer 本身无状态且不保存来源选择；最终 normalized 输出属于 Character Data，并通过与 Resource Picker 相同的 Resource Output 合同驱动 Dependency Logic。

Composer 可在生成时把“所有槽选择同一 Entry / 存在不同 Entry”这一通用关系写入一个声明的派生字段。它不持久化来源引用，也不解释种族、混血等系统语义。Card Table 可把该字段作为每张 Card 的显示方式覆盖：同源组合沿用图片，异源组合回退文字，避免从任一来源复制的卡图错误代表整个 Composite Resource。

Card Instance 使用显式 Resource Definition Reference 区分 System Package Resource Entry 与 Character Data Composite Resource，由统一 Resolver 取 Definition。Card Table 通过类型化 `资源来源` 接受两类生产者，并让每个来源拥有自己的名称模板、描述模板和标签字段；旧 `资源库IDs` authoring 接口不保留。

该边界避免修改 Author-owned Resource Libraries、避免把角色资源伪装成运行时 Library，也避免让 Dependency Engine 负责 Card Definition。代价是 Character Data 与 Card Instance 合同新增持久结构，所有当前 System Package 必须同步迁移。
