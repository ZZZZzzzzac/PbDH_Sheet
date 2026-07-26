# Format Adapters 与扩展边界

Format Adapter 把第三方资源或人物格式转换为 PbDH 运行时合同。它属于 System Package，因为字段语义由具体游戏系统拥有；Base 只提供隔离执行、文件选择、诊断和标准输入/输出，不持续加入各格式的专用映射复杂度。

## 两类 Adapter

- Resource Format Adapter：导入外部资源包，输出 Resource Libraries / Entries 及必要扩展数据。
- Character Format Adapter：导入或导出外部人物文件，在第三方数据与 Character Data 之间转换。

manifest 通过 `resourceFormatAdapters` / `characterFormatAdapters` 指向 `adapters/*.json`，定义格式 ID、名称、方向、文件匹配和脚本路径。脚本内容由 Loader 装配后在隔离 Worker 执行。精确声明、输入输出、TypeScript API 与例子都在本文件下方自动生成部分。

## 脚本责任

Adapter 脚本负责第三方格式知识：字段组合、枚举解释、卡名匹配、升级槽规则、文字与图片选择、兼容版本和可逆导出。Base 负责：

- 读取用户明确选择的文件；
- 提供当前 System Package、Resource Libraries 与 Character Data 上下文；
- Worker 隔离、超时与结构校验；
- 展示逐项诊断；
- 只在结果验证成功后应用。

脚本不得访问 DOM、网络、文件系统或宿主缓存，也不能动态执行输入中的代码。

## 导入原则

- 优先用稳定外部 ID 匹配；没有时可用规范化卡名和明确别名。
- 找不到 Resource Entry 时保留可恢复文字，并在诊断中写出 card 名称、类型与来源位置，不能只报笼统的“Card 未匹配”。
- 只有能够证明结构兼容时才把扩展资源合并到原生库；不确定的多特性文本应保留为其他资源，避免错误拆分导致丢失。
- 第三方图片若只是无文字卡图，而外部应用在线叠加文字，导入应使用文字展示。
- 数字、带单位文字和三态槽必须由格式脚本明确转换，不由 Base 猜测。

## 导出原则

导出必须仿照目标应用真实接受的 envelope、字段名、默认值和编码，而不是简单序列化 PbDH 内部对象。不能可靠表达的 PbDH 数据应产生 warning；不要伪造成功的可逆性。导入可以是主要能力，但若声明 export，就必须用目标应用或其源码 fixture 做往返验证。

## 诊断

每条 issue 应至少说明 adapter、方向、外部字段或对象身份和原因；能定位时加入索引、卡名、模块 ID 与原值。解析失败、未匹配、降级保留和丢失风险使用不同 code/level，方便用户判断是否继续。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Resource Format Adapter declarations

外部资源格式的 carrier 检测和导入脚本路径。

语义约束：

