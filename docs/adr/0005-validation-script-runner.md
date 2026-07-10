# ADR-0005: Validation Script Runner

状态：Accepted
日期：2026-07-06

## 背景

声明式检查无法覆盖 PbDH 规则中的复杂公式、查表、例外和文本化规则。Author 需要写 JS 检查脚本，根据当前 Character Data 和 Resource Libraries 输出检查报告。但脚本不能修改角色状态、DOM 或 Base Framework。

## 决策

第一版支持多个 JS Validation Scripts：

- System Package 声明多个检查脚本；执行顺序即 manifest 中 `validationChecks` 数组的声明顺序，无需单独的顺序字段，框架按该顺序串行运行。
- 每个脚本在独立 Web Worker 中执行。
- 输入包含 Character Data、Resource Libraries、System Package 标识等数据副本。
- Worker 内对输入做只读保护，脚本修改输入不会影响主应用真实状态。
- 脚本输出 issue list。
- 输出项最小结构为 `level` 和 `text`，可选 `path` 和 `code`。
- `level` 为 `error`、`warning` 或 `info`。
- 主应用合并所有脚本结果，并补充脚本来源信息。
- 脚本触发时机为手动检查和导出/打印前检查。
- `error` 只提醒，不硬阻止导出/打印；玩家可继续。
- 脚本不能导入外部依赖，不提供状态修改 API，不提供 DOM API。

## 理由

- Web Worker 没有 DOM，能降低脚本误改 UI 的风险。
- 数据副本和只读保护能避免脚本改 Character Data。
- 多脚本比单一总脚本更便于 Author 和 AI 维护。
- 一次返回多个 issue，玩家和 Author 能一次看到完整问题。

## 代价

- Web Worker 不是绝对安全的恶意代码沙箱。
- 需要处理脚本超时、异常、输出过长和格式错误。
- 不能使用外部库，复杂检查需要 Author 自写逻辑。

## 后续信号

出现以下信号时，升级执行沙箱：

- 需要安全运行陌生来源 System Package。
- Validation Scripts 经常卡死或消耗大量资源。
- Author 强烈需要受控依赖库。
- 需要更强隔离，如 QuickJS/WASM。
