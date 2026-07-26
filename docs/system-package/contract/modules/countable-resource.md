# `countableResource` Module

`countableResource` 保存当前值和可空上限，适合生命、压力、等级和可消耗槽。数值模式显示输入与加减控制；标记模式将当前与剩余数量投影为文字或图片标记，但不改变持久数据形状。

Character Data 保存 `{current,max}`。最小值、上限、步长和可编辑上限由模块约束；Dependency 的 `fillCountable` 写入同一状态。标记模式必须同时提供不同的当前/剩余 Descriptor；文字 Descriptor 必须是一个可见字素，图片路径遵守包资产合同。三态外部槽如何折算为 current/max 属于 Format Adapter 责任。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### countableResource Module

countableResource Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | countableResource Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "countableResource" | — |
| 标签 | 是 | string | 最短 1 |
| 最小值 | 否 | integer | 默认 0 |
| 最大值 | 否 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| 默认值 | 否 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| 步长 | 否 | integer | 默认 1 |
| 最大值可改 | 否 | boolean | 默认 false |
| 显示方式 | 否 | "数值" \| "标记" | 默认 "数值" |
| 当前值标记 | 否 | object \| object | — |
| 剩余值标记 | 否 | object \| object | — |
| 标记尺寸 | 否 | number | 最小 5；最大 96 |
| 加减号字号 | 否 | number | 最小 5；最大 96 |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### countableResource 标记例子

标记模式必须同时声明当前值和剩余值标记。

```json
{
  "ID": "stress",
  "类型": "countableResource",
  "标签": "压力",
  "最大值": 6,
  "显示方式": "标记",
  "当前值标记": {
    "类型": "文字",
    "内容": "●"
  },
  "剩余值标记": {
    "类型": "图片",
    "资源路径": "assets/empty.webp"
  }
}
```

<!-- END GENERATED CONTRACT -->
