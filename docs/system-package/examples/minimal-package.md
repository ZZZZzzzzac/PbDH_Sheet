# 最小 System Package：可直接复制

下面的目录就是一个完整、可导入的最小包，不依赖本仓库中的其他示例文件。

```text
hello-sheet/
├─ manifest.json
├─ pages.json
├─ modules.json
└─ layouts/
   ├─ main.html
   └─ main.css
```

## manifest.json

最小 manifest 只声明四个必填元数据字段和 Pages/Modules 路径。

```json
{
  "ID": "hello-sheet",
  "名称": "你好人物卡",
  "版本": "1.0.0",
  "schemaVersion": "0.1.0",
  "pages": "pages.json",
  "modules": "modules.json"
}
```

- `ID` 是稳定 package identity，发布新版本时不要随意更改。
- `版本` 是 Author 版本，不要求使用特定版本格式。
- 所有路径都相对包根，使用 `/`，不能包含 `..`、盘符或 URL。

## pages.json

```json
[
  {
    "ID": "main",
    "名称": "人物卡",
    "layout": {
      "类型": "htmlTemplate",
      "html": "layouts/main.html",
      "css": "layouts/main.css"
    }
  }
]
```

`layout.css` 可省略；这里保留它以展示最常见的文件组织。

## modules.json

```json
[
  {
    "ID": "character-name",
    "类型": "freeText",
    "标签": "角色名",
    "默认值": ""
  }
]
```

`默认值` 可省略；`freeText` 省略时同样以空文本初始化。

## layouts/main.html

```html
<main class="hello-sheet">
  <header>
    <h1>你好人物卡</h1>
    <p>填写角色名后，Character Save 会保存这个 Sheet Value。</p>
  </header>
  <section aria-label="角色身份">
    <pb-module id="character-name"></pb-module>
  </section>
</main>
```

布局只能使用安全静态 HTML 和 `pb-module`，不能直接写 `input`、`button`、`script` 或 `on*` 事件。

## layouts/main.css

```css
.hello-sheet {
  display: grid;
  gap: 1rem;
  max-width: 48rem;
  margin-inline: auto;
  padding: 1rem;
}

.hello-sheet section {
  border: 1px solid #bbb;
  border-radius: 0.5rem;
  padding: 1rem;
}
```

CSS 会按 Page scope 隔离。不要选择全局 `html`、`body`、`:root`，不要使用 `@import` 或外部 URL。

## 验收

1. 将 `hello-sheet` 目录直接导入，或将其中内容压缩为 zip。
2. Validator 应无 fatal/error。
3. 页面显示一个角色名字段。
4. 新建 Character Save，填写并刷新后，角色名应恢复。

Resources、Dependencies、Cards、Shell、Guide、Checks 和 Assets 都是可选能力；完整写法见同目录的《完整 System Package》文档。
