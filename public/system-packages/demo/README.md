# System Package 完整演示

此目录是当前 System Package 合同的可运行展示。`demo-minimal` 负责最小起步；本包负责语义分支覆盖、Author 教学与集成验收。

“变体”指改变渲染或交互语义的独立合同分支，不是可选字段的笛卡尔积。网页内说明用于学习；本表用于维护覆盖。

| 类型 | 语义分支 | 稳定 ID / 页面 | 验收动作 |
| --- | --- | --- | --- |
| `freeText` | 普通输入、隐藏标签、下拉、Validation 输入 | `free-basic`、`free-hidden-label`、`free-select`、`validation-*` / `free-text` | 输入、失焦预览、选择、执行检查 |
| `longText` | 默认行数、自定义行数、隐藏标签 | `long-basic`、`long-two-rows`、`long-hidden-label` / `long-text` | 输入多行 Markdown、观察固定高度 |
| `checkboxResource` | 独立、默认选中、分组 | `checkbox-basic`、`checkbox-grouped` / `checkbox-resource` | 切换各选项并保存 |
| `countableResource` | 有限/无上限数值、可配置步长、固定/可改/无上限标记 | `count-*` / `countable-resource` | 点击加减；确认无上限数值每次变化 2；可改上限项右键或长按 |
| `readOnlyDisplay` | 文本、图片、文本+图片、派生内容 | `display-*`、`class-background-questions` / `read-only-display`、`integration` | 检查静态显示；选择职业观察派生内容 |
| `imageField` | 空、上传、替换、移除 | `portrait` / `image-field` | 上传、替换、移除图片并保存 |
| `resourcePicker` | 单库、多库、Other、单选、多选、默认查询、创建 Card | `pick-*` / `resource-picker` | 打开 Browser，筛选/排序/选择 |
| `resourceComposer` | 基础输出、关系输出、创建 Card | `compose-basic`、`compose-card` / `resource-composer` | 同源与异源组合各完成一次 |
| `cardTable` | 文字/图片、Library/Composer/Other、多状态与背景色 | `text-card-table`、`demo-card-table` / `card-table` | 创建 Card，切换状态、翻面/旋转/指示物 |

## 非 Module 合同

- Sheet Shell：`layouts/shell.*`，含唯一 `<pb-page-outlet>`。
- Page：网页与打印共用 `210mm × 297mm` A4 外盒和框架打印内边距，保持所见即所得。
- Character Creation Guide：13 步，覆盖无目标、Page、Module、Layout Region。
- Validation Check：A/B/C 等式、职业/子职 Resource 关系、Card state。
- Dependency Logic：Resource 复制、Countable 填充、动态筛选、显隐与 Checkbox 触发。
- Resources：三个角色原型、六个专长、六张演示卡与两条备忘，均为本包原创的小型 fixture。
- Assets：演示卡只复用本包的两个轻量 SVG，不携带 `daggerheart-core` 卡牌数据或批量卡图。
