# manifest.json

固定路径：包根 `manifest.json`。

| 字段 | 类型 | 必填 | 默认/约束 | 处理 |
| --- | --- | --- | --- | --- |
| `ID` | string | 是 | 非空、稳定 | package identity |
| `名称` | string | 是 | 非空 | UI display |
| `版本` | string | 是 | 非空；Author version | cache/compat metadata |
| `schemaVersion` | string | 是 | 当前 `0.2.0`；不匹配 warning | schema compatibility |
| `pages` | path string | 是 | 安全相对路径 | Page JSON |
| `modules` | path string | 是 | 安全相对路径 | Module JSON |
| `shell` | object | 否 | `{html, css?}` | common Sheet Shell |
| `skins` | array | 否 | 至少一项 | bundled System Package Skins；见 [Skins](skins.md) |
| `defaultSkin` | string | 声明 Skin 时是 | 引用 `skins[].ID` | 默认表现 |
| `dependencies` | path string | 否 | — | Dependency array |
| `characterCreationGuide` | path string | 否 | — | Guide object |
| `resourceLibraries` | array | 否 | `[]` | `{ID, 名称, 路径}` |
| `validationChecks` | array | 否 | `[]` | `{ID, 脚本}` |

`shell.html/css`、所有 path、Library `路径` 和 Check `脚本` 都相对包根。未知 manifest 字段当前被 Zod object 丢弃，不应依赖透传。

```json
{
  "ID": "demo",
  "名称": "Demo",
  "版本": "1.0.0",
  "schemaVersion": "0.2.0",
  "pages": "pages.json",
  "modules": "modules.json",
  "dependencies": "dependencies.json",
  "resourceLibraries": [{ "ID": "classes", "名称": "职业", "路径": "resources/classes.json" }],
  "validationChecks": [{ "ID": "rules", "脚本": "checks/rules.js" }]
}
```

图片无需 manifest 声明；Loader 自动发现 `assets/**` 下的支持格式，Author 直接引用相对路径。

Skin item 的完整 `css`、`推荐框架配色` 与 `layoutOverrides` 字段见 [System Package Skins](skins.md)。
