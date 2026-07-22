# 文件结构与命名

只有 `manifest.json` 的位置固定。其他文件可以自由分目录，但必须由 manifest 或被引用文件使用包根相对路径连接。

推荐结构：

```text
system-package/
├─ manifest.json
├─ pages.json
├─ modules.json
├─ dependencies.json
├─ layouts/*.html
├─ layouts/*.css
├─ skins/**/*.css
├─ skins/**/*.html
├─ resources/*.json
├─ guides/*.json
├─ checks/*.js
└─ assets/**/*
```

路径使用 `/`，不能是绝对路径，不能含 `..`，不能引用 `http:`、`https:` 或包外文件。Windows 的反斜杠会规范化，但 Author 文件应统一写 `/`。

大量图片进入包前必须先做体积预算与优化，不要直接复制原始素材或中间文件。只保留按实际显示尺寸缩放、去重、移除元数据后的交付资产，优先 WebP/AVIF；详见[图片与包路径](../reference/assets-and-paths.md#体积预算)。

所有被引用实体都使用稳定 `ID`。Page、Module、Resource Library、Dependency Rule、Validation Check、Guide Step 和同一 Library 内的 Resource Entry ID 不得重复；`data-guide-region-id` 在整个 System Package 内不得重复。图片使用 `assets/**` 下的稳定相对路径。修改 ID 或图片路径等于修改外部契约，相关引用必须同步更新。

中文字段名属于 Author Data；普通资源扩展字段可以自由命名。框架字段必须精确拼写，例如 `类型`、Picker 的 `资源库`、Card Table 的 `资源来源`、`默认隐藏`、`打印`。Validator 不会猜测普通扩展字段的含义。

Skin 的全包 CSS 和可选 HTML override 放在自己的 `skins/<skin-id>/`；Skin 图片放在 `assets/skins/<skin-id>/`。不要为 Skin 修改共享 Base Layout。详见[制作 Skin](13-system-package-skins.md)。

zip 和目录输入最终进入同一 VFS、Loader、Validator 和缓存流程。详见[管线参考](../reference/package-pipeline.md)。