- 检测必须唯一命中；Base 不解释第三方格式字段。
- zip carrier 只读取声明的安全 JSON成员，并把成员挂到对应键。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | array | 最少项 1；外部资源格式的 carrier 检测和导入脚本路径。 |
| $[] | 是 | object | — |
| $[].ID | 是 | string | 最短 1 |
| $[].名称 | 是 | string | 最短 1 |
| $[].载体 | 是 | array | 最少项 1 |
| $[].载体[] | 是 | object \| object \| object | — |
| $[].载体[]<json> | 是 | object | — |
| $[].载体[]<json>.类型 | 是 | "json" | — |
| $[].载体[]<json>.根类型 | 否 | "object" \| "array" | — |
| $[].载体[]<json>.文件后缀 | 否 | string | 最短 1 |
| $[].载体[]<json>.检测 | 是 | array | 最少项 1 |
| $[].载体[]<json>.检测[] | 是 | object | — |
| $[].载体[]<json>.检测[].路径 | 是 | array | — |
| $[].载体[]<json>.检测[].路径[] | 是 | string \| integer | — |
| $[].载体[]<json>.检测[].路径[]<variant 1> | 是 | string | 最短 1 |
| $[].载体[]<json>.检测[].路径[]<variant 2> | 是 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<json>.检测[].存在 | 否 | boolean | — |
| $[].载体[]<json>.检测[].等于 | 否 | string \| number \| boolean \| null | — |
| $[].载体[]<json>.检测[].等于<variant 1> | 否 | string | — |
| $[].载体[]<json>.检测[].等于<variant 2> | 否 | number | — |
| $[].载体[]<json>.检测[].等于<variant 3> | 否 | boolean | — |
| $[].载体[]<json>.检测[].等于<variant 4> | 否 | null | — |
| $[].载体[]<embeddedJson> | 是 | object | — |
| $[].载体[]<embeddedJson>.类型 | 是 | "embeddedJson" | — |
| $[].载体[]<embeddedJson>.文件后缀 | 否 | string | 最短 1 |
| $[].载体[]<embeddedJson>.开始标记 | 是 | string | 最短 1 |
| $[].载体[]<embeddedJson>.结束标记 | 是 | string | 最短 1 |
| $[].载体[]<embeddedJson>.结束标记包含字符数 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<embeddedJson>.检测 | 是 | array | 最少项 1 |
| $[].载体[]<embeddedJson>.检测[] | 是 | object | — |
| $[].载体[]<embeddedJson>.检测[].路径 | 是 | array | — |
| $[].载体[]<embeddedJson>.检测[].路径[] | 是 | string \| integer | — |
| $[].载体[]<embeddedJson>.检测[].路径[]<variant 1> | 是 | string | 最短 1 |
| $[].载体[]<embeddedJson>.检测[].路径[]<variant 2> | 是 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<embeddedJson>.检测[].存在 | 否 | boolean | — |
| $[].载体[]<embeddedJson>.检测[].等于 | 否 | string \| number \| boolean \| null | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 1> | 否 | string | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 2> | 否 | number | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 3> | 否 | boolean | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 4> | 否 | null | — |
| $[].载体[]<zip> | 是 | object | — |
| $[].载体[]<zip>.类型 | 是 | "zip" | — |
| $[].载体[]<zip>.文件后缀 | 否 | string | 最短 1 |
| $[].载体[]<zip>.JSON成员 | 是 | array | 最少项 1 |
| $[].载体[]<zip>.JSON成员[] | 是 | object | — |
| $[].载体[]<zip>.JSON成员[].路径 | 是 | string | 最短 1 |
| $[].载体[]<zip>.JSON成员[].键 | 是 | string | 最短 1 |
| $[].载体[]<zip>.检测 | 是 | array | 最少项 1 |
| $[].载体[]<zip>.检测[] | 是 | object | — |
| $[].载体[]<zip>.检测[].路径 | 是 | array | — |
| $[].载体[]<zip>.检测[].路径[] | 是 | string \| integer | — |
| $[].载体[]<zip>.检测[].路径[]<variant 1> | 是 | string | 最短 1 |
| $[].载体[]<zip>.检测[].路径[]<variant 2> | 是 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<zip>.检测[].存在 | 否 | boolean | — |
| $[].载体[]<zip>.检测[].等于 | 否 | string \| number \| boolean \| null | — |
| $[].载体[]<zip>.检测[].等于<variant 1> | 否 | string | — |
| $[].载体[]<zip>.检测[].等于<variant 2> | 否 | number | — |
| $[].载体[]<zip>.检测[].等于<variant 3> | 否 | boolean | — |
| $[].载体[]<zip>.检测[].等于<variant 4> | 否 | null | — |
| $[].导入脚本 | 是 | string | 最短 1 |

### Character Format Adapter declarations

外部人物格式的 carrier、导入及可选导出脚本。

语义约束：

