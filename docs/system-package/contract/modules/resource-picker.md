# `resourcePicker` Module

`resourcePicker` 从一个或多个 Resource Library 选择稳定 Entry，也可以通过字面来源 `其他` 访问角色附带的扩展资源。它适合职业、种族、装备和领域卡等需要稳定身份与字段的选择。

库引用、默认查询字段和可选 `创建卡牌` 目标必须在完整包中闭合。多选只改变允许的 Entry 数量，不改变 Entry 本身。选择快照保存在 Character Data；Dependency 可以读取当前选择字段或动态改变默认过滤，但不应依赖数组位置作为身份。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### resourcePicker Module

resourcePicker Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | resourcePicker Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "resourcePicker" | — |
| 按钮文本 | 是 | string | 最短 1 |
| 资源库 | 是 | array \| "其他" | — |
| 资源库<variant 1> | 是 | array | 最少项 1 |
| 资源库<variant 1>[] | 是 | object | — |
| 资源库<variant 1>[].ID | 是 | string | 最短 1 |
| 资源库<variant 1>[].字段模板 | 否 | array | — |
| 资源库<variant 1>[].字段模板[] | 是 | object | — |
| 资源库<variant 1>[].字段模板[].键 | 是 | string | 最短 1 |
| 资源库<variant 1>[].字段模板[].标签 | 否 | string | 最短 1 |
| 资源库<variant 1>[].字段模板[].默认显示 | 否 | boolean | — |
| 资源库<variant 1>[].字段模板[].可筛选 | 否 | boolean | — |
| 资源库<variant 1>[].字段模板[].可排序 | 否 | boolean | — |
| 资源库<variant 1>[].字段模板[].可搜索 | 否 | boolean | — |
| 资源库<variant 1>[].字段模板[].列宽 | 否 | "compact" \| "normal" \| "wide" \| "fill" | — |
| 资源库<variant 1>[].默认查询 | 否 | object | — |
| 资源库<variant 1>[].默认查询.filters | 否 | object | — |
| 资源库<variant 1>[].默认查询.sort | 否 | object | — |
| 资源库<variant 1>[].默认查询.sort.field | 是 | string | 最短 1 |
| 资源库<variant 1>[].默认查询.sort.direction | 否 | "asc" \| "desc" | 默认 "asc" |
| 资源库<variant 2> | 是 | "其他" | — |
| 多选 | 否 | boolean | 默认 false |
| 创建卡牌 | 否 | object | — |
| 创建卡牌.卡牌桌面模块ID | 是 | string | 最短 1 |
| 创建卡牌.默认状态 | 否 | string | 最短 1 |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### resourcePicker 最小例子

引用的资源库和查询字段必须通过完整包 Validator 闭合。

```json
{
  "ID": "pick-class",
  "类型": "resourcePicker",
  "按钮文本": "选择职业",
  "资源库": [
    {
      "ID": "classes",
      "默认查询": {
        "filters": {
          "类型": [
            "基础"
          ]
        },
        "sort": {
          "field": "名称",
          "direction": "asc"
        }
      }
    }
  ],
  "多选": false
}
```

<!-- END GENERATED CONTRACT -->
