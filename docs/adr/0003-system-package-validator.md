# ADR-0003: System Package Validator Severity

状态：Accepted
日期：2026-07-06

## 背景

System Package 由 Author 或 AI 生成。Base Framework 必须严格保护结构契约，但不能把普通游戏文本值强制解释成数字、布尔或枚举。

## 决策

Validator 分层输出：

- `fatal`：包无法读取、zip 损坏、manifest 缺失、JSON 解析失败。导入失败。
- `error`：结构契约不成立，如 ID 缺失/重复、引用不存在、模块类型不存在、页面引用不存在模块、资源库引用不存在、检查脚本语法错误。可进入作者错误视图，但不渲染 Sheet Tool。
- `warning`：schema version 不兼容、版本不匹配、未使用资源、未来字段、可疑但不确定的问题。允许渲染。
- `info/debug`：AI 修复用日志，普通 Author 默认折叠。

Validator 只验证 System Package 结构和框架契约，不验证游戏规则正确性，不校验普通 Resource Value 或 Sheet Value 是否为数字、布尔或特定语义。

## 理由

- 结构错误会导致渲染器和运行时行为不可信，必须阻止渲染。
- 值层面保持宽松，符合纸笔角色卡“格子里写字符串”的原则。
- 分层错误便于 Author 和 AI 修复。

## 代价

- 某些游戏规则错误不会被 System Package Validator 发现，需要 Validation Script 报告。
- 不兼容 schema 只 warning，可能出现部分功能不符合预期。

## 后续信号

出现以下信号时，增加更细的兼容检查：

- 不兼容 schema 经常导致运行时错误。
- Author 需要自动升级 manifest 或模块声明。
- AI 修复需要稳定错误码和机器可读路径。
