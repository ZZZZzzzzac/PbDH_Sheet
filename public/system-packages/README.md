# System Package 静态示例约定

本目录只放随 Base Framework 一起发布、用于开发和验收的示例 System Package。

- 目录包命名使用 `kebab-case/`。
- 目录包根目录必须包含 `manifest.json`。
- `manifest.json` 声明 `pages`、`modules`，并可声明 `dependencies`、`resourceLibraries` 和 `characterCreationGuide`；图片放在 `assets/**` 自动发现。
- 目录源文件是唯一权威版本；测试按需生成 zip，不提交重复 zip。
- 文件内容保持 Author 可读格式，优先使用中文键名。
- 示例包必须通过 `src/domain/systemPackage.ts` 的结构校验。
- 不放运行时生成的 Character Data，不放测试输出。
- 用户上传包和用户缓存不放这里；后续由 Loader 和 IndexedDB 处理。

当前示例：

- `demo-minimal/`：最小可运行 starter。
- `demo/`：完整合同演示；覆盖矩阵见其 `README.md`。

故意损坏的包只放在 `tests/fixtures/system-packages/errors/`，不得随生产静态资源发布。

完整制作指南与接口参考见 [System Package 文档中心](../../docs/system-package/README.md)。
