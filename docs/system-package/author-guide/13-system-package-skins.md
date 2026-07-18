# 制作 System Package Skin

Skin 是 System Package 内置的表现层。它可以改变人物卡视觉和同一 Page/Shell 内的 HTML 编排，但不能改变 Sheet Modules、Character Data、Dependency Logic、Validation Checks、Page 语义或 A4 页面盒。

## 默认工作模式：CSS-only

先复制现有 Skin CSS，新建独立 ID；不要直接美化 `plain`。普通 Skin 任务只修改：

```text
skins/<skin-id>/skin.css
assets/skins/<skin-id>/**
manifest.json 中该 Skin 的注册项
```

```json
{
  "ID": "new-skin",
  "名称": "新皮肤",
  "css": "skins/new-skin/skin.css",
  "推荐框架配色": "dark"
}
```

一个 Skin CSS 同时覆盖 Shell 与全部 Page。Renderer 在 Base Layout CSS 之后加载它，并把它 scope 到 Current System Package。用 `:scope` 设置包根令牌；用 `[data-template-page-id="..."]`、`[data-module-id="..."]`、`[data-module-type="..."]` 和 `[data-part="..."]` 做稳定定位。

```css
:scope {
  --framework-surface: #191d20;
  --framework-text: #f1eee7;
  --skin-accent: #b98b48;
}

[data-template-page-id="main"] .section-title {
  color: var(--skin-accent);
}

[data-module-type="freeText"] [data-part="input"] {
  min-height: 2rem;
}
```

Skin 可以覆盖控件尺寸、spacing 和 Grid/Flex。只有 CSS 无法表达时才使用 HTML override。

人物卡 Page 的内部主布局必须相对于 A4 内容区定义。列宽、立绘栏、正文栏等优先使用 `%`、`fr` 和 `minmax(0, …)`，让网页预览与打印保持相同占比；不要用固定 `mm` 或 `px` 定义这些子栏。`mm` 只用于纸张外盒、打印边距等确实需要物理尺寸的地方。例如：

```css
.character-summary {
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
}
```

不要把立绘栏写成 `55mm minmax(0, 1fr)`：网页较宽时看似正常，进入 A4 后固定列会占据更高比例并挤压相邻字段。Author Preview 与打印验收应比较关键区域的相对宽度，而不只检查是否溢出。

## 可选 HTML override

Skin 可以只覆盖一个 Page，其他位置继续使用 Base HTML，并仍应用同一 Skin CSS：

```json
{
  "ID": "editorial",
  "名称": "编排版",
  "css": "skins/editorial/skin.css",
  "推荐框架配色": "light",
  "layoutOverrides": {
    "pages": [
      { "ID": "main", "html": "skins/editorial/main.html" }
    ]
  }
}
```

override 可以增加安全 Static Layout Content、图片和容器，也可以任意重排当前 owner 内的 `<pb-module>`。它必须保留 Base Page/Shell 完全相同的 Module ID多重集合：不能遗漏、重复或跨 Page/Shell 搬运。Shell override 还必须保留唯一 `<pb-page-outlet>` 和相同打印页标记数量；Guide 使用的 Layout Region 在每套有效布局中都必须存在。

不要修改 Base HTML 来服务单一 Skin。需要 HTML 时，在 Skin 自己目录声明 override，避免破坏其他 Skin。

## 资源与字体

纹理、装饰、边框和带文字的美术元素放在 `assets/skins/<skin-id>/**`，CSS/HTML 使用包根相对路径。只支持已列入图片合同的格式。禁止 `@import`、`@font-face`、外部 URL、绝对路径、base64 大图和字体文件；使用带 fallback 的系统字体栈。

## Framework Color Scheme

`推荐框架配色` 只建议 Base Framework 使用中性 Light/Dark。Player 可以手动覆盖。它不替代 Skin，也不进入 Character Data或打印输出。

## Author Preview 检查顺序

1. 保存 manifest、Skin CSS、override HTML 与图片。
2. 刷新 Author Preview，先清零所有 fatal/error。
3. 切换到其他 Skin，再切回来，确认没有状态丢失。
4. 逐页检查 desktop、窄屏和打印模式。
5. 检查文字溢出、焦点可见、输入框高度、图片 fallback、Guide Regions 和隐藏 Page。
6. 导出 HTML snapshot并运行浏览器打印预览，确认每个打印块仍是 A4。

完整字段和诊断见 [Skin Reference](../reference/skins.md)。
