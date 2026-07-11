# System Package Validator 诊断契约

System Package Validator 的规则只由 Base Framework schema、模块接口、引用契约和已接受 ADR 决定。System Package 的数据、逻辑与资源只作为被检查输入和诊断证据，不能声明、覆盖、关闭或降级规则。

## PackageIssue

```ts
interface PackageIssue {
  level: "fatal" | "error" | "warning" | "info" | "debug";
  code: string;
  text: string;
  path?: string;
  location?: {
    pointer: Array<string | number>;
    file?: string;
    line?: number;
    column?: number;
  };
  entities?: Array<{
    kind: "manifest" | "page" | "module" | "asset" | "resourceLibrary" |
      "resourceEntry" | "dependency" | "validationCheck" | "guideStep";
    id?: string;
    index?: number;
  }>;
  evidence?: Array<{ label: string; value: unknown }>;
}
```

- `code` 是框架定义的稳定机器可读分类。
- `text` 只客观描述检测事实，不推测 Author 的修改意图。
- `path` 保留兼容的点分逻辑路径。
- `location.pointer` 是结构化逻辑路径；Loader 有来源信息时同时提供包内 `file`。
- JavaScript 语法位置由解析器提供 `line` 和 `column`。
- `entities` 指出相关框架领域实体。
- `evidence` 来自当前校验现场，例如冲突索引、实际引用字段和已知字段集合。
- UI、Author 和 Author 的 AI 消费同一份诊断；不存在另一套 AI debug 格式。

## 严重度

| Level | 行为 |
| --- | --- |
| `fatal` | 包无法读取或无法形成可校验结构，导入失败。 |
| `error` | 框架结构或引用契约不成立，不渲染 Sheet Tool。 |
| `warning` | 可疑或存在兼容风险，允许渲染。 |
| `info` | 非阻塞的框架说明。 |
| `debug` | 非阻塞的详细检测事实。 |

## 第一版新增错误码

| Code | 契约 |
| --- | --- |
| `DUPLICATE_PAGE_ID` | Page ID 必须唯一。 |
| `DUPLICATE_ASSET_ID` | Asset ID 必须唯一。 |
| `DUPLICATE_VALIDATION_CHECK_ID` | Validation Check ID 必须唯一。 |
| `DUPLICATE_CHECKBOX_OPTION_ID` | 同一个 Checkbox Resource 内的 option ID 必须唯一。 |
| `MISSING_CHECKBOX_OPTION_REFERENCE` | Dependency checkbox condition 引用的 option 必须存在于来源模块。 |
| `CARD_DEFINITION_FIELD_MISSING` | 被 Card Table 消费的 Resource Entry 必须提供配置后的卡名与描述字段。 |
| `MISSING_RESOURCE_FIELD_REFERENCE` | Dependency 引用的字段必须能由对应 Resource Library 解释。 |
| `VALIDATION_SCRIPT_SYNTAX_INVALID` | Validation Script 必须是可解析的 JavaScript；脚本不会在 Validator 中执行。 |

Resource Library ID 和 Resource Entry ID 的唯一性由 Resource Library normalization 契约继续报告；Module、Dependency Rule 与 Guide Step 的既有唯一性错误码保持不变。

## 边界

Validator 不检查普通 Resource Value 或 Sheet Value 的游戏语义，不判断数值平衡，不执行 Validation Script，不自动修复包，也不提供 `suggestion`。脚本执行异常、超时与非法输出继续由 Validation Runner 报告。
