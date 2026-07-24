# Format Adapters

Format Adapter 是 System Package Author Data。它声明外部资源包或人物卡如何映射到 Base Framework 的原生 Resource Extension / Character Data；Base 不内置任何游戏名、外部字段名、类型值或 Card 语义。

manifest 可用 `resourceFormatAdapters` 与 `characterFormatAdapters` 指向两个 JSON 数组。完整现行示例见 `public/system-packages/daggerheart-core/adapters/`。

## 共同边界

- 所有路径都是 `(string | non-negative integer)[]`，逐段读取或写入 own property；不接受点号表达式、原型链、脚本或任意求值。
- Carrier 可声明 JSON object/array、带明确首尾 marker 的 embedded JSON，或受 Package VFS 安全限制的 ZIP JSON members。HTML carrier 只提取并 `JSON.parse` 文本，不创建 DOM、不执行脚本。
- `检测` 是路径存在/严格相等规则。零命中为 unsupported；多 Adapter 命中必须由 Player 明确选择，不能按顺序猜测。
- Adapter ID 在同类数组内唯一。所有 Module、Card Table 与已有 Resource Library 引用在包加载时校验。

## Resource Format Adapter

Adapter 声明 package name/version 来源、一个 `记录路径` 或多个带固定类型值的 `记录源`、类型与 Entry ID 路径、已知类型路由及显式字段投影。未知类型只能在 `未知类型.启用` 时生成独立 Library；`运行时字段`在投影前移除。

ZIP Adapter 可用 `图片`把来源 ID 绑定到包内图片。未绑定图片不进入规范化 Extension，并作为 orphan 计数报告。`分组`可按 group key + slot 合并多条记录；缺 slot 是 warning，同组同 slot 重复会拒绝该组，图片按声明的 slot 优先级选择。

转换先生成原生 Resource Extension，再走同一 schema、冲突检查、Effective Catalog 和存储管线。外部转换总是显示来源/转换/跳过/图片计数与诊断；确认前、取消后均不修改目录或 IndexedDB。规范化 JSON/ZIP 可作为之后的稳定更新源。

## Character Format Adapter

导入声明包括文本、Countable、Player Image 和 Card 映射。Countable 支持数字、truthy/checked 数组与 tri-state 数组，并可从固定值、来源路径、数组长度或可用槽数取得 max。tri-state 的固定语义是 `0 = 空`、`1 = 满`、`2 = 不可用`：current 为 1 的数量，`availableCount` max 为 0 与 1 的总数；反向导出使用相同编码。图片只接受支持的 `data:image/*;base64` URL，并写入 Character Data 顶层 `playerImages`。

Card 按声明顺序尝试 external ID、结构化字段组合、唯一名称、规范化后的完整描述精确匹配；不做模糊匹配。非 `fields` 规则可在来源或 Resource 字段上声明 `fileStem` 转换，从 `/` 或 `\\` 分隔的路径取不含最后扩展名的文件名，再进行精确比较；这适合外部格式以卡图路径代表卡牌的情况。空来源值不参与匹配；某一级多命中即报告 ambiguous 并跳过。查找范围是声明的 Libraries，运行时传入 Effective System Package，因此已安装 Extension 的 Entries 也可命中，但人物卡导入本身不会安装资源包。

有跳过或 warning 的人物卡先显示报告；确认后才创建并选择新的 Character Save，取消不改变当前存档。

可选 `导出`声明反向字段、Countable、图片与 Card 投影。Base 从当前 System Package 动态列出可导出格式；无法表达的字段/Card/图片进入 lossy report，Player 确认后才下载 JSON。原生 PbDH JSON 与只读 HTML snapshot 仍使用原有稳定输出合同。