- 声明导出脚本才支持导出；当前导出文件后缀固定为 .json。
- embeddedJson 只截取标记之间的 JSON，不解析 DOM 或执行外部脚本。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | array | 最少项 1；外部人物格式的 carrier、导入及可选导出脚本。 |
| $[] | 是 | object | — |
| $[].ID | 是 | string | 最短 1 |
| $[].名称 | 是 | string | 最短 1 |
| $[].载体 | 是 | array | 最少项 1 |
| $[].载体[] | 是 | object \| object \| object | — |
| $[].载体[]<json> | 是 | object | — |
| $[].载体[]<json>.类型 | 是 | "json" | — |
| $[].载体[]<json>.根类型 | 否 | "object" \| "array" | — |
| $[].载体[]<json>.文件后缀 | 否 | string | 最短 1 |
| $[].载体[]<json>.检测 | 是 | array | 最少项 1 |
| $[].载体[]<json>.检测[] | 是 | object | — |
| $[].载体[]<json>.检测[].路径 | 是 | array | — |
| $[].载体[]<json>.检测[].路径[] | 是 | string \| integer | — |
| $[].载体[]<json>.检测[].路径[]<variant 1> | 是 | string | 最短 1 |
| $[].载体[]<json>.检测[].路径[]<variant 2> | 是 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<json>.检测[].存在 | 否 | boolean | — |
| $[].载体[]<json>.检测[].等于 | 否 | string \| number \| boolean \| null | — |
| $[].载体[]<json>.检测[].等于<variant 1> | 否 | string | — |
| $[].载体[]<json>.检测[].等于<variant 2> | 否 | number | — |
| $[].载体[]<json>.检测[].等于<variant 3> | 否 | boolean | — |
| $[].载体[]<json>.检测[].等于<variant 4> | 否 | null | — |
| $[].载体[]<embeddedJson> | 是 | object | — |
| $[].载体[]<embeddedJson>.类型 | 是 | "embeddedJson" | — |
| $[].载体[]<embeddedJson>.文件后缀 | 否 | string | 最短 1 |
| $[].载体[]<embeddedJson>.开始标记 | 是 | string | 最短 1 |
| $[].载体[]<embeddedJson>.结束标记 | 是 | string | 最短 1 |
| $[].载体[]<embeddedJson>.结束标记包含字符数 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<embeddedJson>.检测 | 是 | array | 最少项 1 |
| $[].载体[]<embeddedJson>.检测[] | 是 | object | — |
| $[].载体[]<embeddedJson>.检测[].路径 | 是 | array | — |
| $[].载体[]<embeddedJson>.检测[].路径[] | 是 | string \| integer | — |
| $[].载体[]<embeddedJson>.检测[].路径[]<variant 1> | 是 | string | 最短 1 |
| $[].载体[]<embeddedJson>.检测[].路径[]<variant 2> | 是 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<embeddedJson>.检测[].存在 | 否 | boolean | — |
| $[].载体[]<embeddedJson>.检测[].等于 | 否 | string \| number \| boolean \| null | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 1> | 否 | string | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 2> | 否 | number | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 3> | 否 | boolean | — |
| $[].载体[]<embeddedJson>.检测[].等于<variant 4> | 否 | null | — |
| $[].载体[]<zip> | 是 | object | — |
| $[].载体[]<zip>.类型 | 是 | "zip" | — |
| $[].载体[]<zip>.文件后缀 | 否 | string | 最短 1 |
| $[].载体[]<zip>.JSON成员 | 是 | array | 最少项 1 |
| $[].载体[]<zip>.JSON成员[] | 是 | object | — |
| $[].载体[]<zip>.JSON成员[].路径 | 是 | string | 最短 1 |
| $[].载体[]<zip>.JSON成员[].键 | 是 | string | 最短 1 |
| $[].载体[]<zip>.检测 | 是 | array | 最少项 1 |
| $[].载体[]<zip>.检测[] | 是 | object | — |
| $[].载体[]<zip>.检测[].路径 | 是 | array | — |
| $[].载体[]<zip>.检测[].路径[] | 是 | string \| integer | — |
| $[].载体[]<zip>.检测[].路径[]<variant 1> | 是 | string | 最短 1 |
| $[].载体[]<zip>.检测[].路径[]<variant 2> | 是 | integer | 最小 0；最大 9007199254740991 |
| $[].载体[]<zip>.检测[].存在 | 否 | boolean | — |
| $[].载体[]<zip>.检测[].等于 | 否 | string \| number \| boolean \| null | — |
| $[].载体[]<zip>.检测[].等于<variant 1> | 否 | string | — |
| $[].载体[]<zip>.检测[].等于<variant 2> | 否 | number | — |
| $[].载体[]<zip>.检测[].等于<variant 3> | 否 | boolean | — |
| $[].载体[]<zip>.检测[].等于<variant 4> | 否 | null | — |
| $[].导入脚本 | 是 | string | 最短 1 |
| $[].导出脚本 | 否 | string | 最短 1 |
| $[].导出文件后缀 | 否 | ".json" | 默认 ".json" |

