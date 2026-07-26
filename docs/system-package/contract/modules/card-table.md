# `cardTable` Module

`cardTable` 管理持久 Card Instance。Card Definition 来自 Resource Library、Composite Resource 或其他资源；Table 只保存引用、位置、状态、翻面、旋转、缩放和指示物，不把资源字段复制成另一份真相。

每个来源的名称、描述和标签模板只能引用真实字段。文字卡和图片卡共享状态语义；图片仅作为展示，外部格式只有纯卡图而文字才是权威内容时，Adapter 应导入文字卡。状态选项、卡背引用和展示字段必须在完整包中闭合。Table 交互不得回写 Resource Entry。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### cardTable Module

cardTable Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | cardTable Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "cardTable" | — |
| 标签 | 是 | string | 最短 1 |
| 资源来源 | 是 | array | 最少项 1 |
| 资源来源[] | 是 | object \| object \| object | — |
| 资源来源[]<resourceLibrary> | 是 | object | — |
| 资源来源[]<resourceLibrary>.类型 | 是 | "resourceLibrary" | — |
| 资源来源[]<resourceLibrary>.ID | 是 | string | 最短 1 |
| 资源来源[]<resourceLibrary>.卡牌展示 | 否 | object | — |
| 资源来源[]<resourceLibrary>.卡牌展示.名称模板 | 否 | string | 最短 1 |
| 资源来源[]<resourceLibrary>.卡牌展示.描述模板 | 否 | string | 最短 1 |
| 资源来源[]<resourceLibrary>.卡牌展示.标签字段 | 否 | array | — |
| 资源来源[]<resourceLibrary>.卡牌展示.标签字段[] | 是 | string | 最短 1 |
| 资源来源[]<resourceComposer> | 是 | object | — |
| 资源来源[]<resourceComposer>.类型 | 是 | "resourceComposer" | — |
| 资源来源[]<resourceComposer>.ID | 是 | string | 最短 1 |
| 资源来源[]<resourceComposer>.卡牌展示 | 否 | object | — |
| 资源来源[]<resourceComposer>.卡牌展示.名称模板 | 否 | string | 最短 1 |
| 资源来源[]<resourceComposer>.卡牌展示.描述模板 | 否 | string | 最短 1 |
| 资源来源[]<resourceComposer>.卡牌展示.标签字段 | 否 | array | — |
| 资源来源[]<resourceComposer>.卡牌展示.标签字段[] | 是 | string | 最短 1 |
| 资源来源[]<otherResourceLibraries> | 是 | object | — |
| 资源来源[]<otherResourceLibraries>.类型 | 是 | "otherResourceLibraries" | — |
| 资源来源[]<otherResourceLibraries>.ID | 是 | "其他" | — |
| 资源来源[]<otherResourceLibraries>.卡牌展示 | 否 | object | — |
| 资源来源[]<otherResourceLibraries>.卡牌展示.名称模板 | 否 | string | 最短 1 |
| 资源来源[]<otherResourceLibraries>.卡牌展示.描述模板 | 否 | string | 最短 1 |
| 资源来源[]<otherResourceLibraries>.卡牌展示.标签字段 | 否 | array | — |
| 资源来源[]<otherResourceLibraries>.卡牌展示.标签字段[] | 是 | string | 最短 1 |
| 状态选项 | 否 | array | 最少项 1 |
| 状态选项[] | 是 | string | 最短 1 |
| 状态外观 | 否 | object | — |
| 显示方式 | 否 | "image" \| "text" | 默认 "image" |
| 卡图字段 | 否 | string | 最短 1 |
| 卡背字段 | 否 | string | 最短 1 |
| 显示方式字段 | 否 | string | 最短 1 |
| 背面卡牌ID字段 | 否 | string | 最短 1 |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### cardTable 最小例子

来源可混合原生库、Composer 和其他资源。

```json
{
  "ID": "cards",
  "类型": "cardTable",
  "标签": "卡牌",
  "资源来源": [
    {
      "类型": "resourceLibrary",
      "ID": "cards"
    },
    {
      "类型": "resourceComposer",
      "ID": "compose-item"
    },
    {
      "类型": "otherResourceLibraries",
      "ID": "其他"
    }
  ],
  "状态选项": [
    "当前",
    "已消耗"
  ]
}
```

<!-- END GENERATED CONTRACT -->
