# Format Adapters

Format Adapter 是 System Package 提供的受限外部格式转换脚本。Base Framework 不内置游戏名、外部字段名、类型值或 Card 语义；System Package Script 负责语义转换，Base 负责文件安全、隔离执行、输出验证、确认与原生持久化管线。

manifest 可用 `resourceFormatAdapters` 与 `characterFormatAdapters` 指向两个 JSON 数组。现行示例见 `public/system-packages/daggerheart-core/adapters/`。

## 声明与执行边界

共同 JSON 字段：

- `ID`、`名称`：同类 Adapter 内唯一。
- `载体`：JSON object/array、带明确首尾 marker 的 embedded JSON，或受 Package VFS 限制的 ZIP JSON members。
- `导入脚本`：System Package 内安全相对路径，脚本用 CommonJS `module.exports = function (input) { ... }` 返回结果。
- Character Adapter 可额外声明 `导出脚本` 与 `导出文件后缀`。

`检测`只支持安全路径的存在/严格相等规则。零命中为 unsupported；多 Adapter 命中必须由 Player 选择。HTML carrier 只提取并 `JSON.parse` 文本，不创建 DOM、不执行来源脚本或加载资源。

Adapter Script 在独立 Web Worker 中运行，有固定超时。输入先结构化克隆并冻结；脚本没有 UI、DOM、存储、当前 Character Save 或 Effective Resource Catalog 的可变引用。脚本语法在 System Package 加载时校验，运行异常、超时及非法输出均由 Base 生成稳定诊断。

## Resource Import Script

输入包含 `document`、`fileName`、ZIP `assets`（`{ path, bytes }[]`）副本以及当前 `resourceLibraries` 只读副本。脚本返回：

```js
{
  name: "External Package",
  version: "1.0",
  resourceLibraries: [/* native Resource Library contributions */],
  retainedAssets: [{ sourcePath: "images/a.webp", targetPath: "assets/external/a.webp" }],
  diagnostics: [],
  counts: {
    sourceEntries: 1, convertedEntries: 1, skippedEntries: 0,
    convertedFields: 4, skippedFields: 0,
    boundImages: 1, orphanImages: 0
  }
}
```

Base 验证保留资产确实存在、路径安全且目标不重复，并从 Current System Package ID、Adapter ID 与规范化名称生成稳定 Extension ID。转换结果随后进入原生 Resource Extension schema、冲突检查、确认、存储和 Effective Resource Catalog 管线。脚本不能直接安装 Extension。

Resource Adapter 仅支持导入；外部资源格式导出不在合同内。

## Character Import Script

输入包含 `document`、`fileName` 与当前有效 `resourceLibraries` 只读副本。脚本返回：

```js
{
  values: { "character-name": "Ada", hp: { current: 3, max: 6 } },
  cards: [{ tableModuleId: "character-card-table", state: "配置", libraryId: "domain-cards", entryId: "card-id" }],
  images: [{ moduleId: "character-avatar", name: "Avatar", dataUrl: "data:image/webp;base64,..." }],
  suggestedSaveName: "Ada",
  skippedFields: 0, skippedCards: 0, skippedImages: 0,
  diagnostics: []
}
```

Base 验证每个 Module ID 与值类型、Card Table/Library/Entry 引用和图片 data URL，再生成稳定 Card Instance / Player Image ID，创建原生 Character Data，并重新走原生解析与保存管线。脚本可在传入的有效 Catalog 中匹配 Extension 贡献的 Card，但不能安装资源或修改 Catalog。

有跳过或 warning 的转换先显示报告；确认后才创建并选择新的 Character Save，取消不改变当前存档。

## Character Export Script

导出输入包含 `adapterId`、原生 `characterData` 与有效 `resourceLibraries` 副本。脚本返回 `document`，并可返回 `exportedFields`、`skippedFields`、`exportedCards`、`skippedCards`、`exportedImages`、`skippedImages` 与 `diagnostics`。Base 验证结果为可序列化对象；有损结果确认后才下载 JSON。原生 PbDH JSON 与只读 HTML snapshot 使用原有稳定输出合同。

复杂匹配、分组、外部字段组合、三态槽位及互斥语义都属于包脚本的 Implementation Depth，不应扩展 Base 为新的转换 DSL。Base 的稳定 Seam 只有 Carrier 输入与上述输出合同。
