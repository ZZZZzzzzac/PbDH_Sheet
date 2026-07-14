# Dependency Logic

Dependency Logic 是唯一允许跨模块联动的声明式规则。每条规则包含唯一 `ID`、`sources`、`targets`、`触发`、可选 `条件` 和非空 `动作`。

```json
[
  {
    "ID": "fill-class-name",
    "sources": [{ "类型": "resourcePicker", "模块ID": "pick-class" }],
    "targets": [{ "类型": "module", "模块ID": "class-name" }],
    "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" },
    "条件": { "类型": "always" },
    "动作": [{
      "类型": "fillText",
      "目标模块ID": "class-name",
      "内容": { "类型": "selectedResourceField", "字段": "名称" }
    }]
  }
]
```

触发只有 Resource Picker 的 `resourceSelected` 和 Checkbox Resource 的 `checkboxChanged`。条件支持 `always`、选中资源字段相等/不等/包含，以及 checkbox option 已选/未选。动作支持填充文本、填充 Countable State、设置 Page/Module 可见性，以及给 Resource Picker 设置默认精确筛选。

需要把多个资源字段写进一个文本框时，使用格式模板；需要保留 Player 已有文本时再选择追加：

```json
{
  "类型": "fillText",
  "目标模块ID": "inventory",
  "写入方式": "追加",
  "追加分隔符": "\n\n",
  "内容": {
    "类型": "selectedResourceTemplate",
    "格式": "**{{名称}}**\n{{描述}}"
  }
}
```

`{{字段}}`必须是来源 Resource Library 的字段。多选 Picker 会逐条套用格式；可用`内容.分隔符`控制本次多条结果之间的连接。追加只支持 freeText/longText；它生成普通可编辑文本，不保存资源引用，也不会在 Player 修改后自动同步。

`fillCountable` 可从整数常量或选中 Resource 的文本字段写入 `countableResource` 的当前值、上限值或两者：

```json
{
  "类型": "fillCountable",
  "目标模块ID": "class-hp",
  "当前值": { "类型": "selectedResourceField", "字段": "初始生命点" },
  "最大值": { "类型": "selectedResourceField", "字段": "初始生命点" }
}
```

资源文本必须是完整整数，例如 `"6"`；`"6点"` 不会被猜测或部分解析。只更新一项时另一项保持不变，`最大值: null` 表示移除上限。多选 Picker 必须用 `选择索引` 指定一个条目。

规则单轮计算：本轮产生的填充值不会继续触发另一条规则。规则不读 DOM、Guide 或 Validation 结果，不能执行任意代码。`fillText` 写 freeText/longText 时修改 Character Data；写 readOnlyDisplay 时只改变派生展示。`fillCountable` 写入 Character Data，并按目标最小值和最终上限约束当前值。详细 union 见[Dependency Reference](../reference/dependency-rules.md)。