### Script API: resourceAdapterImportInput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。
- assets[].bytes 是 Uint8Array；只包含用户选择的 zip 中安全读取的文件。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；隔离 Package Script Worker 的结构化输入或输出合同。 |
| document | 是 | unknown | — |
| fileName | 是 | string | — |
| assets | 是 | array | — |
| assets[] | 是 | object | 未知字段不属于合同 |
| assets[].path | 是 | string | 最短 1 |
| assets[].bytes | 是 | unknown | Uint8Array |
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

### Script API: resourceAdapterImportOutput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。
- 七个 counts 字段全部必填且为非负整数；retainedAssets 的 sourcePath 必须存在，targetPath 必须安全且唯一。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 隔离 Package Script Worker 的结构化输入或输出合同。 |
| name | 是 | string | 最短 1 |
| version | 否 | string | — |
| resourceLibraries | 是 | array | 最少项 1 |
| resourceLibraries[] | 是 | object | — |
| resourceLibraries[].ID | 否 | string | 最短 1 |
| resourceLibraries[].名称 | 是 | string | 最短 1 |
| resourceLibraries[].entries | 是 | array | — |
| resourceLibraries[].entries[] | 是 | object | — |
| retainedAssets | 否 | array | — |
| retainedAssets[] | 是 | object | — |
| retainedAssets[].sourcePath | 是 | string | 最短 1 |
| retainedAssets[].targetPath | 是 | string | 最短 1 |
| diagnostics | 否 | array | — |
| diagnostics[] | 是 | object | — |
| diagnostics[].level | 是 | "error" \| "warning" | — |
| diagnostics[].code | 是 | string | — |
| diagnostics[].text | 是 | string | — |
| diagnostics[].path | 否 | string | — |
| counts | 是 | object | — |
| counts.sourceEntries | 是 | integer | 最小 0；最大 9007199254740991 |
| counts.convertedEntries | 是 | integer | 最小 0；最大 9007199254740991 |
| counts.skippedEntries | 是 | integer | 最小 0；最大 9007199254740991 |
| counts.convertedFields | 是 | integer | 最小 0；最大 9007199254740991 |
| counts.skippedFields | 是 | integer | 最小 0；最大 9007199254740991 |
| counts.boundImages | 是 | integer | 最小 0；最大 9007199254740991 |
| counts.orphanImages | 是 | integer | 最小 0；最大 9007199254740991 |

### Script API: characterAdapterImportInput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；隔离 Package Script Worker 的结构化输入或输出合同。 |
| document | 是 | unknown | — |
| fileName | 是 | string | — |
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

### Script API: characterAdapterImportOutput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。
- values 键必须是当前包 Module ID 且值形状匹配 Module；cards 必须引用现有 Card Table 与 Resource Entry；images 只接受受支持 image data URL。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 隔离 Package Script Worker 的结构化输入或输出合同。 |
| values | 是 | object | — |
| cards | 否 | array | — |
| cards[] | 是 | object | — |
| cards[].tableModuleId | 是 | string | 最短 1 |
| cards[].state | 是 | string | — |
| cards[].libraryId | 是 | string | 最短 1 |
| cards[].entryId | 是 | string | 最短 1 |
| images | 否 | array | — |
| images[] | 是 | object | — |
| images[].moduleId | 是 | string | 最短 1 |
| images[].name | 否 | string | — |
| images[].dataUrl | 是 | string | 最短 1 |
| suggestedSaveName | 否 | string | — |
| skippedFields | 否 | integer | 最小 0；最大 9007199254740991 |
| skippedCards | 否 | integer | 最小 0；最大 9007199254740991 |
| skippedImages | 否 | integer | 最小 0；最大 9007199254740991 |
| diagnostics | 否 | array | — |
| diagnostics[] | 是 | object | — |
| diagnostics[].level | 是 | "error" \| "warning" | — |
| diagnostics[].code | 是 | string | — |
| diagnostics[].text | 是 | string | — |
| diagnostics[].path | 否 | string | — |

