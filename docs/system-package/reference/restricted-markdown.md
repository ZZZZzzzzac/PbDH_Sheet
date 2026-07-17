# Restricted Markdown

Restricted Markdown 是 Sheet Value 与 Resource Value 的展示能力，不改变存储 schema。以下内容面会解析它：

- `freeText` 与 `longText` 的 Player value；
- Resource Library Browser 表格中的 Resource Value；
- Card Table/Card Detail 中的 Card name、description 与推断 tags；
- 卡图缺失或加载失败后的文字 Card。
- Character Creation Guide 的 `说明`。

Module `标签`、`占位文本`、框架按钮、菜单、空状态、诊断、Guide `标题`、Guide controls 与无障碍名称始终是纯文本。

## 支持语法

```md
**粗体**
*斜体*
***粗斜体***

- 无序项
- 第二项

1. 有序项
2. 第二项

:red[红色强调]
:orange[橙色强调]
:yellow[黄色强调]
:green[绿色强调]
:blue[蓝色强调]
:purple[紫色强调]
:gray[灰色强调]

:blue[***蓝色粗斜体***]
```

颜色可与粗体/斜体组合，但颜色 directive 不能嵌套。只接受上述七个固定名称；不能写任意颜色、inline CSS 或自定义 directive。

普通文本中的换行逐个保留：单个换行显示为换行，连续两个换行保留一个空行，连续三个换行保留两个空行。编辑态与展示态因此保持相同的行结构。列表仍按原有 Markdown 语法解析。

不支持 headings、links、images、blockquotes、inline/fenced code、tables、strikethrough、task lists、raw HTML。禁用语法不会产生对应元素或交互；可读文本会尽量保留。畸形 directive、未知颜色和嵌套颜色不会应用颜色。

## 编辑与存储

空的 `freeText`/`longText` 直接显示原输入控件。非空值失焦后显示渲染结果；点击渲染结果或用键盘 Enter/Space 进入编辑并看到原始 Markdown，离开输入控件后恢复渲染。

`freeText` 始终是单行 input，即使内容看起来像列表；`longText` 保持 textarea。Character Data 与 Resource Library 都保存原始字符串，不保存 HTML，不迁移 schema。`fillText` 也写入原始字符串，展示时才解析。只读 HTML、打印和 PDF-facing DOM 使用渲染结果，不输出聚焦中的编辑控件。

## 颜色变量

框架提供 restrained defaults，并暴露以下稳定 CSS variables：

```css
.character-page {
  --restricted-markdown-red: #9f4943;
  --restricted-markdown-orange: #9a642f;
  --restricted-markdown-yellow: #817126;
  --restricted-markdown-green: #3f7355;
  --restricted-markdown-blue: #3b6f87;
  --restricted-markdown-purple: #705889;
  --restricted-markdown-gray: #697276;
}
```

在 Page/Shell scoped CSS 中覆盖变量；不要使用 `:root`，不要在内容文本中写 CSS。
