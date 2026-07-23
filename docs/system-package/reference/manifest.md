# manifest.json

固定路径：包根 `manifest.json`。

| 字段 | 类型 | 必填 | 默认/约束 | 处理 |
| --- | --- | --- | --- | --- |
| `ID` | string | 是 | 非空、稳定 | package identity |
| `名称` | string | 是 | 非空 | UI display |
| `版本` | string | 是 | 非空；Author version | cache/compat metadata |
| `schemaVersion` | string | 是 | 当前 `0.2.0`；不匹配 warning | schema compatibility |
| `加载展示` | object | 否 | `{标语, 强调色}` | Base Framework 加载层的声明式文案与强调色 |
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
  "加载展示": { "标语": "群星正在校准人物卡……", "强调色": "#63bfd1" },
  "pages": "pages.json",
  "modules": "modules.json",
  "dependencies": "dependencies.json",
  "resourceLibraries": [{ "ID": "classes", "名称": "职业", "路径": "resources/classes.json" }],
  "validationChecks": [{ "ID": "rules", "脚本": "checks/rules.js" }]
}
```

图片无需 manifest 声明；Loader 自动发现 `assets/**` 下的支持格式，Author 直接引用相对路径。

## 加载展示

`加载展示` 只定制 Base Framework 提供的加载层，不允许 System Package 注入 HTML、CSS、脚本、动画或外部 URL：

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `标语` | string | 是 | 去除首尾空白后 1–80 个字符 |
| `强调色` | string | 是 | 六位十六进制颜色，例如 `#63bfd1` |

加载层、进度条、进度文字和可访问性语义由 Base Framework 统一提供。预制 System Package 的进度表示完成读取的元数据文件比例；图片保持按需加载，不计入切换进度。省略 `加载展示` 时，Framework 使用默认标语和强调色。在 manifest 尚不可用的上传或恢复阶段，也使用 Framework 默认值。

Skin item 的完整 `css`、`推荐框架配色` 与 `layoutOverrides` 字段见 [System Package Skins](skins.md)。
