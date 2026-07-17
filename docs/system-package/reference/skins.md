# System Package Skins

A System Package Skin 是 System Package 内置的可切换表现层。它不属于 Character Data，也不能影响 Base Framework-owned UI、依赖规则、检查或游戏行为。

## manifest contract

`skins` 可选；未声明时，包继续使用现有 Base Layout HTML/CSS。声明后必须同时提供有效的 `defaultSkin`。

```json
{
  "skins": [
    {
      "ID": "plain",
      "名称": "简洁",
      "css": "skins/plain.css",
      "推荐框架配色": "light",
      "layoutOverrides": {
        "pages": [
          { "ID": "main", "html": "skins/plain/main.html" }
        ]
      }
    }
  ],
  "defaultSkin": "plain"
}
```

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `skins` | array | 否 | 声明时至少一项；ID 全包唯一 |
| `skins[].ID` | string | 是 | 非空、稳定的 Skin identity |
| `skins[].名称` | string | 是 | Player-facing display name |
| `skins[].css` | path | 是 | 包根相对 CSS 路径 |
| `skins[].推荐框架配色` | `light \| dark` | 是 | Framework Color Scheme 默认建议 |
| `skins[].layoutOverrides` | object | 否 | 可选 Shell/Page HTML override |
| `layoutOverrides.shell.html` | path | 否 | 只能覆盖已存在的 Base Sheet Shell |
| `layoutOverrides.pages` | array | 否 | `{ID, html}`；每个 ID 必须引用现有 Page且不能重复 |
| `defaultSkin` | string | 有 Skin 时是 | 必须引用一个已声明 Skin ID |

Loader 将 `css` 读取为 Normalized System Package 中的 `cssContent`。所有已声明 Skin 都会在包加载时校验；不能把损坏 Skin 留到 Player 选择时再处理。

## CSS scope 与 cascade

有效顺序固定为：

1. Base Framework Sheet Module defaults
2. Base Shell/Page Layout CSS
3. selected Skin package-wide CSS

Renderer 将 Skin CSS scope 到 Current System Package 根节点。普通选择器只能命中该包内部；`:scope` 表示包根本身。Skin 可以使用稳定的 Page、module 和 part 选择面，但不能依赖 React 内部 class 或 DOM 实现细节。

Skin CSS 禁止 `@import`、`@font-face`、外部/绝对 URL。图片只能引用 System Package `assets/**` 下已发现的支持格式；字体只能使用带 fallback 的系统字体栈。

## Effective HTML

每个位置独立计算：`Skin override ?? Base Layout Template`。Skin 可只覆盖一个 Page；其他 Page 与 Shell 回退 Base HTML。Base Layout CSS 始终先加载，Skin 的同一份 package-wide CSS 最后加载。

override 使用与 Base HTML 相同的 sanitizer。它可以增加 Static Layout Content 和改变 DOM/Grid/Flex，但对应 Page/Shell 的 `<pb-module>` ID 多重集合必须完全相同。Page/Shell 是模块的固定语义 owner；不能遗漏、重复或跨 owner 搬运。Shell override 需要一个 `pb-page-outlet`，不能改变 `data-print-page="true"` 数量。每个 Skin 的有效 Layout Region 仍需全包唯一，并覆盖 Guide 引用。

## Player preference

Player 在 Current System Package 声明的 Skin 中选择。偏好按 System Package ID保存在本地 UI storage，不进入 Character Data。保存的 ID在包升级后不存在时，Runtime 回退当前 `defaultSkin` 并显示非阻塞提示。

Framework Color Scheme 默认跟随 selected Skin 的 `推荐框架配色`；Player 可选择跟随 Skin、固定 Light 或固定 Dark。这个偏好不影响打印。

Author workflow 与检查表见[制作 System Package Skin](../author-guide/13-system-package-skins.md)。
