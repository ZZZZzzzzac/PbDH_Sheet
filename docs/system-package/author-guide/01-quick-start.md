# 快速开始：制作第一个 System Package

复制 `docs/system-package/examples/demo-minimal` 为新目录，保留以下结构：

```text
my-system/
├─ manifest.json
├─ pages.json
├─ modules.json
└─ layouts/
   └─ main.html
```

先修改 `manifest.json` 的 `ID`、`名称`、`版本`，保持 `schemaVersion` 为 `0.2.0`。`pages` 和 `modules` 是包内相对路径：

```json
{
  "ID": "my-system",
  "名称": "我的 PbDH 系统",
  "版本": "0.1.0",
  "schemaVersion": "0.2.0",
  "pages": "pages.json",
  "modules": "modules.json"
}
```

在 `modules.json` 定义一个文本格：

```json
[
  { "ID": "character-name", "类型": "freeText", "标签": "角色名" }
]
```

在 `pages.json` 定义页面并引用布局：

```json
[
  {
    "ID": "main",
    "名称": "角色卡",
    "layout": { "类型": "htmlTemplate", "html": "layouts/main.html" }
  }
]
```

在布局中放置模块：

```html
<main>
  <h1>角色卡</h1>
  <pb-module id="character-name"></pb-module>
</main>
```

在网站的 System Package 菜单选择目录或 zip。成功后会渲染角色卡；失败时按错误面板中的文件、逻辑路径、相关实体和 evidence 修改源文件。不要把外层目录一起多套一层压缩；`manifest.json` 应位于包根，Loader 也兼容仅有一层公共根目录的 zip。

下一步阅读[文件结构](02-file-structure.md)和[Author Preview](10-author-preview.md)。
