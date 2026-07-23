# Images and package paths

System Package 自动发现 `assets/**` 下的 PNG、JPEG、WebP、GIF、AVIF 和 SVG 图片。Author 不声明 Asset manifest item 或自定义 Asset ID；HTML、CSS、readOnlyDisplay、Countable Resource 图片 Marker 和 Card art 统一使用包内相对路径，例如 `assets/cards/flame.webp`。

合法路径是包根相对路径。Normalizer 统一 `/`，拒绝绝对路径、drive prefix、URL、空路径和任何 `..` traversal。zip 允许所有文件共享一层公共根目录，Loader 会剥离该根；目录选择也会剥离选择目录名。

HTML/CSS 不允许外部 URL。明确写出的缺失图片引用是 Validator error；已发现但未引用的图片产生 warning。上传的 zip/目录包图片 bytes 与包缓存保存在 IndexedDB，Runtime Resolver 产生 Blob URL；Character Data 不复制 System Package 图片。

预制 System Package 是静态部署资源：切换时只读取并校验元数据，图片解析为同源静态 URL，由浏览器在图片实际进入渲染路径时请求和解码。ZIP Resource Extension 仍使用 IndexedDB bytes 和 Blob URL。

字体、音频、视频和任意二进制文件不属于自动图片发现合同。不要把大型图片转成 base64 写入 JSON。

## 体积预算

导入上限是安全边界，不是可用完的体积预算。批量加入图片前，先统计文件数、展开总大小和最终 zip 大小，再决定压缩与裁剪方案。图片应按实际最大显示尺寸缩放、移除元数据、去重，并优先使用 WebP/AVIF；只有确实需要无损输出时才使用 PNG。

System Package 和 Git 仓库只保存运行时需要的优化后资产。不要把原始 PNG/TIFF、PSD 等源文件、生成过程中的中间文件、重复导出版本或大块 base64 数据直接塞进包或 Git 历史。需要保留的源素材应放在仓库外的素材归档中；包内只保留被实际引用的交付版本。

导入限制：zip 压缩体积最多 128 MiB、展开体积最多 512 MiB、文件最多 4096 个、总压缩比最多 250。目录导入使用相同的展开体积与文件数限制。
