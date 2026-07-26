# `readOnlyDisplay` Module

`readOnlyDisplay` 展示包作者提供的静态文字或包内图片。它用于规则提示、标题块和不可编辑说明，不接收用户输入，也不在 Character Data 中保存值。

文字可以使用受限 Markdown；图片必须使用安全包内路径并提供合适的替代文本。需要保存玩家输入时应选择 `freeText`、`longText` 或 `imageField`。Dependency 可以控制它的可见性，但不能向它写入角色数据。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### readOnlyDisplay Module

readOnlyDisplay Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | readOnlyDisplay Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "readOnlyDisplay" | — |
| 标签 | 是 | string | 最短 1 |
| 内容 | 否 | string | 最短 1 |
| 资源路径 | 否 | string | 最短 1 |
| 替代文本 | 否 | string | — |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### readOnlyDisplay 最小例子

静态内容不写入 Character Data。

```json
{
  "ID": "help",
  "类型": "readOnlyDisplay",
  "标签": "说明",
  "内容": "规则文字"
}
```

<!-- END GENERATED CONTRACT -->
