# Dependency Logic 合同

Dependency 是声明式、事件驱动的模块联动。每条规则需要稳定 `ID`、非空 `sources`、非空 `targets`、一个 `触发`、可选 `条件` 和非空 `动作`。它不是通用脚本，也不会在加载 Character Data 时任意重放。

## Sources 与 Triggers

Sources 类型：`resourcePicker`、`resourceComposer`、`checkboxResource`、`countableResource`、`freeText`，均使用 `模块ID`。

Triggers：

- `resourceSelected`
- `checkboxChanged`
- `countableChanged`
- `freeTextChanged`

触发使用 `来源模块ID`，必须与 sources 和真实模块类型相容。旧 `counter` / `counterChanged` 不受支持。

## Targets 与 Conditions

Target 为 `module` + `模块ID` 或 `page` + `页面ID`。

Conditions：`always`、`selectedResourceFieldEquals`、`selectedResourceFieldNotEquals`、`selectedResourceFieldIn`、`checkboxOptionChecked`、`checkboxOptionUnchecked`。资源字段条件只读取当前事件的选择；checkbox 条件必须引用该来源真实选项 ID。省略条件等同始终执行。

## Actions

- `fillText`：写 freeText/longText；内容可为常量、`selectedResourceField` 或 `selectedResourceTemplate`，可替换或追加。
- `setTextPlaceholder`：动态更新文本模块占位符，不写 Character Data 值。
- `fillCountable`：设置当前值和/或最大值；内容可为整数、所选资源字段或整数计算。
- `setVisibility`：显示/隐藏 Page 或 Module。
- `setResourceDefaultFilter`：修改 Picker 默认过滤；值可为常量数组、所选资源字段或 `freeTextValues`。

整数计算 `integerCalculation` 从整数 `初始值` 开始，按顺序执行 `add` / `subtract`。操作数可为整数、`countableCurrent` 或 `resourceSelectionCount`，最后可用 `最小值` / `最大值`夹取。计算保持整数，最小值不能大于最大值。

## 执行原则

- 规则只响应声明事件；不要依赖加载时副作用修复数据。
- 多个动作按声明顺序执行，但规则间不应构造隐含循环。
- 写入目标必须与动作类型匹配，引用字段必须真实存在且能转换为目标值。
- `setVisibility` 只改展示；隐藏模块的数据仍保留。
- 复杂一致性检查放 Validation Script；外部格式转换放 Adapter。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Dependency rules

事件来源、目标、触发、条件和值/动作 variant。

语义约束：

