# ADR-0006: Local Storage And Assets

状态：Accepted
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
