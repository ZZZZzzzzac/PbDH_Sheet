# ADR-0028: Embedded Player Images In Character Data

状态：Accepted
日期：2026-07-24

## 背景

玩家上传的头像、立绘必须随角色导出文件跨设备恢复。将图片 Blob 与 Character Data JSON 分离，需要额外的 ZIP 容器、导入分支和文件关联规则。

## 决策

- 废弃 ADR-0006 的玩家图片分离存储契约。
- Character Data 允许在顶层 `playerImages` 中保存玩家上传图片的 base64 data URL。
- Sheet Value 只保存 `imageId` 引用，不在各模块值中重复图片数据。
- 导出 JSON 时，顶层 `playerImages` 必须位于最后，避免大块 base64 打断前面的可读角色数据。
- System Package 图片仍只保存稳定引用，不复制进 Character Data。

## 理由

- 保持单个 JSON 文件即可完整备份、导入和跨设备恢复角色。
- 避免只为分离图片引入 ZIP 格式及双重导入导出流程。
- 集中存放图片可避免同一图片 payload 在 Character Data 内重复。

## 代价

- 带玩家图片的 Character Data JSON 会明显增大。
- base64 比原始二进制体积更大。
- 读写 Character Data 时需要解析完整图片字符串。

## 后续信号

只有当常见角色图片导致导入、导出或浏览器内存出现可测量问题时，才重新评估二进制容器；不因 JSON 外观单独增加 ZIP。
