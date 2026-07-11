# Assets and package paths

Asset manifest item：`ID`、`路径` 必填非空，`类型` 可选；未写 MIME 时由扩展名推断。Asset ID 必须唯一。Runtime asset 保存 bytes、normalized path 与 MIME，Resolver 产生 Blob URL 或 fallback。

合法路径是包根相对路径。Normalizer：统一 `/`，拒绝绝对路径、drive prefix、URL、空路径和任何 `..` traversal。zip 允许所有文件共享一层公共根目录，Loader 会剥离该根；目录选择也会剥离选择目录名。

HTML/CSS 不允许外部 URL。Layout `<img src>` 应引用包内路径； readOnlyDisplay/Card art 可使用 Asset ID 或路径。缺失 art 使用文字 fallback，但明确写出的无效 Asset 引用是 Validator error。

Service Worker/PWA 不属于产品范围。Assets 与包缓存保存在 IndexedDB；浏览器清站点数据后可能丢失，应保留原始 System Package。
