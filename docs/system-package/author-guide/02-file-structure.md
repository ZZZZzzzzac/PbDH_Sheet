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
├─ resources/*.json
├─ guides/*.json
├─ checks/*.js
└─ assets/**/*
```

路径使用 `/`，不能是绝对路径，不能含 `..`，不能引用 `http:`、`https:` 或包外文件。Windows 的反斜杠会规范化，但 Author 文件应统一写 `/`。

所有被引用实体都使用稳定 `ID`。Page、Module、Asset、Resource Library、Dependency Rule、Validation Check、Guide Step 和同一 Library 内的 Resource Entry ID 不得重复。修改 ID 等于修改外部契约：布局、Dependency、Guide、Character Data 或 Card Instance 中的引用也要同步更新。

中文字段名属于 Author Data；普通资源扩展字段可以自由命名。框架字段必须精确拼写，例如 `类型`、Picker 的 `资源库ID`、Card Table 的 `资源库IDs`、`默认隐藏`、`打印`。Validator 不会猜测普通扩展字段的含义。

zip 和目录输入最终进入同一 VFS、Loader、Validator 和缓存流程。详见[管线参考](../reference/package-pipeline.md)。
