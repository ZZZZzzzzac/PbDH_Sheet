# Images and package paths

System Package 自动发现 `assets/**` 下的 PNG、JPEG、WebP、GIF、AVIF 和 SVG 图片。Author 不声明 Asset manifest item 或自定义 Asset ID；HTML、CSS、readOnlyDisplay 和 Card art 统一使用包内相对路径，例如 `assets/cards/flame.webp`。

合法路径是包根相对路径。Normalizer 统一 `/`，拒绝绝对路径、drive prefix、URL、空路径和任何 `..` traversal。zip 允许所有文件共享一层公共根目录，Loader 会剥离该根；目录选择也会剥离选择目录名。

HTML/CSS 不允许外部 URL。明确写出的缺失图片引用是 Validator error；已发现但未引用的图片产生 warning。图片 bytes 与包缓存保存在 IndexedDB，Runtime Resolver 产生 Blob URL；Character Data 不复制 System Package 图片。

字体、音频、视频和任意二进制文件不属于自动图片发现合同。不要把大型图片转成 base64 写入 JSON。

导入限制：zip 压缩体积最多 128 MiB、展开体积最多 512 MiB、文件最多 4096 个、总压缩比最多 250。目录导入使用相同的展开体积与文件数限制。
