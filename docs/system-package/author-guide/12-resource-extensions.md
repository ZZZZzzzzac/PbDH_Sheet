# 制作 Resource Extension

只增加资源时，不复制或修改原 System Package。制作一个目标明确的 Resource Extension，让 Player 在原 Sheet Tool 的“系统包 → 资源管理器”上传。

1. 确认目标 System Package `ID` 和现有 Resource Library `ID`。
2. 把同类 Entries 放进对应 contribution；真正不同的类型使用新 Library ID。
3. 给 Extension、每个 Library contribution 和每条 Entry 写稳定 ID。缺失 ID 虽可由框架补全，但必须下载规范化产物并以它作为后续源文件。
4. 纯文本发布 JSON；有图片时发布根含 `extension.json` 与 `assets/**` 的 ZIP。
5. 不按名称、字段形状或 `类型` 期待 Runtime 自动分类；`resourceLibraries` 必须显式。

The Void 示例位于 `public/resource-extensions/the-void-20260710.json`：一个文件同时向 `classes`、`subclasses`、`ancestries`、`communities`、`domain-cards` 贡献 Entries，并创建独立 `void-transformations`。前五类由现有 Picker 接收，独立库由 System Package 中 Author-defined `资源库: "其他"` Picker 接收。制作输入是 `The-Void_20260710_zzz.json`，SHA-256 为 `07B73071E41897B1F629F7CF912BC1E7E602E35636888F3FE44F0FE4A5418462`；转换测试固定 105 条分组计数与关键字段，不把按 `类型` 分类逻辑放进 Runtime。

完整字段、冲突和 ZIP 规则见 [Resource Extension Reference](../reference/resource-extensions.md)。
