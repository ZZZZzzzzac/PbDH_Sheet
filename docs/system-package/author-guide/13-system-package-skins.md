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

## 所见即所得打印工作流

先把网页预览做成可信的纸面预览，再处理打印输出。若 Page 在网页中可扩展到 1100px、打印时才变成约 210mm，文字换行和模块高度必然可能变化；不要用打印专属 CSS 隐藏问题。

推荐顺序：

1. 让 Page Layout 的网页预览使用真实 A4 宽高比；由 Base Layout 或 Skin 的包内页面根声明内容边距，不要修改框架 `.sheet-page`。
2. 用 Skin variables 声明可调主栏比例，并在 Grid 中通过 `fr` 使用：

   ```css
   :scope {
     --skin-left-column: 65fr;
     --skin-right-column: 35fr;
   }

   .sheet-content-grid {
     grid-template-columns:
       minmax(0, var(--skin-left-column))
       minmax(0, var(--skin-right-column));
   }
   ```

3. 在网页 A4 预览中解决内容容量问题。优先调整共享的 Grid/Flex、gap 和装饰 padding；不要先写 `@media print` 压缩内容。
4. 保留 Module 的尺寸所有权。longText 高度由 `modules.json` 的 `行数`决定；需要更多或更少书写空间时修改 Module 配置，不要在 Skin 中固定输入高度。
5. 最后处理“输出时必然消失”的交互控件。Resource Picker 被隐藏后，把它所在的两列 Grid 改成单列，使相邻 freeText 占满宽度；除此之外，打印布局应与网页布局一致。
6. 分别检查普通网页、输出准备态、HTML snapshot 和浏览器打印预览。确保颜色、字段宽度、标题、栏宽比例与 A4 单页容量一致。

### 常见错误与修复

| 症状 | 根因 | 正确修复 |
| --- | --- | --- |
| 网页正常，打印时字段变窄或换行 | 网页 Page 比 A4 宽，打印时才固定为 A4 | 网页预览也使用真实 A4 页盒；内部轨道使用比例单位 |
| 页面外缘出现白边，或不同包安全区相同 | 依赖框架或直接修改 `.sheet-page` 的 padding | 让框架页盒保持 `padding: 0`，在包内页面根声明内容边距 |
| 打印能放进一页，但标题或装饰消失 | `@media print` 维护了第二套压缩布局 | 删除打印专属重排，收紧网页/打印共享的结构间距 |
| longText 行数改了却高度不变 | Skin 直接覆盖了输入的 `height/max-height` | 删除 Skin 高度规则，让 `行数`继续控制 Module |
| Picker 隐藏后 freeText 右侧留白 | Grid 仍保留 Picker 的固定轨道 | 只在输出时把该局部 Grid 改成一列 |
| 测试说单页通过，但底部内容缺失 | Page 使用 `overflow: hidden`，只测了纸张数量 | 同时断言 `scrollWidth/clientWidth`、`scrollHeight/clientHeight` |

打印颜色需要保真时，可在 Skin Page 根声明：

```css
.skin-sheet {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
```

完整规范和自动化验收信号见 [Skin Reference](../reference/skins.md#网页与打印的所见即所得合同)。

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
