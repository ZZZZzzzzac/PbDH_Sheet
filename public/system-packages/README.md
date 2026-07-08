# System Package 静态示例约定

本目录只放随 Base Framework 一起发布、用于开发和验收的示例 System Package。

- 目录包命名使用 `kebab-case/`。
- 目录包根目录必须包含 `manifest.json`。
- `manifest.json` 声明 `pages`、`modules` 和 `assets` 路径。
- zip 包是目录包内容的压缩结果，zip 根目录应直接包含 `manifest.json`。
- 文件内容保持 Author 可读格式，优先使用中文键名。
- 示例包必须通过 `src/domain/systemPackage.ts` 的结构校验。
- 不放运行时生成的 Character Data，不放测试输出。
- 用户上传包和用户缓存不放这里；后续由 Loader 和 IndexedDB 处理。

HTML Layout Template 写法见 [System Package HTML Layout Template 接口](../../docs/system-package-html-layout-template.md)。
