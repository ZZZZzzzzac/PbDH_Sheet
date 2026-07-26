# Architecture Decision Records

本目录只记录影响架构边界、数据合同、质量属性或演进路线的决定及其理由。当前系统如何工作见 [`../architecture.md`](../architecture.md)，System Package 当前精确合同见 [`../system-package/`](../system-package/README.md)。

## 状态约定

- **Accepted**：决定仍有效；若仅有部分条款被扩展或替代，在日期下用“修订”链接后续 ADR。
- **Superseded**：整体决定不再是当前方案，状态必须链接替代 ADR；历史正文保留。
- **Deprecated**：决定不应继续使用，但尚无单一替代 ADR。

ADR 编号递增且永不复用或重排。旧 ADR 不重写成新方案；勘误和范围说明可以追加，但方向变化必须由新 ADR 记录。

## 索引

| ADR | 决策 | 状态 / 后续关系 |
|---|---|---|
| [0001](0001-static-pwa-no-server-api.md) | Static PWA Without Server API | Superseded by ADR-0030 |
| [0002](0002-system-package-contract.md) | System Package Contract | Accepted；assets 条款由 ADR-0019 修订 |
| [0003](0003-system-package-validator.md) | System Package Validator Severity | Accepted |
| [0004](0004-dependency-engine-boundary.md) | Dependency Engine Boundary | Accepted |
| [0005](0005-validation-script-runner.md) | Validation Script Runner | Accepted |
| [0006](0006-local-storage-and-assets.md) | Local Storage And Assets | Accepted；玩家图片由 ADR-0028、PWA 由 ADR-0030 修订 |
| [0007](0007-card-instance-model.md) | Card Instance Model | Accepted |
| [0008](0008-zustand-state-management.md) | Zustand State Management | Accepted |
| [0009](0009-frontend-technology-baseline.md) | Frontend Technology Baseline | Accepted；PWA 前提由 ADR-0030 修订 |
| [0010](0010-module-scoped-style-overrides.md) | Module Scoped Style Overrides | Accepted；Countable marker 由 ADR-0027 修订 |
| [0011](0011-character-data-value-types.md) | Character Data Value Types | Accepted；Player Image 由 ADR-0028 扩展 |
| [0012](0012-sheet-renderer-owns-flow-layout.md) | Sheet Renderer Owns Flow Layout | Superseded by ADR-0014 |
| [0013](0013-declarative-character-creation-guide.md) | Declarative Character Creation Guide | Superseded by ADR-0015 |
| [0014](0014-html-layout-template-primary-layout.md) | HTML Layout Template Is the Primary Author Layout Model | Accepted |
| [0015](0015-character-creation-guide-as-spotlight-tour.md) | Character Creation Guide as a Spotlight Tour | Accepted；由 ADR-0021/0022 扩展 |
| [0016](0016-character-owned-composite-resources.md) | Character-owned Composite Resources | Accepted |
| [0017](0017-no-generic-dependency-replay-on-load.md) | 不在加载时通用重放依赖事件 | Accepted；追加最小 source snapshot 修订 |
| [0018](0018-layered-resource-extensions.md) | Layered Resource Extensions | Accepted |
| [0019](0019-source-scoped-image-discovery.md) | Source-scoped Image Discovery | Accepted |
| [0020](0020-readable-resource-identities.md) | Readable Resource Identities | Accepted |
| [0021](0021-guide-layout-region-target.md) | Guide Layout Region Target | Accepted |
| [0022](0022-guide-long-form-instructions-and-cross-page-targets.md) | Guide Long-form Instructions and Cross-page Targets | Accepted |
| [0023](0023-system-package-skins-own-package-scoped-presentation.md) | System Package Skins Own Package-scoped Presentation | Accepted |
| [0024](0024-system-packages-own-print-content-insets.md) | System Packages Own Print Content Insets | Accepted |
| [0025](0025-free-text-committed-dependency-event.md) | Free Text 失焦提交 Dependency Event | Accepted |
| [0026](0026-derived-text-placeholder.md) | Dependency 派生文本占位符 | Accepted |
| [0027](0027-countable-marker-descriptors.md) | Countable Marker Descriptors | Accepted |
| [0028](0028-embedded-player-images-in-character-data.md) | Embedded Player Images In Character Data | Accepted |
| [0029](0029-format-adapter-script-runner.md) | Format Adapter Script Runner | Accepted |
| [0030](0030-static-web-without-pwa-or-server-api.md) | Static Web Without PWA or Server API | Accepted；supersedes ADR-0001 |

## 新 ADR 模板

```text
# ADR-NNNN: Title

状态：Accepted | Superseded by ADR-NNNN (file name) | Deprecated
日期：YYYY-MM-DD

## 背景
## 决策
## 理由
## 代价
## 后续信号
```

如果 Accepted ADR 被局部扩展，在日期后增加“修订”说明，并把双向关系同步到本索引；不要把 `Accepted（……）` 等自由文本塞进状态字段。
