# ADR-0019: Source-scoped Image Discovery

状态：Accepted  
日期：2026-07-16

## 背景

System Package 当前要求在 `manifest.assets[]` 中逐项重复声明 Asset ID、路径和 MIME。大量卡图通常令 ID 与路径完全相同，增加 Author 工作量。Resource Extension 若复制同一合同，会让只想补充卡牌资源的 Author B 维护大段机械清单；若直接把图片转 base64 放进 JSON，又会放大体积和内存占用。

## 决策

System Package 与 ZIP Resource Extension 统一自动发现各自 `assets/**` 下的图片。Author Data 只使用来源内相对路径引用图片，不再声明 Asset manifest item 或 Author-defined Asset ID；`manifest.assets[]` 被移除，`readOnlyDisplay.资源ID` 改为 `资源路径`，Card Entry 和 HTML Layout Template 继续使用相对路径。

Normalized runtime 以“来源 ID + 规范化相对路径”标识图片。System Package 与每个 Resource Extension 拥有独立路径命名空间，因此不同来源可包含同名路径；Resource Entry 保留足够的来源信息，使 Card Definition Resolver 能在正确命名空间解析卡图。JSON Resource Extension 不携带图片，ZIP Extension 使用根 `extension.json` 与 `assets/**` 图片树；字体和其他二进制类型不属于 Resource Extension 合同。

## 理由

- 路径已经是 HTML、CSS 和大量 Card Entry 的自然引用，额外 Asset ID 没有提供足够价值。
- 自动发现消除大量重复声明，降低 Author 和 AI 生成包的成本。
- 来源隔离避免要求不同 Author 协调全局图片路径。
- 图片仍以 bytes/Blob 缓存和解析，不引入 base64 体积与内存开销。

## 代价

- Loader、Validator、Runtime Asset Resolver 和缓存模型必须携带来源命名空间。
- 现有 manifest、示例、测试和 Author 文档需要统一改写；项目不保留旧 Asset 声明兼容层。
- 未引用图片需要 warning，缺失或不安全路径需要 error，ZIP 仍需防止异常压缩包耗尽浏览器内存。

## 后续信号

- Author 需要字体、音频或其他非图片 Asset。
- 图片数量或包体积使全量发现与缓存无法满足浏览器内存目标。
- 同一来源需要多个逻辑 ID 指向同一图片路径。
