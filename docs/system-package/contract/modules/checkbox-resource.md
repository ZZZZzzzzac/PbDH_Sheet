# `checkboxResource` Module

`checkboxResource` 表示一组独立布尔选项。每个选项有稳定 `ID` 和显示标签；相同 `分组` 的连续选项共享视觉行，但分组不改变布尔语义，也不形成单选。

Character Data 以“选项 ID → boolean”保存。发布后不要复用或随意改变选项 ID。Dependency 可监听勾选变化和判断指定选项；它不会把三态或互斥规则自动推断为 Checkbox 行为，需要转换时由 Adapter 明确映射。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### checkboxResource Module

checkboxResource Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | checkboxResource Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "checkboxResource" | — |
| 标签 | 是 | string | 最短 1 |
| 选项 | 是 | array | 最少项 1 |
| 选项[] | 是 | object | — |
| 选项[].ID | 是 | string | 最短 1 |
| 选项[].标签 | 是 | string | 最短 1 |
| 选项[].默认选中 | 否 | boolean | 默认 false |
| 选项[].分组 | 否 | string | 最短 1 |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### checkboxResource 最小例子

选项 ID 是 Character Data 中的持久键。

```json
{
  "ID": "flags",
  "类型": "checkboxResource",
  "标签": "状态",
  "选项": [
    {
      "ID": "ready",
      "标签": "就绪"
    }
  ]
}
```

<!-- END GENERATED CONTRACT -->
