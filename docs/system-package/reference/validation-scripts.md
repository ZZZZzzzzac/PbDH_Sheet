# Validation Script interface

manifest declaration：`{ ID: non-empty unique string, 脚本: safe relative path }`。Loader 读取为 runtime `{ID, 脚本, scriptContent}`。Validator 用 JavaScript parser 检查 syntax，不执行。

脚本形态：CommonJS assignment，导出一个接收 input 的函数；可同步或返回 Promise。

```js
module.exports = async (input) => [];
```

Input：

```text
characterData: cloned Character Data
resourceLibraries: normalized libraries
cardState: current Card Instance state
packageMetadata: package identity/version metadata
```

输入被 structured clone/deep freeze，不提供 DOM、fetch、框架 mutation API 或外部 dependency。每个 Check 使用独立 Worker，当前 timeout 为 3000 ms。

Raw issue 必须是对象：`level: error|warning|info`、`text: string`，可选 `path:string`、`code:string`。Normalizer 加 `source = Validation Check ID`。非数组结果、非法项、异常与 timeout 会转成 framework issue。

Checks 与 System Package Validator 不同：前者检查具体 Player 数据，只报告不写入；后者检查包结构并决定是否渲染。

手动“检查”与导出前检查还会运行 Base Framework 内建的 Framework Checks。Framework Checks 可读取框架拥有的渲染状态，但不属于 Validation Script，也不在 System Package 中声明。两类 issue 使用同一个 Validation Report；Author issue 的 `source` 是 Validation Check ID，Framework issue 的 `source` 是 `framework`。
