# HTML Layout Template 与 Sheet Shell

Loaded layout shape：`{ 类型: "htmlTemplate", htmlContent: string, cssContent?: string }`。Author-facing Page 使用 `html/css` 路径，Loader 负责读取。

允许 HTML tags：`main, section, article, header, footer, nav, div, span, p, h1..h6, ul, ol, li, dl, dt, dd, table, thead, tbody, tfoot, tr, th, td, img, figure, figcaption, strong, em, small, br, hr, pb-module, pb-page-outlet`。

常用允许属性包括 `id`、`class`、`title`、ARIA/data 属性，以及图片的包内 `src/alt/width/height`。所有 `on*` 事件属性、inline `style`、自定义表单元素、`script`、外部 URL 被拒绝。精确 allowlist 以 Validator 当前实现为准。

`<pb-module id="module-id"></pb-module>` 的 ID 必须存在。Page layout 可引用任意已声明 Module；同一 Module 不应重复挂载为多个可编辑实例。Sheet Shell 必须且只能有一个 `<pb-page-outlet>`。

安全静态 HTML 容器可用非空 `data-guide-region-id` 声明 Layout Region，供 Character Creation Guide 作为单个矩形目标引用。Region ID 在整个 System Package 的 Shell 与所有 Page layout 中必须唯一。Region 可包含多个 `<pb-module>` 和静态布局内容；不要把同一个逻辑区域拆成多个同名容器。

CSS 禁止 `@import`、外部/绝对 URL 和全局 `html/body/:root` 污染。Renderer 为页面加 scope；Module 根暴露 `data-module-id`、`data-module-type`，内部稳定部件使用 `data-part`。不要依赖 React DOM 层级或生成 class。

Restricted Markdown 的七个 palette variables 可在 scoped Page/Shell selector 中覆盖；变量名与示例见[Restricted Markdown](restricted-markdown.md)。内容不能携带 inline color/CSS。