- 每条规则 ID 唯一；source、trigger、condition、target 和 action 必须与真实 Module 类型兼容。
- 规则只响应声明事件；加载 Character Data 不重放一次性写入。
- setVisibility/default filters/placeholder 等纯派生展示可从持久快照重建。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | array | 事件来源、目标、触发、条件和值/动作 variant。 |
| $[] | 是 | object | — |
| $[].ID | 是 | string | 最短 1 |
| $[].sources | 是 | array | 最少项 1 |
| $[].sources[] | 是 | object \| object \| object \| object \| object | — |
| $[].sources[]<resourcePicker> | 是 | object | — |
| $[].sources[]<resourcePicker>.类型 | 是 | "resourcePicker" | — |
| $[].sources[]<resourcePicker>.模块ID | 是 | string | 最短 1 |
| $[].sources[]<resourceComposer> | 是 | object | — |
| $[].sources[]<resourceComposer>.类型 | 是 | "resourceComposer" | — |
| $[].sources[]<resourceComposer>.模块ID | 是 | string | 最短 1 |
| $[].sources[]<checkboxResource> | 是 | object | — |
| $[].sources[]<checkboxResource>.类型 | 是 | "checkboxResource" | — |
| $[].sources[]<checkboxResource>.模块ID | 是 | string | 最短 1 |
| $[].sources[]<countableResource> | 是 | object | — |
| $[].sources[]<countableResource>.类型 | 是 | "countableResource" | — |
| $[].sources[]<countableResource>.模块ID | 是 | string | 最短 1 |
| $[].sources[]<freeText> | 是 | object | — |
| $[].sources[]<freeText>.类型 | 是 | "freeText" | — |
| $[].sources[]<freeText>.模块ID | 是 | string | 最短 1 |
| $[].targets | 是 | array | 最少项 1 |
| $[].targets[] | 是 | object \| object | — |
| $[].targets[]<module> | 是 | object | — |
| $[].targets[]<module>.类型 | 是 | "module" | — |
| $[].targets[]<module>.模块ID | 是 | string | 最短 1 |
| $[].targets[]<page> | 是 | object | — |
| $[].targets[]<page>.类型 | 是 | "page" | — |
| $[].targets[]<page>.页面ID | 是 | string | 最短 1 |
| $[].触发 | 是 | object \| object \| object \| object | — |
| $[].触发<resourceSelected> | 是 | object | — |
| $[].触发<resourceSelected>.类型 | 是 | "resourceSelected" | — |
| $[].触发<resourceSelected>.来源模块ID | 是 | string | 最短 1 |
| $[].触发<checkboxChanged> | 是 | object | — |
| $[].触发<checkboxChanged>.类型 | 是 | "checkboxChanged" | — |
| $[].触发<checkboxChanged>.来源模块ID | 是 | string | 最短 1 |
| $[].触发<countableChanged> | 是 | object | — |
| $[].触发<countableChanged>.类型 | 是 | "countableChanged" | — |
| $[].触发<countableChanged>.来源模块ID | 是 | string | 最短 1 |
| $[].触发<freeTextChanged> | 是 | object | — |
| $[].触发<freeTextChanged>.类型 | 是 | "freeTextChanged" | — |
| $[].触发<freeTextChanged>.来源模块ID | 是 | string | 最短 1 |
| $[].条件 | 否 | object \| object \| object \| object \| object \| object | 省略时等同 always。 |
| $[].条件<always> | 否 | object | — |
| $[].条件<always>.类型 | 是 | "always" | — |
| $[].条件<selectedResourceFieldEquals> | 否 | object | — |
| $[].条件<selectedResourceFieldEquals>.类型 | 是 | "selectedResourceFieldEquals" | — |
| $[].条件<selectedResourceFieldEquals>.字段 | 是 | string | 最短 1 |
| $[].条件<selectedResourceFieldEquals>.值 | 是 | string | — |
| $[].条件<selectedResourceFieldIn> | 否 | object | — |
| $[].条件<selectedResourceFieldIn>.类型 | 是 | "selectedResourceFieldIn" | — |
| $[].条件<selectedResourceFieldIn>.字段 | 是 | string | 最短 1 |
| $[].条件<selectedResourceFieldIn>.值 | 是 | array | 最少项 1 |
| $[].条件<selectedResourceFieldIn>.值[] | 是 | string | — |
| $[].条件<selectedResourceFieldNotEquals> | 否 | object | — |
| $[].条件<selectedResourceFieldNotEquals>.类型 | 是 | "selectedResourceFieldNotEquals" | — |
| $[].条件<selectedResourceFieldNotEquals>.字段 | 是 | string | 最短 1 |
| $[].条件<selectedResourceFieldNotEquals>.值 | 是 | string | — |
| $[].条件<checkboxOptionChecked> | 否 | object | — |
| $[].条件<checkboxOptionChecked>.类型 | 是 | "checkboxOptionChecked" | — |
| $[].条件<checkboxOptionChecked>.选项ID | 是 | string | 最短 1 |
| $[].条件<checkboxOptionUnchecked> | 否 | object | — |
| $[].条件<checkboxOptionUnchecked>.类型 | 是 | "checkboxOptionUnchecked" | — |
| $[].条件<checkboxOptionUnchecked>.选项ID | 是 | string | 最短 1 |
| $[].动作 | 是 | array | 最少项 1 |
| $[].动作[] | 是 | object \| object \| object \| object \| object | — |
| $[].动作[]<fillText> | 是 | object | — |
| $[].动作[]<fillText>.类型 | 是 | "fillText" | — |
| $[].动作[]<fillText>.目标模块ID | 是 | string | 最短 1 |
| $[].动作[]<fillText>.内容 | 是 | string \| object \| object | — |
| $[].动作[]<fillText>.内容<variant 1> | 是 | string | — |
| $[].动作[]<fillText>.内容<selectedResourceField> | 是 | object | — |
| $[].动作[]<fillText>.内容<selectedResourceField>.类型 | 是 | "selectedResourceField" | — |
| $[].动作[]<fillText>.内容<selectedResourceField>.字段 | 是 | string | 最短 1 |
| $[].动作[]<fillText>.内容<selectedResourceField>.选择索引 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].动作[]<fillText>.内容<selectedResourceField>.分隔符 | 否 | string | — |
| $[].动作[]<fillText>.内容<selectedResourceTemplate> | 是 | object | — |
| $[].动作[]<fillText>.内容<selectedResourceTemplate>.类型 | 是 | "selectedResourceTemplate" | — |
| $[].动作[]<fillText>.内容<selectedResourceTemplate>.格式 | 是 | string | 最短 1 |
| $[].动作[]<fillText>.内容<selectedResourceTemplate>.选择索引 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].动作[]<fillText>.内容<selectedResourceTemplate>.分隔符 | 否 | string | — |
| $[].动作[]<fillText>.写入方式 | 否 | "替换" \| "追加" | 默认 "替换" |
| $[].动作[]<fillText>.追加分隔符 | 否 | string | — |
| $[].动作[]<setTextPlaceholder> | 是 | object | — |
| $[].动作[]<setTextPlaceholder>.类型 | 是 | "setTextPlaceholder" | — |
| $[].动作[]<setTextPlaceholder>.目标模块ID | 是 | string | 最短 1 |
| $[].动作[]<setTextPlaceholder>.内容 | 是 | string \| object \| object | — |
| $[].动作[]<setTextPlaceholder>.内容<variant 1> | 是 | string | — |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceField> | 是 | object | — |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceField>.类型 | 是 | "selectedResourceField" | — |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceField>.字段 | 是 | string | 最短 1 |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceField>.选择索引 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceField>.分隔符 | 否 | string | — |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceTemplate> | 是 | object | — |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceTemplate>.类型 | 是 | "selectedResourceTemplate" | — |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceTemplate>.格式 | 是 | string | 最短 1 |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceTemplate>.选择索引 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].动作[]<setTextPlaceholder>.内容<selectedResourceTemplate>.分隔符 | 否 | string | — |
| $[].动作[]<fillCountable> | 是 | object | — |
| $[].动作[]<fillCountable>.类型 | 是 | "fillCountable" | — |
| $[].动作[]<fillCountable>.目标模块ID | 是 | string | 最短 1 |
| $[].动作[]<fillCountable>.当前值 | 否 | integer \| object \| object | — |
| $[].动作[]<fillCountable>.最大值 | 否 | integer \| object \| object \| null | — |
| $[].动作[]<fillCountable>.最大值<variant 1> | 否 | integer \| object \| object | — |
| $[].动作[]<fillCountable>.最大值<variant 1><variant 1> | 否 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| $[].动作[]<fillCountable>.最大值<variant 1><selectedResourceField> | 否 | object | — |
| $[].动作[]<fillCountable>.最大值<variant 1><selectedResourceField>.类型 | 是 | "selectedResourceField" | — |
| $[].动作[]<fillCountable>.最大值<variant 1><selectedResourceField>.字段 | 是 | string | 最短 1 |
| $[].动作[]<fillCountable>.最大值<variant 1><selectedResourceField>.选择索引 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation> | 否 | object | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.类型 | 是 | "integerCalculation" | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.初始值 | 是 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算 | 是 | array | 最少项 1 |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[] | 是 | object | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].操作 | 是 | "add" \| "subtract" | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值 | 是 | integer \| object \| object | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值<variant 1> | 是 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值<countableCurrent> | 是 | object | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值<countableCurrent>.类型 | 是 | "countableCurrent" | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值<countableCurrent>.模块ID | 是 | string | 最短 1 |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值<resourceSelectionCount> | 是 | object | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值<resourceSelectionCount>.类型 | 是 | "resourceSelectionCount" | — |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.运算[].值<resourceSelectionCount>.模块ID | 是 | string | 最短 1 |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.最小值 | 否 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| $[].动作[]<fillCountable>.最大值<variant 1><integerCalculation>.最大值 | 否 | integer | 最小 -9007199254740991；最大 9007199254740991 |
| $[].动作[]<fillCountable>.最大值<variant 2> | 否 | null | — |
| $[].动作[]<setVisibility> | 是 | object | — |
| $[].动作[]<setVisibility>.类型 | 是 | "setVisibility" | — |
| $[].动作[]<setVisibility>.目标类型 | 是 | "page" \| "module" | — |
| $[].动作[]<setVisibility>.目标ID | 是 | string | 最短 1 |
| $[].动作[]<setVisibility>.显示 | 是 | boolean | — |
| $[].动作[]<setResourceDefaultFilter> | 是 | object | — |
| $[].动作[]<setResourceDefaultFilter>.类型 | 是 | "setResourceDefaultFilter" | — |
| $[].动作[]<setResourceDefaultFilter>.目标模块ID | 是 | string | 最短 1 |
| $[].动作[]<setResourceDefaultFilter>.字段 | 是 | string | 最短 1 |
| $[].动作[]<setResourceDefaultFilter>.值 | 是 | array \| object \| object | — |
| $[].动作[]<setResourceDefaultFilter>.值<variant 1> | 是 | array | 最少项 1 |
| $[].动作[]<setResourceDefaultFilter>.值<variant 1>[] | 是 | string | — |
| $[].动作[]<setResourceDefaultFilter>.值<selectedResourceField> | 是 | object | — |
| $[].动作[]<setResourceDefaultFilter>.值<selectedResourceField>.类型 | 是 | "selectedResourceField" | — |
| $[].动作[]<setResourceDefaultFilter>.值<selectedResourceField>.字段 | 是 | string | 最短 1 |
| $[].动作[]<setResourceDefaultFilter>.值<selectedResourceField>.选择索引 | 否 | integer | 最小 0；最大 9007199254740991 |
| $[].动作[]<setResourceDefaultFilter>.值<freeTextValues> | 是 | object | — |
| $[].动作[]<setResourceDefaultFilter>.值<freeTextValues>.类型 | 是 | "freeTextValues" | — |
| $[].动作[]<setResourceDefaultFilter>.值<freeTextValues>.模块IDs | 是 | array | 最少项 1 |
| $[].动作[]<setResourceDefaultFilter>.值<freeTextValues>.模块IDs[] | 是 | string | 最短 1 |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### Dependency triggers、conditions、actions 与 value variants

