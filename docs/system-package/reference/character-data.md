# Character Data boundary

Character Data 是 Player-owned save，不是 System Package export。它保存 package identity/version、Sheet Values、Card Instance state 和 Player 上传图片；不复制 Resource Libraries、Layouts、Author Assets 或 Validation Scripts。Player 图片字段只保存 `imageId` 引用，图片的 base64 data URL 集中存于顶层 `playerImages`。

Character Data 还保存每个 Resource Composer 的一个稳定 Composite Resource。只保存 normalized 输出字段，不保存 Player 当时选择的来源 Entry。Card Instance 可通过显式 Resource Definition Reference 引用包内 Resource Entry 或 Composite Resource。

Card Instance state 包含 Definition 身份、桌面位置与层级、Player 状态、当前正反面、四分之一圈旋转，以及最多十个带稳定 ID、palette 颜色索引和非负数值的通用指示物。背面 Card Definition 来自当前 System Package；指示物由框架提供，不需要 Author Data。指示物值 `0` 有意义并会保留，在 0 上再次执行减少才删除。

Sheet Value 默认是文本。Checkbox/countable/image/card state 使用框架需要的专门结构，但 Author 不通过 System Package 直接声明 Character Data schema。Module ID 是值的稳定 key；改 ID 会让旧存档无法自动对应。

freeText/longText 的 Restricted Markdown 只影响展示；Character Data 保存原始 Markdown 字符串，不保存渲染 HTML。声明`选项`的下拉 Free Text 也保存同一种普通字符串，选项列表只约束 Player 输入，不改变 Character Data shape；列表外旧值继续保留。Resource Values 与 `fillText` 同样保持原始字符串，不需要 schema migration。

Free Text 的 `freeTextChanged` 是失焦时的临时提交事件，不持久化。由 `freeTextValues` 产生的 Resource Picker 默认筛选是纯派生状态；加载、导入或切换 Character Save 时直接从已保存的 Free Text 字符串重建，不新增 Derived Source Snapshot，也不重放输入事件。

`setTextPlaceholder` 的结果同样不进入 Character Data。其 Resource Picker 来源使用既有 Derived Source Snapshot，在加载后重建；Player 字段仍保存空字符串或实际输入，不保存占位文本。

Resource Picker selection 是 transient event，默认不保存 Resource Entry ID；Dependency 最终写入的 Sheet Values 才进入 Character Data。readOnlyDisplay 的派生内容、Current Page、Guide step、Browser search 和 Detail Overlay 都不持久化。

例外是 **Derived Source Snapshot**：当 Resource Picker 作为纯派生动作的 source 时，Character Data 自动保存该 Module 最近一次选择的 Resource Library ID 与有序 Entry ID。它只用于在加载、导入或切换 Character Save 后重建 `setVisibility`、Resource Picker 默认筛选和 `readOnlyDisplay` 内容，不是 Sheet Value，也不表示 Resource Picker 获得了可见或可编辑的持久选中状态。没有纯派生消费者的 Picker 不保存快照。

Resource Composer 不保存来源槽位快照；其稳定 Composite Resource 已属于 Character Data，足以作为纯派生重建来源。最终 visibility、默认查询与 readOnlyDisplay 内容仍不持久化。旧数据没有快照时按空记录处理；引用的 Library 或 Entry 已不存在时跳过该来源并报告 warning，不从可编辑 Sheet Value 反推。

`fillText` 写入的文本与 `fillCountable` 写入的 `{current,max}` 都是持久化 Sheet Values。`fillText` 的模板只在 Dependency 触发时生成普通文本；追加模式把新文本合并进自由输入 freeText/longText，Player 后续可继续自由编辑，不保存模板或 Resource Entry 引用。下拉 Free Text 只允许替换写入；列表外结果仍保留供 Player 查看并改选。`fillCountable` 未指定的成员保留原值；动态 max 属于 Player save，而不是对 System Package Module 配置的修改。

System Package cache 与 Character Saves 位于 IndexedDB，小指针/UI preference 位于 localStorage，Preview session 位于 sessionStorage。Character JSON 是跨设备恢复机制；为保证单文件可完整恢复，Player 上传图片直接嵌入 JSON。导出时顶层 `playerImages` 固定在最后，避免 base64 payload 打断前面的可读角色数据。HTML snapshot 是只读输出，不可导回编辑。
