# `longText` Module

`longText` 用于多行字符串和较长的受限 Markdown 内容。它适合经历、说明和事件记录；不提供固定选项，也不承担结构化资源或数值语义。

值以字符串保存在 `character.values[模块ID]`。`行数`控制编辑区域的初始尺寸，不截断实际内容；打印时仍需由 Layout/Skin 为内容分配足够空间。`默认值`只在没有持久值时生效，Dependency 的 `fillText` 可替换或追加内容。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### longText Module

longText Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | longText Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "longText" | — |
| 标签 | 是 | string | — |
| 默认值 | 否 | string | 默认 "" |
| 行数 | 否 | integer | 最小 2；最大 20；默认 4 |
| 隐藏标签 | 否 | boolean | 默认 false |
| 占位文本 | 否 | string | — |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### longText 最小例子

行数控制编辑区域的基准高度。

```json
{
  "ID": "notes",
  "类型": "longText",
  "标签": "记录",
  "行数": 4
}
```

<!-- END GENERATED CONTRACT -->