示例集中覆盖所有公开 action，并展示 text/countable/filter 的各类值来源。

```json
[
  {
    "ID": "resource-to-text",
    "sources": [
      {
        "类型": "resourcePicker",
        "模块ID": "pick"
      }
    ],
    "targets": [
      {
        "类型": "module",
        "模块ID": "name"
      }
    ],
    "触发": {
      "类型": "resourceSelected",
      "来源模块ID": "pick"
    },
    "条件": {
      "类型": "selectedResourceFieldEquals",
      "字段": "类型",
      "值": "基础"
    },
    "动作": [
      {
        "类型": "fillText",
        "目标模块ID": "name",
        "内容": "固定文字"
      },
      {
        "类型": "fillText",
        "目标模块ID": "name",
        "内容": {
          "类型": "selectedResourceField",
          "字段": "名称"
        }
      },
      {
        "类型": "fillText",
        "目标模块ID": "name",
        "内容": {
          "类型": "selectedResourceTemplate",
          "格式": "{名称}（{类型}）"
        }
      },
      {
        "类型": "setTextPlaceholder",
        "目标模块ID": "name",
        "内容": {
          "类型": "selectedResourceField",
          "字段": "说明"
        }
      }
    ]
  },
  {
    "ID": "checkbox-visibility",
    "sources": [
      {
        "类型": "checkboxResource",
        "模块ID": "flags"
      }
    ],
    "targets": [
      {
        "类型": "page",
        "页面ID": "advanced"
      }
    ],
    "触发": {
      "类型": "checkboxChanged",
      "来源模块ID": "flags"
    },
    "条件": {
      "类型": "checkboxOptionChecked",
      "选项ID": "advanced"
    },
    "动作": [
      {
        "类型": "setVisibility",
        "目标类型": "page",
        "目标ID": "advanced",
        "显示": true
      }
    ]
  },
  {
    "ID": "countable-calculation",
    "sources": [
      {
        "类型": "countableResource",
        "模块ID": "level"
      }
    ],
    "targets": [
      {
        "类型": "module",
        "模块ID": "stress"
      }
    ],
    "触发": {
      "类型": "countableChanged",
      "来源模块ID": "level"
    },
    "条件": {
      "类型": "always"
    },
    "动作": [
      {
        "类型": "fillCountable",
        "目标模块ID": "stress",
        "当前值": 0
      },
      {
        "类型": "fillCountable",
        "目标模块ID": "stress",
        "最大值": {
          "类型": "selectedResourceField",
          "字段": "上限"
        }
      },
      {
        "类型": "fillCountable",
        "目标模块ID": "stress",
        "最大值": {
          "类型": "integerCalculation",
          "初始值": 4,
          "运算": [
            {
              "操作": "add",
              "值": {
                "类型": "countableCurrent",
                "模块ID": "level"
              }
            },
            {
              "操作": "subtract",
              "值": {
                "类型": "resourceSelectionCount",
                "模块ID": "pick"
              }
            }
          ],
          "最小值": 0
        }
      }
    ]
  },
  {
    "ID": "free-text-filter",
    "sources": [
      {
        "类型": "freeText",
        "模块ID": "domain"
      }
    ],
    "targets": [
      {
        "类型": "module",
        "模块ID": "pick"
      }
    ],
    "触发": {
      "类型": "freeTextChanged",
      "来源模块ID": "domain"
    },
    "条件": {
      "类型": "checkboxOptionUnchecked",
      "选项ID": "all"
    },
    "动作": [
      {
        "类型": "setResourceDefaultFilter",
        "目标模块ID": "pick",
        "字段": "领域",
        "值": [
          "利刃"
        ]
      },
      {
        "类型": "setResourceDefaultFilter",
        "目标模块ID": "pick",
        "字段": "领域",
        "值": {
          "类型": "selectedResourceField",
          "字段": "领域"
        }
      },
      {
        "类型": "setResourceDefaultFilter",
        "目标模块ID": "pick",
        "字段": "领域",
        "值": {
          "类型": "freeTextValues",
          "模块IDs": [
            "domain"
          ]
        }
      }
    ]
  },
  {
    "ID": "resource-in-condition",
    "sources": [
      {
        "类型": "resourceComposer",
        "模块ID": "compose"
      }
    ],
    "targets": [
      {
        "类型": "module",
        "模块ID": "help"
      }
    ],
    "触发": {
      "类型": "resourceSelected",
      "来源模块ID": "compose"
    },
    "条件": {
      "类型": "selectedResourceFieldIn",
      "字段": "类型",
      "值": [
        "A",
        "B"
      ]
    },
    "动作": [
      {
        "类型": "setVisibility",
        "目标类型": "module",
        "目标ID": "help",
        "显示": true
      }
    ]
  },
  {
    "ID": "resource-not-condition",
    "sources": [
      {
        "类型": "resourcePicker",
        "模块ID": "pick"
      }
    ],
    "targets": [
      {
        "类型": "module",
        "模块ID": "help"
      }
    ],
    "触发": {
      "类型": "resourceSelected",
      "来源模块ID": "pick"
    },
    "条件": {
      "类型": "selectedResourceFieldNotEquals",
      "字段": "类型",
      "值": "隐藏"
    },
    "动作": [
      {
        "类型": "setVisibility",
        "目标类型": "module",
        "目标ID": "help",
        "显示": true
      }
    ]
  }
]
```

<!-- END GENERATED CONTRACT -->
