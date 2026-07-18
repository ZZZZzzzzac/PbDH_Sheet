# 《巫趣》ω1.0 车卡器 PRD

## 目标

基于 PbDH Sheet Framework 制作精简的《Witchy 巫趣》人物卡 System Package。优先提供完整、可编辑的车卡内容；复用框架的存档、导入导出、创建引导、检查和打印能力，不把人物卡扩展成自动规则引擎。

## 产品结构

人物卡只有一个页面，不设置 Card Table 或持久 Shell。桌面端人物卡在工作区水平居中，保持 210:297 的 A4 比例；窄屏允许页面缩放或滚动，但所有输入区域必须可到达。打印时只生成一张 A4 人物卡。主体采用左右栏：左栏顶部的大立绘纵向跨越姓名/年龄/原型和原型规则，右栏顶部为三项魔法本质与横向魔力点，并直接衔接魔法区。

## 车卡器通用功能

| 功能 | 框架能力 |
| --- | --- |
| 姓名、年龄 | `freeText` |
| 角色立绘 | `imageField` |
| 车卡流程 | Character Creation Guide + Layout Region |
| 人物卡检查 | Validation Script |
| 单页 A4 排版 | Page + HTML Layout Template |
| 月下手记视觉风格 | System Package Skin |
| 存档、导入导出、打印 | Base Framework 现有能力 |

## 《巫趣》规则功能

| 规则内容 | 表达方式 | 要求 |
| --- | --- | --- |
| 魔力点与蚀痕 | `countableResource` | current/max 初始均为 6，允许编辑 max；降低 max 即表示蚀痕 |
| 残月/月全食 | Validation Script | max 为 1–3 时提示残月及混乱骰改为 d20；max 为 0 时提示月全食；不自动改值 |
| 三项魔法本质 | 3 个放大的 `freeText` | 物质界、精神界、灵界；视觉层级参照 `daggerheart-core` 六属性 |
| 经历 | 5 组名称/修正 `freeText` | 复用 `daggerheart-core` 结构；前两项初始修正默认 +2 |
| 原型 | Resource Library + `resourcePicker` + 文本填充 | 显示为“原型文本框 + 放大镜按钮”；选择后把名称与规则填入人物卡，不提供单独指示物字段 |
| 自创魔法 | 4 组 `freeText` + `longText` | 自由记录名称、意象、表现和用法；前三项纳入初始创建检查，第四项为额外栏位 |
| 终末条件 | `longText` | 自由描述物品或元素构成的终末条件 |
| 命运预兆 | 3 个 `longText` | 分别记录过去、现在、未来 |
| 使魔 | `imageField` + Resource Library + `resourcePicker` + 文本填充 | 左侧头像；右侧依次为名字、类型、特技。资源名称填入“类型”，资源规则填入“特技” |
| 道具 | `longText` | 自由记录，不连接 Resource Library |

不需要开发新的 Base Framework Module。原型和使魔均通过现有 Dependency Engine 的 `fillText` 动作写入普通文本模块。

## 用户故事

1. Player 可以填写基本信息、上传立绘并保存角色。
2. Player 可以在单页 A4 人物卡上完成全部创建内容并打印。
3. Player 可以编辑魔力点当前值和上限，以降低上限表示蚀痕。
4. Player 在魔力点上限进入 1–3 或 0 时，可以在人物卡检查中看到残月或月全食提示。
5. Player 可以像填写 Daggerheart 属性一样醒目地填写三项魔法本质。
6. Player 可以填写至少两项初始经历和后续额外经历。
7. Player 可以通过紧邻原型文本框的放大镜按钮选择原型，并在人物卡中直接查看和编辑原型名称与规则。
8. Player 可以自由创作三个初始魔法和终末条件。
9. Player 可以记录过去、现在与未来三个命运预兆。
10. Player 可以填写使魔名字、上传头像，并从资源库选择类型；类型对应的规则作为特技显示。
11. Player 可以在普通长文本栏自由记录道具，不必从资源库选择。

## 检查规则

Validation Script 只报告客观规则和状态：

- 三项魔法本质必须是整数、创建时各在 -2 到 +2、合计为 0。
- 三个初始魔法必须填写名称或描述。
- 至少填写前两个经历，初始修正通常为 +2。
- 魔力点 max 为 1–3 时报告残月；max 为 0 时报告月全食。

检查不会评价创作质量，也不会自动修改魔力点、属性或文本。

## 创建引导

依次引导：基本信息 → 原型 → 魔法本质 → 经历 → 三个魔法 → 终末条件 → 命运预兆 → 使魔 → 完成。

## 测试验收

- System Package 可通过标准加载管线，无 fatal/error diagnostics。
- 包内没有 `cardTable`，原型 Picker 不创建 Card Instance。
- 原型和使魔类型选择能填入对应文本，并随 Character Save 保存和恢复。
- 魔力点、本质、经历、魔法、预兆和使魔字段可编辑。
- Validation 能覆盖创建约束、残月和月全食。
- Playwright 车卡流程可保存、刷新并恢复数据。
- 打印只有一张页面，比例约为 210:297，水平居中且无内容溢出。
- 390px 宽视口下关键编辑区仍可到达。

## 暂不包含

- Card Table、Card Instance、Card Indicator。
- 自动区分并计算临时蚀痕、永久上限损失与使魔占用；由 #268 单独跟踪。
- 自动调整魔力点上限。
- 原型专属模块或状态机。
- 结构化魔法意象编辑器。
- 大量 `readOnlyDisplay` 规则速查。
- WS 敌人管理、威胁骰、预言自动化、掷骰器、云同步或多人协作。

## 来源

- 规则来源：《Witchy 巫趣》ω1.0。
- 文字与主设计：Lost；审校与设计：一条腿。
- System Package 保留原规则的 Powered by DaggerHeart 与 DPCGL 声明。
