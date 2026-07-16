# Resource Extension 发布产物

本目录保存可直接上传到 Resource Manager 的示例或正式 Resource Extension。

## 结构约定

- 纯文本扩展使用根目录下的 `.json` 文件。
- 带图片扩展使用 `.zip`，根必须是 `extension.json`，图片只放 `assets/**`。
- 文件名使用小写 kebab-case；需要日期时使用 `YYYYMMDD`。
- 每个发布产物必须具有显式 Extension、Library contribution 与 Entry ID；不得依赖 Runtime 按 `类型` 自动分类。
- 固定验收产物由自动化测试校验计数、字段映射和目标 System Package。

不要在此保存原始混合卡包、临时转换脚本或缺 ID 的中间文件。
