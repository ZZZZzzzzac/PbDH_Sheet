# 调试 System Package

先按严重度判断：`fatal` 表示文件无法读取或 JSON 无法形成包；`error` 表示框架契约不成立，不渲染；`warning` 允许渲染；`info/debug` 是非阻塞事实。

每条 PackageIssue 包含稳定 `code`、客观 `text`、兼容 `path`，以及可展开的：

- `location`：包内文件、结构化 pointer、脚本行列。
- `entities`：相关 Page、Module、Resource Library、Dependency 或 Check。
- `evidence`：实际 ID、冲突索引、引用字段和已知候选。

Validator 不提供 suggestion，因为它不知道 Author 想修改引用端还是被引用端。按 evidence 回到源文件判断。

推荐顺序：先解决 fatal，再解决重复 ID/缺失引用等 error，最后检查 warning。不要通过删除 Validator 信息规避契约；包不能自定义、关闭或降级规则。

手测材料位于 `public/system-packages/error-fixtures`。例如 `invalid-dependency-field.zip` 展示字段引用证据，`invalid-validation-script.zip` 展示脚本文件与行列。错误码参考见[Validator diagnostics](../reference/validator-diagnostics.md)。
