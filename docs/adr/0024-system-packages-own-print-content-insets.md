# ADR-0024: System Packages own print content insets

状态：Accepted
日期：2026-07-20

## 背景

Base Framework 曾在每个 A4 Page 上强制加入统一打印内边距，并对 `data-print-page="true"` 使用另一组固定内边距。System Package 同时还会在自己的页面根声明内容边距，导致纸张外缘出现无法由 Author 控制的白边，也让网页预览、输出准备态、HTML snapshot 与浏览器打印可能使用不同的有效内容宽度。

不同 System Package 的视觉需要并不相同：有的背景应铺到纸张边缘，有的需要较宽书写安全区，有的额外打印页用于 Card Table。统一的框架内边距无法表达这些差异。

## 决策

- Base Framework 继续拥有固定 A4 纵向页面盒（`210mm × 297mm`）、分页、溢出边界和 `@page` 纸张设置。
- Base Framework 对普通 Page 与 `data-print-page="true"` 的页内边距统一为 `0`。
- System Package 的 Base Layout 或 Skin 在包内页面根上显式声明内容边距；背景可以独立铺满整个 A4 页面盒。
- 普通网页预览、输出准备态、HTML snapshot 与浏览器打印必须使用同一内容边距。只有在普通网页中不存在、输出时才成为独立页的 Shell 区域，才可同时为输出准备态和 `@media print` 声明同一边距。
- System Package Skin 不直接修改 Base Framework 的 `.sheet-page` 几何；真实 A4 预览宽度由 Page Layout scope 声明，Skin 只修改包内页面根的内容边距与视觉。

## 理由

- 页面背景可以延伸到纸张边缘，不再出现框架强加的白边。
- Author 能按每个 System Package 的排版和打印机安全区需求选择边距。
- 四条输出路径共享相同有效内容宽度，减少打印时才发生的换行、挤压与裁切。
- Base Framework 仍拥有纸张尺寸与分页，避免各包重复实现浏览器打印基础设施。

## 代价

- 每个 System Package 必须显式维护 Page 内容边距。
- 旧包若依赖框架默认边距，需要补充 Layout CSS。
- 额外打印 Shell 区域需要同时覆盖输出准备态和实际打印态，不能只写一条 `@media print` 规则。

## 后续信号

- 多个 System Package 需要共享可配置的安全区令牌。
- 浏览器或打印机硬件裁切区要求框架提供可选提示，但不应重新强制页面内边距。
- 非 A4 页面尺寸成为正式需求，需要扩展页面盒合同而不是由 Skin 改写 `.sheet-page`。
