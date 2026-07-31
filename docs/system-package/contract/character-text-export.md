# 人物文本导出合同

## 定位

Character Text Export 是 Author 声明的只读文本格式化能力。它从 Character Data 读取少量 Module Value，生成一段供剪贴板粘贴的文本；不修改 Character Save，也不生成可重新导入的人物文件，因此不是 Character Format Adapter。

一个 System Package 可通过 manifest 的 `characterTextExports` 路径声明多个导出格式。每项 `名称` 是导入导出菜单中的完整标签；菜单按声明顺序显示。未声明时不显示任何人物文本导出项。

## 模板

每项导出包含两层模板：

- 总 `模板` 中的 `{字段}` 替换为所有有效字段的拼接结果；
- 每个字段 `模板` 中的 `{值}` 替换为该 Module 的规范化整数；
- 字段按声明顺序生成，并使用 `字段分隔符` 连接；
- 已知占位符可出现任意次数；未知占位符保持原文；模板内容不做目标平台语义校验；
- 最终输出去除首尾空白。全部字段被跳过时仍可输出模板静态部分，例如 `.st`。

## Module 取值

支持三种 `取值`：

- `文本`：只可引用 `freeText` 或 `longText`；
- `当前值`：只可引用 `countableResource.current`；
- `最大值`：只可引用 `countableResource.max`。

Module ID 不存在，或 Module 类型与 `取值` 不兼容，属于 Author 配置错误并阻止 System Package 加载。Player 数据则宽松处理：去除文本首尾空白后，只接受有符号十进制安全整数；`+1`、`01` 会规范化为 `1`。空值、小数、非数字与超出 JavaScript 安全整数范围的值只跳过当前字段，不中断导出。

## 示例

```json
[
  {
    "ID": "sealdice",
    "名称": "导出为海豹骰",
    "模板": ".st {字段}",
    "字段分隔符": "",
    "字段": [
      { "模块ID": "agility", "取值": "文本", "模板": "敏捷{值}" },
      { "模块ID": "hp", "取值": "当前值", "模板": "生命{值}" },
      { "模块ID": "hp", "取值": "最大值", "模板": "生命上限{值}" }
    ]
  }
]
```

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Character Text Export declarations

Character Data Module Value 到剪贴板文本的声明式格式化规则。

语义约束：

- Module ID 必须存在；文本只适用于 freeText/longText，当前值与最大值只适用于 countableResource。
- Player 值不是有符号十进制安全整数时只跳过字段；导出不会修改 Character Save。
- 总模板替换 {字段}，字段模板替换 {值}；未知占位符保留。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | array | 最少项 1；Character Data Module Value 到剪贴板文本的声明式格式化规则。 |
| $[] | 是 | object | — |
| $[].ID | 是 | string | 最短 1 |
| $[].名称 | 是 | string | 最短 1 |
| $[].模板 | 是 | string | — |
| $[].字段分隔符 | 是 | string | — |
| $[].字段 | 是 | array | — |
| $[].字段[] | 是 | object | — |
| $[].字段[].模块ID | 是 | string | 最短 1 |
| $[].字段[].取值 | 是 | "文本" \| "当前值" \| "最大值" | — |
| $[].字段[].模板 | 是 | string | — |

<!-- END GENERATED CONTRACT -->
