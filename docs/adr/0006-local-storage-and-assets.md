# ADR-0006: Local Storage And Assets

状态：Superseded by ADR-0028
日期：2026-07-06

## 背景

System Package 可能包含大量卡牌图片。正常规模约数十 MB，极端可能数百 MB。Character Data 通常较小，主要是 JSON 文本和少量玩家头像/立绘图片。

## 决策

第一版使用浏览器本地存储分层：

- `localStorage` 只存当前 System Package ID、当前 Character ID、少量 UI 设置。
- IndexedDB 存 System Package 缓存、Character Saves、玩家上传图片和资源索引。
- 图片不转 base64 存入 Character Data。
- System Package 图片按需显示和解码，不主动渲染全部图片。
- 不强制 Author 提供缩略图。
- 卡牌使用原图显示。
- 打印使用当前显示图。
- 图片加载失败时显示文字 fallback。
- PWA 只缓存应用壳，不缓存用户导入的 System Package。

## 理由

- `localStorage` 容量小且同步阻塞，不适合大资源。
- IndexedDB 适合浏览器内大结构化数据和 Blob。
- 按需显示图片能降低移动端内存和首屏压力。
- 不强制缩略图，降低 Author 制作 System Package 的成本。

## 代价

- 浏览器清理站点数据会丢失缓存。
- System Package 缓存丢失后，玩家需要重新上传 zip。
- 角色数据仍需通过 JSON 导出备份保证可恢复。
- 大图片包在低端移动设备上仍可能有性能问题。

## 后续信号

出现以下信号时，升级资产策略：

- 常见 System Package 超过 100 MB。
- 卡牌列表滚动或打印在移动端明显卡顿。
- Author 普遍愿意提供缩略图。
- 需要区分 display asset 和 print asset。

## 追加说明（2026-07-07）

上文的“图片不转 base64 存入 Character Data”只针对 System Package 内的系统资源，例如卡图、规则插图、只读展示图片等。这些资源属于 System Package，不属于玩家角色数据。Character Data 只保存对这些系统资源的稳定引用；玩家在新电脑导入 Character Data 后，只要重新加载同一个 System Package，就应能通过资源引用显示卡图等系统图片。

玩家上传的头像、立绘等图片属于玩家数据，不是 System Package 资源。因此它们必须随 Character Data 一起可恢复。实现上可以把图片 Blob 存在 IndexedDB，并在 Character Data 中保存引用；但导出、迁移或换设备导入时，导出的玩家数据必须包含足够的信息恢复这些头像/立绘，不能只依赖旧浏览器里的本地 IndexedDB 记录。
