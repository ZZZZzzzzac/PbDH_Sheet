# Resource Composer interface

Resource Composer 是无状态的多输入单输出 Sheet Module。每个具名来源槽位从一个 Resource Library 单选一个 Entry；确认后按 Author 声明的一对一字段路由生成一个 Composite Resource。来源选择是临时 UI 状态，只有最终输出写入 Character Data。

```json
{
  "ID": "compose-ancestry",
  "类型": "resourceComposer",
  "按钮文本": "选择种族",
  "来源槽位": [
    { "ID": "a", "标签": "特性 A 来源", "资源库ID": "ancestries", "字段模板": [{ "键": "类型", "默认显示": false }] },
    { "ID": "b", "标签": "特性 B 来源", "资源库ID": "ancestries" }
  ],
  "输出字段": [
    { "字段": "特性A", "来源槽位ID": "a", "来源字段": "特性A" },
    { "字段": "特性B", "来源槽位ID": "b", "来源字段": "特性B" }
  ],
  "创建卡牌": { "卡牌桌面模块ID": "cards", "默认状态": "配置" }
}
```

`来源槽位` 与 `输出字段` 都至少一项；槽位 ID 和输出字段名各自唯一。输出字段不能是框架生成的 `ID`。每个槽位必须引用存在的 Resource Library，并可声明与 Picker Library Link 相同语义的 `字段模板`；每条路由必须引用存在的槽位与来源字段。

多个槽位允许选择同一 Entry。Player 点击 Composer 后按槽位顺序直接进入对应 Resource Library；标题显示“请选择{槽位标签}”，最后一个槽位选完立即生成。每个 Composer Module 在一个角色中拥有一个稳定输出；再次完成选择会覆盖该 Composite Resource。Composer 不保存来源 Entry 引用，重新打开时从第一个空槽位开始。中途关闭不修改 Character Data。

Composer 输出与 Resource Picker 使用相同的 `resourceSelected` Dependency 合同。Composer 只复制字段，不支持常量、模板、条件、算术、脚本、循环或可变数量聚合。展示字符串应由 Dependency 模板或 Card Presentation 生成。

配置 `创建卡牌` 时，目标 Card Table 的 `资源来源` 必须包含 `{类型:"resourceComposer", ID: Composer ID}`。重复确认复用现有 Card Instance；删除卡牌不删除 Composite Resource。
