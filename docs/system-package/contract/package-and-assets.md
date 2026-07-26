# Package 与资产合同

## 包根与 manifest

包是目录或 zip。根目录必须含 `manifest.json`；所有路径相对包根，使用 `/`，不得是绝对路径、URL、盘符路径或包含 `..`。

`manifest.json` 必填：

```json
{
  "ID": "my-system",
  "名称": "我的系统",
  "版本": "0.1.0",
  "schemaVersion": "0.2.0",
  "pages": "pages.json",
  "modules": "modules.json"
}
```

可选入口包括 `shell`、`skins`、`defaultSkin`、`resourceLibraries`、`dependencies`、`characterCreationGuide`、`validationChecks`、`resourceFormatAdapters` 与 `characterFormatAdapters`。精确声明形状见本文件下方自动生成部分；声明了就必须存在，未声明的常规图片仍可从 `assets/**` 发现。

manifest 可用 `加载展示` 提供不依赖包 CSS 的加载页品牌：`标语`（1–80 字）与六位十六进制 `强调色`。

## 加载管线

1. 归一化目录或 zip 为只读虚拟文件系统。
2. 校验路径安全、文件数量、单文件与展开体积安全上限。
3. 解析 manifest 和被声明 JSON/HTML/CSS/脚本。
4. 将相对文件内容装配为运行时 `SystemPackage`。
5. Validator 检查结构、ID、引用、模板字段、脚本语法与跨文件语义。
6. 仅验证成功的对象进入预览或缓存。

安全上限不是资产预算。发布前应另行测量文件数、展开字节与打包字节。

具体数值由本文件下方从 VFS/Worker 常量自动生成。当前没有独立“单文件目标大小”；总量上限仍只是拒绝恶意或意外输入的安全阈值，不代表可接受的发布体积。

## 推荐目录

```text
my-system/
├─ manifest.json
├─ pages.json
├─ modules.json
├─ layouts/
├─ assets/
├─ resources/       # 可选
├─ dependencies.json# 可选
├─ guides/          # 可选
├─ checks/          # 可选
├─ skins/           # 可选
└─ adapters/        # 可选
```

目录名只是组织约定；入口以 manifest 声明为准，`assets/**` 除外。

## 资产

- 运行时资产放 `assets/**`，引用也必须写完整包内路径，如 `assets/cards/sword.webp`。
- Loader 为资产创建包作用域 URL；包 JSON/HTML/CSS 不应假设网站根路径。
- 图片应缩放至实际展示需求、去元数据、去重，优先 WebP/AVIF；仅在确需无损时使用 PNG。
- SVG 必须是可信静态素材；不可借资产执行脚本。
- 不提交原始源素材、无损母版、生成中间物、重复 zip 或大段 base64。
- CSS 中资源路径仍相对包根合同解析，不依赖当前页面 URL。

## 稳定身份与版本

Package、Page、Module、Resource Library、Resource Entry、Dependency、Check、Guide Step 与 Skin 的 ID 都是持久引用。已发布后不要为了显示名称变化而修改 ID。`版本`描述包内容版本；`schemaVersion`描述框架接口版本，两者不可混用。

## schemaVersion 兼容策略

- 当前 Author 合同版本是 `0.2.0`；生成 Schema 的 `$id` 包含该版本。
- Loader 会尝试读取不同版本并产生 compatibility warning，但这不承诺旧字段仍受支持；当前结构校验仍会正常执行。
- 只增加可选字段、诊断或展示 hook 可在兼容版本内完成；改变必填性、移除/重命名字段、改变持久语义或稳定 Skin hook 必须提高 schemaVersion。
- 提高 schemaVersion 时必须同时更新生成 Schema、字段参考、最小模板、可执行例子、Validator 测试和迁移说明。
- 已发布包仍依赖旧版本时，应提供明确迁移器或兼容层，不能只让作者从错误信息猜测升级步骤。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### manifest.json

包身份、入口文件、资源库、检查脚本、Shell 与 Skins 的唯一根声明。

语义约束：

- 文件固定命名为 manifest.json 并位于包根。
- schemaVersion 与当前框架版本不一致时允许加载但产生兼容性 warning。
- defaultSkin 必须引用 skins 中的 ID；所有声明路径必须存在且保持在包根内。
- assets 不在 manifest 中枚举；受支持图片从 assets/** 自动发现。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 包身份、入口文件、资源库、检查脚本、Shell 与 Skins 的唯一根声明。 |
| ID | 是 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| 版本 | 是 | string | 最短 1 |
| schemaVersion | 是 | string | 最短 1 |
| 加载展示 | 否 | object | — |
| 加载展示.标语 | 是 | string | 最短 1；最长 80 |
| 加载展示.强调色 | 是 | string | pattern: ^#[0-9a-f]{6}$ |
| pages | 是 | string | 最短 1 |
| modules | 是 | string | 最短 1 |
| shell | 否 | object | — |
| shell.html | 是 | string | 最短 1 |
| shell.css | 否 | string | 最短 1 |
| skins | 否 | array | 最少项 1 |
| skins[] | 是 | object | — |
| skins[].ID | 是 | string | 最短 1 |
| skins[].名称 | 是 | string | 最短 1 |
| skins[].css | 是 | string | 最短 1 |
| skins[].推荐框架配色 | 是 | "light" \| "dark" | — |
| skins[].layoutOverrides | 否 | object | — |
| skins[].layoutOverrides.shell | 否 | object | — |
| skins[].layoutOverrides.shell.html | 是 | string | 最短 1 |
| skins[].layoutOverrides.pages | 否 | array | 最少项 1 |
| skins[].layoutOverrides.pages[] | 是 | object | — |
| skins[].layoutOverrides.pages[].ID | 是 | string | 最短 1 |
| skins[].layoutOverrides.pages[].html | 是 | string | 最短 1 |
| defaultSkin | 否 | string | 最短 1 |
| dependencies | 否 | string | 最短 1 |
| characterCreationGuide | 否 | string | 最短 1 |
| questionnaireCharacterCreation | 否 | object | — |
| questionnaireCharacterCreation.ID | 是 | string | 最短 1 |
| questionnaireCharacterCreation.名称 | 是 | string | 最短 1 |
| questionnaireCharacterCreation.html | 是 | string | 最短 1 |
| resourceFormatAdapters | 否 | string | 最短 1 |
| characterFormatAdapters | 否 | string | 最短 1 |
| assets | 否 | unknown | — |
| resourceLibraries | 否 | array | — |
| resourceLibraries[] | 是 | object | — |
| resourceLibraries[].ID | 是 | string | 最短 1 |
| resourceLibraries[].名称 | 是 | string | 最短 1 |
| resourceLibraries[].路径 | 是 | string | 最短 1 |
| validationChecks | 否 | array | — |
| validationChecks[] | 是 | object | — |
| validationChecks[].ID | 是 | string | 最短 1 |
| validationChecks[].脚本 | 是 | string | 最短 1 |

### 运行时安全上限

安全上限用于拒绝恶意或意外输入，不是发布体积目标。数值直接来自 VFS 与 Worker 常量。

| 项目 | 当前值 |
| --- | ---: |
| zip 压缩体积 | 128 MiB (134217728 bytes) |
| 展开后或目录总字节 | 512 MiB (536870912 bytes) |
| 文件数 | 4096 |
| zip 展开/压缩比 | 250:1 |
| Package Script Worker 超时 | 3000 ms |

当前没有独立单文件上限；文件仍受总字节、文件数、浏览器内存和资产优化政策约束。

<!-- END GENERATED CONTRACT -->
