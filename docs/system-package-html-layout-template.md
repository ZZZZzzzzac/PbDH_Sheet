# System Package HTML Layout Template 接口

状态：设计决策  
适用 schemaVersion：`0.1.0`  
读者：System Package Author，以及协助 Author 写包的 AI

本文定义 Author 如何用安全 HTML 和 scoped CSS 声明页面布局。模板只负责摆放已有 Sheet Modules 和无状态装饰，不产生 Character Data，也不定义交互行为。

Resource Picker 与 Dependency Logic v1 写法见：[System Package Resource Picker 与 Dependency Logic v1 接口](system-package-resource-picker.md)。

## 总结构

HTML Layout Template 是：

```text
page layout -> html file + css file
html file -> Static Layout Content + <pb-module id="...">
```

System Package 页面引用布局文件：

```json
{
  "ID": "main",
  "名称": "角色卡",
  "layout": {
    "类型": "htmlTemplate",
    "html": "layouts/main.html",
    "css": "layouts/main.css"
  }
}
```

## HTML 示例

```html
<main class="sheet">
  <header class="hero">
    <h1>调查员档案</h1>
    <p>先填写身份，再选择能力。</p>
  </header>

  <section class="identity">
    <pb-module id="name-textbox"></pb-module>
    <pb-module id="portrait"></pb-module>
  </section>

  <section class="notes">
    <h2>记录</h2>
    <pb-module id="background"></pb-module>
    <pb-module id="rule-note"></pb-module>
  </section>
</main>
```

## CSS 示例

```css
.sheet {
  max-width: 1040px;
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.identity {
  display: grid;
  grid-template-columns: 2fr 180px;
  gap: 16px;
}

.notes {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .identity,
  .notes {
    grid-template-columns: 1fr;
  }
}
```

## Sheet Module 样式接口

框架渲染每个 Sheet Module 时都会公开三个稳定选择面：

- `data-module-id`：模块实例 ID。用于只修改一个具体模块。
- `data-module-type`：模块类型。用于设置同类型模块的共同样式。
- `data-part`：模块内部由框架公开的稳定部件。Author CSS 应优先使用它，不依赖内部 DOM 层级或实现 class。

例如 `modules.json` 中存在两个 `freeText`：

```json
[
  { "ID": "charname", "类型": "freeText", "标签": "姓名" },
  { "ID": "main-class", "类型": "freeText", "标签": "主职业" }
]
```

只修改 `charname`，不会影响 `main-class`：

```css
[data-module-id="charname"] {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 8px;
}

[data-module-id="charname"] [data-part="label"] {
  color: #7a263a;
  font-weight: 700;
}

[data-module-id="charname"] [data-part="input"] {
  border: 2px solid #7a263a;
  border-radius: 0;
}
```

为页面中所有 `freeText` 提供共同默认样式：

```css
[data-module-type="freeText"] [data-part="input"] {
  min-height: 2.5rem;
}
```

实例规则可以覆盖类型规则：

```css
[data-module-type="freeText"] [data-part="input"] {
  border: 1px solid #999;
}

[data-module-id="charname"] [data-part="input"] {
  border-color: crimson;
}
```

### 稳定 parts

| Module 类型 | 稳定 `data-part` |
| --- | --- |
| `freeText` | `container`、`label`、`input` |
| `longText` | `container`、`label`、`input` |
| `checkboxResource` | `container`、`label`、`options`、`option`、`input`、`option-label` |
| `countableResource` | `container`、`label`、`counter`、`decrement-button`、`input`、`increment-button`、`maximum`、`maximum-input` |
| `readOnlyDisplay` | `container`、`label`、`value`、`image`、`image-fallback` |
| `imageField` | `container`、`label`、`image`、`image-fallback`、`actions`、`button` |
| `resourcePicker` | `container`、`button` |
| `cardTable` | `container`、`surface`、`actions`、`tidy-button`、`size-control`、`empty` |

`data-part` 是 Author-facing 兼容接口。普通 class 主要服务框架自身样式，可能随实现调整，不应作为 System Package 的长期依赖。

Author 不需要为每个模块声明单独 CSS 文件。实例样式、类型默认样式和页面布局都写在该页面的 `layout.css` 中。框架会把整个 CSS 文件限制到当前页面，因此这些选择器不能影响 App Shell 或其他页面。

## 允许内容

- 布局容器：`main`、`section`、`article`、`header`、`footer`、`div`。
- 静态内容：`h1`-`h6`、`p`、`span`、`strong`、`em`、`small`、`hr`。
- 列表和表格类静态结构：`ul`、`ol`、`li`、`table`、`thead`、`tbody`、`tr`、`th`、`td`。
- 装饰图片：`img`，资源必须来自 System Package assets。
- 模块占位符：`<pb-module id="module-id"></pb-module>`。

## 允许属性

- 通用属性：`class`、`title`、`aria-label`、`data-*`。
- `pb-module`：只允许 `id`。
- `img`：只允许 `src`、`alt`。
- `td`、`th`：可额外使用 `colspan`、`rowspan`。
- 样式必须写入 CSS 文件；HTML 内不允许 `style` 属性。

## 禁止内容

- 自定义交互控件：`input`、`button`、`select`、`textarea`、`form`。
- 脚本：`script`、事件属性、内联 JS、外部 JS。
- 外部资源：外链 CSS、外链字体、外链图片、外部 `@import`。
- 全局污染：直接影响 `html`、`body`、app shell、导入导出按钮、存档 UI。
- 依赖未列入上表的内部 class 或 DOM 层级作为长期接口。

## 校验规则

- `layout.类型` 必须是 `htmlTemplate`。
- `layout.html` 必须指向包内 HTML 文件。
- `layout.css` 可选；填写时必须指向包内 CSS 文件。
- 每个 `<pb-module id="...">` 必须引用 `modules.json` 中存在的 Sheet Module ID。
- HTML 中禁止的标签和属性会导致导入失败。
- CSS 会被框架 scope 到当前 Sheet Tool；不能影响框架 UI 或其他包。
- Layout 不进入 Character Data；Character Data 仍按 Sheet Module ID 存值。

## 生成清单

1. 先在 `modules.json` 定义所有 Sheet Modules，并固定每个模块 `ID`。
2. 在 HTML 模板里用 `<pb-module id="...">` 摆放这些模块。
3. 用静态 HTML 写标题、说明、装饰和分隔。
4. 用 CSS Grid/Flex/media query 做行列和响应式。
5. 不写任何自定义表单控件；需要新交互时，新增或扩展 Sheet Module。
6. 导入包后看 Validator；有模块引用错误先查 `<pb-module id>` 拼写。
7. 修改单个模块时，以 `[data-module-id="..."]` 开头并使用其稳定 `[data-part="..."]`。
