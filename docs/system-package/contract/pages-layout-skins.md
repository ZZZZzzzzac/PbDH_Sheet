# Pages、Layout、Shell 与 Skins 合同

## Pages

`pages.json` 是非空数组。每页必需 `ID`、`名称` 与 `layout`，可选 `默认隐藏`、`打印`。Layout 类型当前只有 `htmlTemplate`；源文件中用 `html` / `css` 路径声明，Loader 装配为 `htmlContent` / `cssContent`。

页面负责内容语义和 A4 几何。需要打印的页面应在自身 `:scope` 定义宽度、边距和内容 inset，并在屏幕预览与 `@media print` 下验证。Base 不猜测包的纸张布局。

## HTML Layout

Layout 是经过过滤的 HTML/CSS 片段，不是任意网页。

完整 allowlist、CSS 禁止项和承诺稳定的 Skin hooks 见本文件下方自动生成部分。

- 用 `<pb-module id="character-name"></pb-module>` 放置模块；ID 必须存在。
- 可用语义化容器、标题、段落、列表、表格等安全静态 HTML。
- 禁止脚本、事件属性、iframe、表单控件和绕过框架状态的交互。
- 作者 CSS 应作用于包片段内的类或 `:scope`，避免污染 Base UI。
- 交互、持久化、可访问名称与模块状态由 Base 组件负责。

## Shell

Shell 是包级外壳，可用 `<pb-page-outlet></pb-page-outlet>` 指定当前 Page 的挂载点。Shell 适合固定导航、页眉、装饰和跨页结构；没有 Shell 时 Base 使用默认外壳。Shell 不能复制页面数据，也不能自己实现路由或 Character Data 写入。

## Skins

Skin 是同一 System Package 的包作用域展示变体，不改变模块、资源或 Character Data 语义。每个 Skin 包含：

- `ID`、`名称`
- CSS 文件，装配为 `cssContent`
- `推荐框架配色`: `light` 或 `dark`
- 可选 `layoutOverrides`：替换 Shell HTML 和/或指定 Page HTML

manifest 可用 `defaultSkin` 指定默认项；它必须引用已声明 Skin。Layout Override 必须保留原页面需要的 `<pb-module>`，Shell override 必须保留 `<pb-page-outlet>`。

Skin CSS 只覆盖包作用域呈现，不修改 Base 工具栏、弹窗或全局变量。常用主题变量、可覆盖选择器和完整结构以当前发布包为例；优先从原 Layout 的稳定类名扩展，避免复制整份内容。

## 可访问性与打印检查

- 标签隐藏不等于移除可访问名称。
- 图片必须提供有意义的替代文本，纯装饰图应明确为空替代。
- 键盘焦点、对比度、放大和触屏操作均应可用。
- 在 A4 预览检查尺寸、分页、overflow、背景和 Skin override。
- Layout 与 Skin 不应改变数据含义；换 Skin 后 Character Data 必须完全相同。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Pages author source

Page 身份、导航/打印标志和 HTML/CSS Layout 源文件。

语义约束：

- Page ID 在包内唯一；layout.html 与可选 layout.css 必须存在。
- Layout 中引用的 pb-module ID 必须存在；打印页面几何由包 CSS 负责。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | array | 最少项 1；Page 身份、导航/打印标志和 HTML/CSS Layout 源文件。 |
| $[] | 是 | object | — |
| $[].ID | 是 | string | 最短 1 |
| $[].名称 | 是 | string | 最短 1 |
| $[].默认隐藏 | 否 | boolean | 默认 false |
| $[].打印 | 否 | boolean | 省略时跟随该 Page 的运行时可见性。 |
| $[].layout | 是 | object | — |
| $[].layout.类型 | 是 | "htmlTemplate" | — |
| $[].layout.html | 是 | string | 最短 1 |
| $[].layout.css | 否 | string | 最短 1 |

### Loaded Page runtime shape

Loader 解析 HTML/CSS 后交给 Validator/Renderer 的 Page。

语义约束：

- Author 不直接编写 htmlContent/cssContent；它们由源文件装配。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；Loader 解析 HTML/CSS 后交给 Validator/Renderer 的 Page。 |
| ID | 是 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 打印 | 否 | boolean | 省略时跟随该 Page 的运行时可见性。 |
| layout | 是 | object | 未知字段不属于合同 |
| layout.类型 | 是 | "htmlTemplate" | — |
| layout.htmlContent | 是 | string | 最短 1 |
| layout.cssContent | 否 | string | — |

### Skin author source

Skin CSS 与可选 Shell/Page HTML override 源路径。

语义约束：

- Page override 必须保留 Base Layout 的完整 Module ID 集合。
- Shell override 必须保留恰好一个 pb-page-outlet 和原打印页所有权。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | Skin CSS 与可选 Shell/Page HTML override 源路径。 |
| ID | 是 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| css | 是 | string | 最短 1 |
| 推荐框架配色 | 是 | "light" \| "dark" | — |
| layoutOverrides | 否 | object | — |
| layoutOverrides.shell | 否 | object | — |
| layoutOverrides.shell.html | 是 | string | 最短 1 |
| layoutOverrides.pages | 否 | array | 最少项 1 |
| layoutOverrides.pages[] | 是 | object | — |
| layoutOverrides.pages[].ID | 是 | string | 最短 1 |
| layoutOverrides.pages[].html | 是 | string | 最短 1 |

### Loaded Skin runtime shape

