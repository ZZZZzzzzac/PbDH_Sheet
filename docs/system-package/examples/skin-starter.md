# Skin starter

最小 CSS-only Skin：

```text
skins/
└─ aurora/
   └─ skin.css
assets/
└─ skins/
   └─ aurora/
      └─ texture.webp
```

manifest 片段：

```json
{
  "skins": [
    {
      "ID": "plain",
      "名称": "简洁",
      "css": "skins/plain.css",
      "推荐框架配色": "light"
    },
    {
      "ID": "aurora",
      "名称": "极光",
      "css": "skins/aurora/skin.css",
      "推荐框架配色": "dark"
    }
  ],
  "defaultSkin": "plain"
}
```

`skins/aurora/skin.css`：

```css
:scope {
  --framework-surface: #172125;
  --framework-text: #edf4f0;
  --skin-accent: #83c4aa;
  background: #101719 url("assets/skins/aurora/texture.webp") repeat;
  color: var(--framework-text);
}

[data-module-type="freeText"] [data-part="container"] {
  border-color: var(--skin-accent);
}
```

如果只有一个 Page 必须换 DOM，在该 Skin item 增加：

```json
{
  "layoutOverrides": {
    "pages": [
      { "ID": "main", "html": "skins/aurora/main.html" }
    ]
  }
}
```

`main.html` 必须保留 Base `main` Page 的全部 `<pb-module id="...">`，不能把模块移到其他 Page。未列出的 Page 自动回退 Base HTML。
