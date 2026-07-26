# `freeText` Module

`freeText` 用于单行字符串。省略 `选项` 时渲染文字输入；提供非空 `选项` 时渲染固定选项下拉。它适合姓名、短标签和枚举选择，不适合多段文本、数字计算或资源身份。

值以字符串保存在 `character.values[模块ID]`。`默认值` 只在没有持久值时生效；Dependency 可以填入内容或改变占位文本。隐藏标签时仍保留可访问名称。选项文字是保存值，因此发布后改变它可能影响旧角色；需要稳定身份的选择应使用 [`resourcePicker`](resource-picker.md)。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### freeText Module

freeText Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | freeText Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "freeText" | — |
| 标签 | 是 | string | — |
| 默认值 | 否 | string | 默认 "" |
| 隐藏标签 | 否 | boolean | 默认 false |
| 占位文本 | 否 | string | — |
| 选项 | 否 | array | 最少项 1 |
| 选项[] | 是 | string | — |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### freeText 最小例子

选项存在时显示下拉；省略时显示单行文字输入。

```json
{
  "ID": "name",
  "类型": "freeText",
  "标签": "姓名",
  "选项": [
    "A",
    "B"
  ]
}
```

<!-- END GENERATED CONTRACT -->
