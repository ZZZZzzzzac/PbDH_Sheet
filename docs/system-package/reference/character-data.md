# Character Data boundary

Character Data 是 Player-owned save，不是 System Package export。它保存 package identity/version、Sheet Values、Card Instance state 和 Player 上传图片；不复制 Resource Libraries、Layouts、Author Assets 或 Validation Scripts。

Sheet Value 默认是文本。Checkbox/countable/image/card state 使用框架需要的专门结构，但 Author 不通过 System Package 直接声明 Character Data schema。Module ID 是值的稳定 key；改 ID 会让旧存档无法自动对应。

freeText/longText 的 Restricted Markdown 只影响展示；Character Data 保存原始 Markdown 字符串，不保存渲染 HTML。Resource Values 与 `fillText` 同样保持原始字符串，不需要 schema migration。

Resource Picker selection 是 transient event，默认不保存 Resource Entry ID；Dependency 最终写入的 Sheet Values 才进入 Character Data。readOnlyDisplay 的派生内容、Current Page、Guide step、Browser search 和 Detail Overlay 都不持久化。

`fillText` 写入的文本与 `fillCountable` 写入的 `{current,max}` 都是持久化 Sheet Values。`fillCountable` 未指定的成员保留原值；动态 max 属于 Player save，而不是对 System Package Module 配置的修改。

System Package cache 与 Character Saves 位于 IndexedDB，小指针/UI preference 位于 localStorage，Preview session 位于 sessionStorage。Character JSON 是跨设备恢复机制；HTML snapshot 是只读输出，不可导回编辑。
