# Character Creation Guide 与验证合同

## Character Creation Guide

Guide 是展示层 spotlight tour，用步骤引导用户访问 Page、Module 或说明内容。它可以控制文案、顺序与聚焦目标，但不能直接写入 Character Data、模拟模块事件或替代 Dependency。

每个 Step 使用稳定 ID，目标引用必须存在且在执行时可见。作者应考虑隐藏页面、响应式布局、键盘操作、跳过/退出与恢复。修改 Guide 不应改变角色数据结果。

## Validation Script

Validation Check 在 manifest 中声明稳定 `ID` 与包内 `.js` 路径。Loader 读取脚本为 `scriptContent`，先做 JavaScript 语法检查，再在隔离 Worker 中执行。

脚本使用 CommonJS 入口：

```js
module.exports = async function validate(context) {
  return [];
};
```

context 提供只读 Character Data、Resource Libraries、Card state 与 package metadata。完整输入、输出和 TypeScript 类型见本文件下方自动生成部分。返回 issue 数组，issue 应含稳定 `code`、`level`、面向用户的文字，并尽可能给路径。脚本不得访问 DOM、网络、文件系统、宿主持久化或未声明全局变量；生产 Worker 超时见[Package 与资产合同](package-and-assets.md#运行时安全上限)，脚本应可重复执行并对相同输入给相同结果。

Validation 是诊断，不自动修复或覆盖 Character Data。

## Validator 诊断

包诊断级别为 `fatal | error | warning | info | debug`，并可带：

- `code`：稳定机器标识；
- `text`：可读说明；
- `path` 与 location：JSON pointer、文件、行列；
- entities：manifest/page/module/resource/dependency/check/guide 等实体；
- evidence：触发问题的字段和值。

常见结构诊断包括 `PACKAGE_SHAPE_INVALID`、`UNSUPPORTED_MODULE_TYPE`、`UNSUPPORTED_DEPENDENCY_TRIGGER`、`UNSUPPORTED_DEPENDENCY_SOURCE_MODULE`。具体 code 集合由源码定义；文档不复制一份可能漂移的完整枚举。

处理顺序：先语法与路径，再结构和唯一性，然后引用闭合、模板字段、依赖类型与脚本。修复后重新从源文件加载，不复用旧缓存结果。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Character Creation Guide

线性 Guide Steps 与可选 Page/Module/Layout Region 目标。

语义约束：

- 无目标 Step 合法；它只显示说明面板。
- region 目标由 Layout 元素的 data-guide-region-id 声明；ID 必须非空并在有效 Layout 中存在。
- Guide 只聚焦和解释，不写 Character Data。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 线性 Guide Steps 与可选 Page/Module/Layout Region 目标。 |
| 步骤 | 是 | array | 最少项 1 |
| 步骤[] | 是 | object | — |
| 步骤[].ID | 是 | string | 最短 1 |
| 步骤[].标题 | 是 | string | 最短 1 |
| 步骤[].说明 | 是 | string | 最短 1 |
| 步骤[].目标 | 否 | object \| object \| object | — |
| 步骤[].目标<module> | 否 | object | — |
| 步骤[].目标<module>.类型 | 是 | "module" | — |
| 步骤[].目标<module>.模块ID | 是 | string | 最短 1 |
| 步骤[].目标<page> | 否 | object | — |
| 步骤[].目标<page>.类型 | 是 | "page" | — |
| 步骤[].目标<page>.页面ID | 是 | string | 最短 1 |
| 步骤[].目标<region> | 否 | object | — |
| 步骤[].目标<region>.类型 | 是 | "region" | — |
| 步骤[].目标<region>.区域ID | 是 | string | 最短 1 |

### Validation Check declaration

manifest 内的 Check ID 与脚本路径。

语义约束：

- 脚本必须能被 Acorn 解析，并在隔离 Worker 中执行。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | manifest 内的 Check ID 与脚本路径。 |
| ID | 是 | string | 最短 1 |
| 脚本 | 是 | string | 最短 1 |

### Script API: validationInput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。
- cardState 与 characterData.cards 指向同一份只读 Card 状态快照；resourceLibraries 已归一化为字符串字段。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；隔离 Package Script Worker 的结构化输入或输出合同。 |
| characterData | 是 | object | 未知字段不属于合同 |
| characterData.kind | 是 | "pbdh-character-data" | — |
| characterData.schemaVersion | 是 | "0.1.0" | — |
| characterData.systemPackage | 是 | object | 未知字段不属于合同 |
| characterData.systemPackage.id | 是 | string | 最短 1 |
| characterData.systemPackage.version | 是 | string | 最短 1 |
| characterData.character | 是 | object | 未知字段不属于合同 |
| characterData.character.id | 是 | string | 最短 1 |
| characterData.character.values | 是 | object | — |
| characterData.cards | 是 | object | 默认 {"instances":[]}；未知字段不属于合同 |
| characterData.cards.instances | 是 | array | — |
| characterData.cards.instances[] | 是 | object | 未知字段不属于合同 |
| characterData.cards.instances[].instanceId | 是 | string | 最短 1 |
| characterData.cards.instances[].tableModuleId | 是 | string | 最短 1 |
| characterData.cards.instances[].definitionRef | 否 | object \| object | — |
| characterData.cards.instances[].definitionRef<resourceLibrary> | 否 | object | 未知字段不属于合同 |
| characterData.cards.instances[].definitionRef<resourceLibrary>.type | 是 | "resourceLibrary" | — |
| characterData.cards.instances[].definitionRef<resourceLibrary>.libraryId | 是 | string | 最短 1 |
| characterData.cards.instances[].definitionRef<resourceLibrary>.entryId | 是 | string | 最短 1 |
| characterData.cards.instances[].definitionRef<compositeResource> | 否 | object | 未知字段不属于合同 |
| characterData.cards.instances[].definitionRef<compositeResource>.type | 是 | "compositeResource" | — |
| characterData.cards.instances[].definitionRef<compositeResource>.compositeResourceId | 是 | string | 最短 1 |
| characterData.cards.instances[].libraryId | 否 | string | 最短 1 |
| characterData.cards.instances[].definitionId | 否 | string | 最短 1 |
| characterData.cards.instances[].state | 是 | string | — |
| characterData.cards.instances[].xPct | 是 | number | — |
| characterData.cards.instances[].yPct | 是 | number | — |
| characterData.cards.instances[].zIndex | 是 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| characterData.cards.instances[].face | 是 | "front" \| "back" | — |
| characterData.cards.instances[].rotation | 是 | number | — |
| characterData.cards.instances[].scale | 是 | number | — |
| characterData.cards.instances[].indicators | 是 | array \| object | 默认 [] |
| characterData.cards.instances[].indicators<variant 1> | 是 | array | 最多项 10 |
| characterData.cards.instances[].indicators<variant 1>[] | 是 | object | 未知字段不属于合同 |
| characterData.cards.instances[].indicators<variant 1>[].indicatorId | 是 | string | 最短 1 |
| characterData.cards.instances[].indicators<variant 1>[].colorIndex | 是 | integer | 最小 0；最大 9 |
| characterData.cards.instances[].indicators<variant 1>[].value | 是 | integer | 最小 0；最大 9007199254740991 |
| characterData.cards.instances[].indicators<variant 2> | 是 | object | — |
| characterData.cards.instances[].tokenCount | 否 | integer | 最小 0；最大 9007199254740991 |
| characterData.compositeResources | 是 | object | 默认 {} |
| characterData.resourceSelections | 是 | object | 默认 {} |
| characterData.playerImages | 是 | object | 默认 {} |
| characterData.updatedAt | 是 | string | 最短 1 |
| resourceLibraries | 是 | array | — |
| resourceLibraries[] | 是 | object | 未知字段不属于合同 |
| resourceLibraries[].ID | 是 | string | 最短 1 |
| resourceLibraries[].名称 | 是 | string | 最短 1 |
| resourceLibraries[].路径 | 是 | string | 最短 1 |
| resourceLibraries[].fields | 是 | array | — |
| resourceLibraries[].fields[] | 是 | object | 未知字段不属于合同 |
| resourceLibraries[].fields[].key | 是 | string | 最短 1 |
| resourceLibraries[].fields[].label | 是 | string | 最短 1 |
| resourceLibraries[].fields[].visible | 是 | boolean | — |
| resourceLibraries[].fields[].filterable | 是 | boolean | — |
| resourceLibraries[].fields[].sortable | 是 | boolean | — |
| resourceLibraries[].fields[].searchable | 是 | boolean | 默认 true |
| resourceLibraries[].fields[].width | 否 | "compact" \| "normal" \| "wide" \| "fill" | — |
| resourceLibraries[].entries | 是 | array | — |
| resourceLibraries[].entries[] | 是 | object | 未知字段不属于合同 |
| resourceLibraries[].entries[].ID | 是 | string | 最短 1 |
| resourceLibraries[].entries[].aliases | 否 | array | — |
| resourceLibraries[].entries[].aliases[] | 是 | string | 最短 1 |
| resourceLibraries[].entries[].fields | 是 | object | — |
| cardState | 是 | object | 默认 {"instances":[]}；未知字段不属于合同 |
| cardState.instances | 是 | array | — |
| cardState.instances[] | 是 | object | 未知字段不属于合同 |
| cardState.instances[].instanceId | 是 | string | 最短 1 |
| cardState.instances[].tableModuleId | 是 | string | 最短 1 |
| cardState.instances[].definitionRef | 否 | object \| object | — |
| cardState.instances[].definitionRef<resourceLibrary> | 否 | object | 未知字段不属于合同 |
| cardState.instances[].definitionRef<resourceLibrary>.type | 是 | "resourceLibrary" | — |
| cardState.instances[].definitionRef<resourceLibrary>.libraryId | 是 | string | 最短 1 |
| cardState.instances[].definitionRef<resourceLibrary>.entryId | 是 | string | 最短 1 |
| cardState.instances[].definitionRef<compositeResource> | 否 | object | 未知字段不属于合同 |
| cardState.instances[].definitionRef<compositeResource>.type | 是 | "compositeResource" | — |
| cardState.instances[].definitionRef<compositeResource>.compositeResourceId | 是 | string | 最短 1 |
| cardState.instances[].libraryId | 否 | string | 最短 1 |
| cardState.instances[].definitionId | 否 | string | 最短 1 |
| cardState.instances[].state | 是 | string | — |
| cardState.instances[].xPct | 是 | number | — |
| cardState.instances[].yPct | 是 | number | — |
| cardState.instances[].zIndex | 是 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| cardState.instances[].face | 是 | "front" \| "back" | — |
| cardState.instances[].rotation | 是 | number | — |
| cardState.instances[].scale | 是 | number | — |
| cardState.instances[].indicators | 是 | array \| object | 默认 [] |
| cardState.instances[].indicators<variant 1> | 是 | array | 最多项 10 |
| cardState.instances[].indicators<variant 1>[] | 是 | object | 未知字段不属于合同 |
| cardState.instances[].indicators<variant 1>[].indicatorId | 是 | string | 最短 1 |
| cardState.instances[].indicators<variant 1>[].colorIndex | 是 | integer | 最小 0；最大 9 |
| cardState.instances[].indicators<variant 1>[].value | 是 | integer | 最小 0；最大 9007199254740991 |
| cardState.instances[].indicators<variant 2> | 是 | object | — |
| cardState.instances[].tokenCount | 否 | integer | 最小 0；最大 9007199254740991 |
| packageMetadata | 是 | object | 未知字段不属于合同 |
| packageMetadata.id | 是 | string | 最短 1 |
| packageMetadata.version | 是 | string | 最短 1 |

### Script API: validationOutput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。
- 脚本只返回 level/text/path/code；source 由 Host 使用 Check ID 注入。location/evidence 不属于 Validation Script 输出合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | array \| object | 隔离 Package Script Worker 的结构化输入或输出合同。 |
| $<variant 1> | 是 | array | — |
| $<variant 1>[] | 是 | object | — |
| $<variant 1>[].level | 是 | "error" \| "warning" \| "info" | — |
| $<variant 1>[].text | 是 | string | 最短 1 |
| $<variant 1>[].path | 否 | string | — |
| $<variant 1>[].code | 否 | string | — |
| $<variant 2> | 是 | object | — |
| $<variant 2>.issues | 是 | array | — |
| $<variant 2>.issues[] | 是 | object | — |
| $<variant 2>.issues[].level | 是 | "error" \| "warning" \| "info" | — |
| $<variant 2>.issues[].text | 是 | string | 最短 1 |
| $<variant 2>.issues[].path | 否 | string | — |
| $<variant 2>.issues[].code | 否 | string | — |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### Guide target variants

目标可省略，或指向 Page、Module、Layout Region。

```json
{
  "步骤": [
    {
      "ID": "intro",
      "标题": "开始",
      "说明": "无目标步骤。"
    },
    {
      "ID": "page",
      "标题": "页面",
      "说明": "打开页面。",
      "目标": {
        "类型": "page",
        "页面ID": "main"
      }
    },
    {
      "ID": "module",
      "标题": "字段",
      "说明": "填写字段。",
      "目标": {
        "类型": "module",
        "模块ID": "name"
      }
    },
    {
      "ID": "region",
      "标题": "区域",
      "说明": "查看区域。",
      "目标": {
        "类型": "region",
        "区域ID": "identity"
      }
    }
  ]
}
```

#### Validation Script output

可直接返回 issue 数组，或返回 `{ issues }`。source 由 Host 注入，脚本不返回。

```json
[
  {
    "level": "warning",
    "code": "EXAMPLE_WARNING",
    "text": "示例警告",
    "path": "character.values.level"
  }
]
```

<!-- END GENERATED CONTRACT -->