Loader 装配内容后的 Skin。

语义约束：

- Author 不直接编写 cssContent/htmlContent。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；Loader 装配内容后的 Skin。 |
| ID | 是 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| cssContent | 是 | string | 最短 1 |
| 推荐框架配色 | 是 | "light" \| "dark" | — |
| layoutOverrides | 否 | object | 未知字段不属于合同 |
| layoutOverrides.shell | 否 | object | 未知字段不属于合同 |
| layoutOverrides.shell.htmlContent | 是 | string | 最短 1 |
| layoutOverrides.pages | 否 | array | 最少项 1 |
| layoutOverrides.pages[] | 是 | object | 未知字段不属于合同 |
| layoutOverrides.pages[].ID | 是 | string | 最短 1 |
| layoutOverrides.pages[].htmlContent | 是 | string | 最短 1 |

### HTML/CSS 与稳定主题扩展面

#### HTML tags

`article`、`div`、`em`、`footer`、`h1`、`h2`、`h3`、`h4`、`h5`、`h6`、`header`、`hr`、`img`、`li`、`main`、`ol`、`p`、`pb-module`、`pb-page-outlet`、`section`、`small`、`span`、`strong`、`table`、`tbody`、`td`、`th`、`thead`、`tr`、`ul`

明确禁止且产生专用诊断：

`button`、`form`、`input`、`script`、`select`、`textarea`

#### Attributes

全局允许：`aria-label`、`class`、`title`。除 `pb-module` 外，任意非空 `data-*` 属性允许；事件属性 `on*` 始终禁止。

| Tag | 专用属性 |
| --- | --- |
| `img` | `alt`、`src` |
| `pb-module` | `id` |
| `pb-page-outlet` | 无 |
| `td` | `colspan`、`rowspan` |
| `th` | `colspan`、`rowspan` |

`pb-module` 必须有非空 `id`；它不能携带任意 data 属性。`data-guide-region-id` 必须非空，供 Guide 的 region target 使用。`img.src` 只允许包内相对资源。

#### CSS restrictions

| 语法 | 行为 |
| --- | --- |
| `@import` | 禁止；产生 CSS_TEMPLATE_IMPORT_FORBIDDEN。 |
| `@font-face` | 禁止；产生 CSS_TEMPLATE_FONT_FACE_FORBIDDEN。System Package 不捆绑字体。 |
| `url(http:…), url(https:…), url(//…), url(/…)` | 禁止外部或站点根资源；产生 CSS_TEMPLATE_EXTERNAL_RESOURCE。 |
| `url(assets/…)` | 允许；按包根路径解析并由包资产作用域提供。 |

#### 稳定主题 API

以下变量承诺在当前 schemaVersion 系列保持兼容。Skin 应在自己的包作用域根上覆盖：

| Variable | 默认值 | 用途 |
| --- | --- | --- |
| `--restricted-markdown-red` | `#a8443e` | 受限 Markdown :red[…] 文字色。 |
| `--restricted-markdown-orange` | `#a35f24` | 受限 Markdown :orange[…] 文字色。 |
| `--restricted-markdown-yellow` | `#8a741f` | 受限 Markdown :yellow[…] 文字色。 |
| `--restricted-markdown-green` | `#39704f` | 受限 Markdown :green[…] 文字色。 |
| `--restricted-markdown-blue` | `#356a83` | 受限 Markdown :blue[…] 文字色。 |
| `--restricted-markdown-purple` | `#71558a` | 受限 Markdown :purple[…] 文字色。 |
| `--restricted-markdown-gray` | `#667074` | 受限 Markdown :gray[…] 文字色。 |
| `--card-table-print-page-padding` | `3mm` | 包含 Card Table 的打印页和 HTML Snapshot 内容 inset。 |

以下 data attributes 可作为包作用域 Skin hooks：

- `data-module-id`
- `data-module-type`
- `data-part`
- `data-guide-region-id`
- `data-print-page`
- `data-template-page-id`

稳定 `data-part` 值按 Module 类型列出；组合选择器应始终带 `data-module-type`，避免同名 part 误伤其他模块：

| Module type | Stable data-part values |
| --- | --- |
| `freeText` | `container`、`label`、`input` |
| `longText` | `container`、`label`、`input` |
| `checkboxResource` | `container`、`label`、`options`、`option`、`option-group`、`option-label`、`input` |
| `countableResource` | `container`、`label`、`counter`、`decrement-button`、`increment-button`、`value-group`、`maximum`、`maximum-input`、`marker-group`、`marker`、`marker-image`、`current-markers`、`remaining-markers` |
| `readOnlyDisplay` | `container`、`label`、`value`、`image`、`image-fallback` |
| `imageField` | `container`、`label`、`surface`、`input`、`image`、`image-fallback`、`remove-button` |
| `resourcePicker` | `container`、`button` |
| `resourceComposer` | `container`、`button` |
| `cardTable` | `container`、`surface`、`actions`、`indicator-column`、`indicator` |

#### 不稳定实现细节

- Framework-owned toolbar, dialog and menu DOM/classes
- CSS classes not explicitly listed in the generated presentation contract
- data-part values not listed in stableSystemPackageDataParts
- inline style implementation variables such as --play-card-width and --play-card-state-color

移除或改变稳定 hook 需要提高 System Package schemaVersion、提供迁移说明，并增加兼容期；新增 hook 可在兼容版本中完成。

<!-- END GENERATED CONTRACT -->
