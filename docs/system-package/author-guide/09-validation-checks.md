# Validation Checks

Validation Check 是只读 JavaScript，用来检查 Player 已填写的角色是否符合具体游戏规则。manifest 声明唯一 `ID` 和脚本路径；每个脚本在独立 Web Worker 中运行并接收输入副本。

```js
module.exports = (input) => {
  const name = input.characterData.values["character-name"];
  return name ? [] : [{ level: "warning", text: "角色名尚未填写", path: "values.character-name", code: "NAME_EMPTY" }];
};
```

脚本返回 issue 数组。`level` 为 `error | warning | info`，`text` 必填；`path` 和 `code` 可选。框架会补充 Validation Check ID 作为 source。

输入包含 Character Data、Resource Libraries、Card State 和 Package Metadata 的只读副本。脚本不能访问 DOM、框架 Store、IndexedDB 或外部服务，不能修改 Character Data。超时、抛异常和非法输出会被 Validation Runner 转为 issue。

System Package Validator 在导入时只解析 JavaScript 语法，不执行脚本。导出前会运行 Checks，但 warning/error 只提示，不硬阻止 Player 输出。
