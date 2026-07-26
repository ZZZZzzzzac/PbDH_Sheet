# `resourceComposer` Module

`resourceComposer` 从多个资源槽位选择 Entry，并按声明映射生成一个 Composite Resource。它适合把基础装备、材质、特性等组合成角色拥有的单个结构化资源。

每个槽位 ID、资源库引用、来源字段与输出字段必须闭合。框架生成 Composite Resource ID，输出映射不能覆盖身份。关系输出只根据声明的相同/不全相同条件写值，不执行任意脚本。可选 `创建卡牌` 将组合结果投影到 Card Table，但不会复制或修改来源 Entry。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### resourceComposer Module

resourceComposer Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | resourceComposer Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "resourceComposer" | — |
| 按钮文本 | 是 | string | 最短 1 |
| 来源槽位 | 是 | array | 最少项 1 |
| 来源槽位[] | 是 | object | — |
| 来源槽位[].ID | 是 | string | 最短 1 |
| 来源槽位[].标签 | 是 | string | 最短 1 |
| 来源槽位[].资源库ID | 是 | string | 最短 1 |
| 来源槽位[].字段模板 | 否 | array | — |
| 来源槽位[].字段模板[] | 是 | object | — |
| 来源槽位[].字段模板[].键 | 是 | string | 最短 1 |
| 来源槽位[].字段模板[].标签 | 否 | string | 最短 1 |
| 来源槽位[].字段模板[].默认显示 | 否 | boolean | — |
| 来源槽位[].字段模板[].可筛选 | 否 | boolean | — |
| 来源槽位[].字段模板[].可排序 | 否 | boolean | — |
| 来源槽位[].字段模板[].可搜索 | 否 | boolean | — |
| 来源槽位[].字段模板[].列宽 | 否 | "compact" \| "normal" \| "wide" \| "fill" | — |
| 输出字段 | 是 | array | 最少项 1 |
| 输出字段[] | 是 | object | — |
| 输出字段[].字段 | 是 | string | 最短 1 |
| 输出字段[].来源槽位ID | 是 | string | 最短 1 |
| 输出字段[].来源字段 | 是 | string | 最短 1 |
| 选择关系输出 | 否 | object | — |
| 选择关系输出.字段 | 是 | string | 最短 1 |
| 选择关系输出.全部相同时 | 是 | string | 最短 1 |
| 选择关系输出.不全相同时 | 是 | string | 最短 1 |
| 创建卡牌 | 否 | object | — |
| 创建卡牌.卡牌桌面模块ID | 是 | string | 最短 1 |
| 创建卡牌.默认状态 | 否 | string | 最短 1 |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### resourceComposer 最小例子

槽位、输出字段和来源字段引用必须闭合。

```json
{
  "ID": "compose-item",
  "类型": "resourceComposer",
  "按钮文本": "组合物品",
  "来源槽位": [
    {
      "ID": "base",
      "标签": "基础",
      "资源库ID": "items"
    }
  ],
  "输出字段": [
    {
      "字段": "名称",
      "来源槽位ID": "base",
      "来源字段": "名称"
    }
  ]
}
```

<!-- END GENERATED CONTRACT -->