### Script API: characterAdapterExportInput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；隔离 Package Script Worker 的结构化输入或输出合同。 |
| adapterId | 是 | string | 最短 1 |
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

### Script API: characterAdapterExportOutput

隔离 Package Script Worker 的结构化输入或输出合同。

TypeScript 合同：[`script-api.d.ts`](script-api.d.ts)

语义约束：

- 输入在传入脚本前 structuredClone 并 deep-freeze。
- 生产环境在独立 Worker 执行，默认超时 3000 ms；DOM、网络和宿主状态不在合同内。
- 脚本通过 module.exports 导出同步或 async 函数；异常、超时和无效输出均转为诊断。
- document 必须是对象；省略的六个导出/跳过计数由 Host 归零。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 隔离 Package Script Worker 的结构化输入或输出合同。 |
| document | 是 | object | — |
| diagnostics | 否 | array | — |
| diagnostics[] | 是 | object | — |
| diagnostics[].level | 是 | "error" \| "warning" | — |
| diagnostics[].code | 是 | string | — |
| diagnostics[].text | 是 | string | — |
| diagnostics[].path | 否 | string | — |
| exportedFields | 否 | integer | 最小 0；最大 9007199254740991 |
| skippedFields | 否 | integer | 最小 0；最大 9007199254740991 |
| exportedCards | 否 | integer | 最小 0；最大 9007199254740991 |
| skippedCards | 否 | integer | 最小 0；最大 9007199254740991 |
| exportedImages | 否 | integer | 最小 0；最大 9007199254740991 |
| skippedImages | 否 | integer | 最小 0；最大 9007199254740991 |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### Format Adapter carrier variants

json、embeddedJson 与 zip 三种 carrier；检测路径允许字符串或非负数组索引。

```json
[
  {
    "ID": "external-format",
    "名称": "External Format",
    "导入脚本": "adapters/import.js",
    "载体": [
      {
        "类型": "json",
        "根类型": "object",
        "文件后缀": ".json",
        "检测": [
          {
            "路径": [
              "kind"
            ],
            "等于": "external"
          }
        ]
      },
      {
        "类型": "embeddedJson",
        "文件后缀": ".html",
        "开始标记": "DATA=",
        "结束标记": ";",
        "检测": [
          {
            "路径": [
              "kind"
            ],
            "存在": true
          }
        ]
      },
      {
        "类型": "zip",
        "文件后缀": ".pack",
        "JSON成员": [
          {
            "路径": "manifest.json",
            "键": "manifest"
          }
        ],
        "检测": [
          {
            "路径": [
              "manifest",
              "kind"
            ],
            "等于": "external"
          }
        ]
      }
    ]
  }
]
```

#### Resource Adapter import output

counts 的七个非负整数均必填；retainedAssets 只声明从输入 assets 保留的安全路径。

```json
{
  "name": "扩展资源",
  "version": "1.0.0",
  "resourceLibraries": [
    {
      "ID": "items",
      "名称": "物品",
      "entries": []
    }
  ],
  "retainedAssets": [
    {
      "sourcePath": "images/a.webp",
      "targetPath": "assets/imported/a.webp"
    }
  ],
  "diagnostics": [],
  "counts": {
    "sourceEntries": 0,
    "convertedEntries": 0,
    "skippedEntries": 0,
    "convertedFields": 0,
    "skippedFields": 0,
    "boundImages": 1,
    "orphanImages": 0
  }
}
```

#### Character Adapter import output

values 键必须对应当前包 Module ID；Host 随后按 Module 类型和 Resource Entry 引用做语义校验。

```json
{
  "values": {
    "name": "角色名",
    "stress": {
      "current": 1,
      "max": 6
    }
  },
  "cards": [
    {
      "tableModuleId": "cards",
      "state": "当前",
      "libraryId": "cards",
      "entryId": "card-1"
    }
  ],
  "diagnostics": []
}
```

#### Character Adapter export output

document 是目标格式根对象；所有计数省略时 Host 归零。

```json
{
  "document": {
    "kind": "external-character",
    "name": "角色名"
  },
  "exportedFields": 1,
  "diagnostics": []
}
```

<!-- END GENERATED CONTRACT -->
