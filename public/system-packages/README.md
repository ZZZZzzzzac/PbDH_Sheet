# 内置 System Packages

本目录只放随 Base Framework 一起发布的真实 System Package。它们可以作为完整实现参考，但接口合同只在 [`docs/system-package/`](../../docs/system-package/README.md) 定义。

- 目录包命名使用 `kebab-case/`。
- 目录包根目录必须包含 `manifest.json`。
- `manifest.json` 声明 `pages`、`modules`，并可声明 `dependencies`、`resourceLibraries` 和 `characterCreationGuide`；图片放在 `assets/**` 自动发现。
- 目录源文件是唯一权威版本；测试按需生成 zip，不提交重复 zip。
- 文件内容保持 Author 可读格式，优先使用中文键名。
- 发布包必须通过 Loader 与 `src/domain/systemPackage.ts` 的结构校验。
- 不放运行时生成的 Character Data，不放测试输出。
- 用户上传包和用户缓存不放这里；后续由 Loader 和 IndexedDB 处理。

当前发布包：

- `daggerheart-core/`
- `tttri/`
- `witchy/`
- `heart-of-hopefind/`
- `hows-my-driving/`

新包从 [`templates/system-package-minimal/`](../../templates/system-package-minimal/) 起步。复杂覆盖和故意损坏的包只放在 `tests/fixtures/system-packages/`，不得随生产静态资源发布。

完整制作指南与接口参考见 [System Package 文档中心](../../docs/system-package/README.md)。
