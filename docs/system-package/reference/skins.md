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

Skin 调整 Page 内部 Grid/Flex 时，主列宽应相对于固定 A4 内容区声明，优先使用 `%`、`fr`、`minmax(0, …)`。不要使用固定 `mm`/`px` 定义立绘栏、正文栏等内部主轨道，否则网页预览宽度变化时其占比会改变，打印结果会挤压相邻模块。物理单位只用于纸张盒、打印边距或确有物理尺寸语义的细节。Skin 的网页与打印验收应比较关键区域占 Page/父容器的比例。

Skin CSS 禁止 `@import`、`@font-face`、外部/绝对 URL。图片只能引用 System Package `assets/**` 下已发现的支持格式；字体只能使用带 fallback 的系统字体栈。

## 网页与打印的所见即所得合同

Base Framework 固定拥有无页内边距的 A4 打印页盒；Base Layout 或 Skin 负责声明 System Package 自己的内容边距。Skin 的“所见即所得”不是把任意宽度的 desktop 页面原样塞进 A4，也不是在打印时另做一套紧凑布局；它表示网页预览与打印在同一有效 A4 内容宽度下使用相同的结构、轨道比例、Module 尺寸、题眉和装饰。

- 如果网页 Page 默认可扩展到比 A4 更宽，而 Skin 的内容会因此在打印时重新换行或挤压，Skin 应让网页预览也使用真实 A4 页宽、相同 `box-sizing` 和相同页内 padding。不要等到 `@media print` 才缩窄 Page。
- 主列和嵌套列使用 `%`、`fr`、`minmax(0, …)`。推荐把可调比例放进 Skin 私有 CSS variables，保证 Author 只改一个入口，并同时影响网页与打印。
- 不要在 `@media print` 中隐藏题签、删除装饰、改变主列数量、把换行改成不换行，或用另一套 padding/字号掩盖 A4 溢出。若完整布局放不进 A4，应先调整网页与打印共享的 Grid/Flex、gap、装饰 padding 或 Author Data。
- Skin 不应固定 Module 拥有的几何。特别是 longText 的高度由 Module `行数`决定；不要在 Skin 中对 `[data-module-type="longText"] [data-part="input"]` 写 `height` 或 `max-height`。Marker Presentation 的槽位和输出策略同样由 Base Framework 与 Module 配置拥有。
- 打印会隐藏 Resource Picker 等交互控件。若 Picker 在 Grid/Flex 中占有独立轨道，打印规则应只回收这个已经消失的交互轨道，让相邻 freeText 延展；这属于输出补偿，不应改变页面主结构。
- 需要保留背景、渐变和颜色时，在 Skin 的 Page 根使用 `print-color-adjust: exact` 与 `-webkit-print-color-adjust: exact`。这只请求浏览器精确打印颜色，不改变布局合同。

打印隐藏 Picker 后回收轨道的典型写法：

```css
.picker-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 11mm;
}

@media print {
  .picker-field {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

这里 freeText 与 Picker 的 Module/DOM 均不改变；打印时 Framework 隐藏 Picker，Skin 只把剩余可见字段扩展到父容器宽度。HTML snapshot、输出准备态和浏览器打印都应验证这一行为，不能只在普通网页中切换 DevTools 的单一样式规则。

### 必须比较的验收信号

Skin 的网页与打印自动化验收至少应覆盖：

1. 每个打印 Page 的 `scrollWidth <= clientWidth` 且 `scrollHeight <= clientHeight`。
2. 网页与打印 Page 具有相同宽高比；以真实 A4 预览为目标时，页宽和页内 padding 也应一致。
3. 关键栏宽按“左栏宽 / 两栏宽度之和”等父容器内比例比较，不能只检查绝对像素。
4. 题眉换行、分区标题显示状态和关键 Grid/Flex 方向在网页与打印中一致。
5. 打印隐藏交互控件后，原相邻字段占满回收后的空间，不留下空白轨道。
6. longText 的不同 `行数`产生不同且符合 Module 配置的高度，Skin CSS 不覆盖其 `height/max-height`。

仅仅“没有产生第二张纸”不足以证明所见即所得；内容也可能被固定 `overflow: hidden` 静默裁切。验收必须同时检查 scroll/client 尺寸和关键区域几何。

## Effective HTML

每个位置独立计算：`Skin override ?? Base Layout Template`。Skin 可只覆盖一个 Page；其他 Page 与 Shell 回退 Base HTML。Base Layout CSS 始终先加载，Skin 的同一份 package-wide CSS 最后加载。

override 使用与 Base HTML 相同的 sanitizer。它可以增加 Static Layout Content 和改变 DOM/Grid/Flex，但对应 Page/Shell 的 `<pb-module>` ID 多重集合必须完全相同。Page/Shell 是模块的固定语义 owner；不能遗漏、重复或跨 owner 搬运。Shell override 需要一个 `pb-page-outlet`，不能改变 `data-print-page="true"` 数量。每个 Skin 的有效 Layout Region 仍需全包唯一，并覆盖 Guide 引用。

## Player preference

Player 在 Current System Package 声明的 Skin 中选择。偏好按 System Package ID保存在本地 UI storage，不进入 Character Data。保存的 ID在包升级后不存在时，Runtime 回退当前 `defaultSkin` 并显示非阻塞提示。

Framework Color Scheme 默认跟随 selected Skin 的 `推荐框架配色`；Player 可选择跟随 Skin、固定 Light 或固定 Dark。这个偏好不影响打印。

Author workflow 与检查表见[制作 System Package Skin](../author-guide/13-system-package-skins.md)。
