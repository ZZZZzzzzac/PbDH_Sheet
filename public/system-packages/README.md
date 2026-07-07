# System Package 静态示例约定

本目录只放随 Base Framework 一起发布、用于开发和验收的示例 System Package。

- 文件命名使用 `kebab-case.json`。
- 文件内容保持作者可读格式，优先使用中文键名。
- 示例包必须通过 `src/domain/systemPackage.ts` 的结构校验。
- 不放运行时生成的 Character Data，不放测试输出。
- 真实上传包、zip 包和用户缓存不放这里；后续由 Loader 和 IndexedDB 处理。
