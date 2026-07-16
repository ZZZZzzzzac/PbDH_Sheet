# Resource Libraries

Resource Library 是可选择的系统资料集合，例如职业、武器或卡牌。manifest 为每个 Library 声明唯一 `ID`、显示 `名称` 和 JSON `路径`。资源文件必须是对象数组；每条至少有非空唯一 `ID`，其他字段属于 Author Data。

```json
[
  { "ID": "class-druid", "名称": "德鲁伊", "初始闪避值": 10, "领域": ["贤者", "奥术"] }
]
```

数字、布尔、数组和对象会规范化成显示文本；框架不会赋予它们游戏语义。Resource Picker 的每个 `资源库[]` 链接可用自己的 `字段模板` 控制 Browser 字段：`键` 必填，`标签`、`默认显示`、`可筛选`、`可排序`、`可搜索`、`列宽` 可选。列宽为 `compact | normal | wide | fill`。

没有字段模板时，框架从条目推断字段；普通文本字段默认显示、可搜索、可筛选和可排序，复杂值通常不参与搜索筛选。框架标识字段 `ID` 是例外：它仍保留在 Entry 中供引用和验证，但 Resource Picker 默认不显示、筛选、排序或搜索它。Author 如确实需要展示 ID，可在该 Picker 的 `字段模板` 中显式配置 `ID` 字段。关键词按空白拆分，忽略大小写，在一条记录的可搜索字段间使用 AND；搜索与精确筛选、排序组合，关闭 Browser 后清空。

每个链接的 `默认查询.filters` 是字段到允许文本数组的映射；`sort.field` 指定字段，方向默认升序。多库 Picker 同时只显示一个 Library，切换后恢复该 Library 本次打开期间的查询；关闭 Browser 后清空。选择 Resource 不直接写 Character Data，通常由 Dependency 的 `fillText` 抄写文本字段，或由 `fillCountable` 将完整整数字段写入 countableResource。
