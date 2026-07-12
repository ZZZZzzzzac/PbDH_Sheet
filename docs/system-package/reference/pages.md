# Pages

`pages` 文件是至少一个 Page 的数组，顺序是导航和输出顺序。

| 字段 | 类型 | 必填 | 默认/约束 | 处理 |
| --- | --- | --- | --- | --- |
| `ID` | string | 是 | 非空、全包唯一 | 引用/导航 key |
| `名称` | string | 是 | 非空 | 导航 label |
| `默认隐藏` | boolean | 否 | `false` | 初始 runtime visibility |
| `打印` | boolean | 否 | 未声明时等于 runtime visibility | printable override |
| `layout` | object | 是 | `类型` 必须 `htmlTemplate` | Loader 读取 HTML/CSS |
| `layout.html` | path | 是 | 安全相对路径 | 转成 `htmlContent` |
| `layout.css` | path | 否 | 安全相对路径 | 转成 `cssContent` |

Runtime-Visible Page = `默认隐藏` 与 Dependency `setVisibility` 的结果。Current Page 是 Renderer 临时状态：初始为第一个可见页；当前页隐藏后 fallback 到第一个可见页；零页显示空状态。两个以上可见页显示导航，一个不显示。

Printable Page policy：显式 `打印` 优先；否则采用 runtime visibility。输出模式渲染所有 printable pages，不受 Current Page 影响，并隐藏导航。

Base Framework 将每个 printable Page 放入固定的 A4 纵向页面盒：外尺寸 `210mm × 297mm`，框架负责盒内打印边距。框架不会按 System Package 当前宽度自动缩放；HTML Layout Template 必须在 A4 内容区内完成自己的 Grid/Flex 排版，溢出代表包布局需要修正。Sheet Shell 中确实需要作为额外打印页输出的静态区域可声明 `data-print-page="true"`，以复用同一 A4 页面盒；不要自行重复声明纸张尺寸或页边距。
