# Questionnaire Character Creation 合同

问卷式车卡让 System Package Author 用自包含 HTML/CSS/JavaScript 设计问题、计分、推荐、动画与结果说明。Base Framework 不解释问题，也不规定推荐算法；它只负责隔离运行、校验结构化结果、向 Player 展示将要发生的选择，并在确认后重放现有 Resource Picker 操作。

## 作者边界

- 在 `manifest.json` 声明至多一个 `questionnaireCharacterCreation`，HTML 路径必须位于包内。
- HTML 在 Base-owned 新标签页内的 sandbox iframe 中运行；可使用内联 CSS/JavaScript，但没有同源权限、网络、表单提交、弹窗、下载、外层导航或宿主 API。
- 第一版只支持选择现有 Resource Picker 已链接的 Resource Entry，不支持文本填写、Checkbox、Countable、Composer、Card、任意 Dependency Event 或 Character Data patch。
- 问卷不需要也不应复制 `dependencies.json` 的动作。它只提交 Picker、Library 与稳定 Entry ID；Base 随后走与玩家手动选择同一条提交流程。

## 返回结果

Author HTML 通过父窗口消息提交一次结果：

```js
window.parent.postMessage({
  type: "pbdh-questionnaire-result",
  result: {
    protocolVersion: "1",
    interactions: [{
      type: "resourceSelected",
      sourceModuleId: "pick-class",
      libraryId: "classes",
      entryIds: ["职业:德鲁伊"]
    }]
  }
}, "*");
```

消息目标使用 `"*"` 是因为 sandbox iframe 具有不透明 origin；Base 仍会验证消息来源必须是本次 Host 的确切 iframe。不要在消息里发送显示名称来代替 ID，也不要返回问题答案或计分过程，除非它们只是问卷页面自己的展示状态。

多个 interaction 按数组顺序执行。例如先选职业、再选子职时，后一个选择会看到前一个选择已经在同一草稿上产生的依赖结果。任一引用或形状无效时整批拒绝；Player 确认前以及取消后，当前 Character Save 都不改变。

真实接入示例见 `public/system-packages/tttri/questionnaires/` 与 `public/system-packages/daggerheart-core/questionnaires/`。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### Questionnaire Character Creation declaration

manifest 内的问卷身份、显示名称与自包含 HTML 路径。

语义约束：

- 每个 System Package 至多声明一个问卷；HTML 在 Base-owned 新标签页的 sandbox iframe 中运行。
- 问卷问题、计分、推荐和视觉表现完全由 Author HTML/CSS/JS 负责。
- 问卷不读取 Character Data，也不能直接调用 Runtime Store、Storage 或 Dependency Engine。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | manifest 内的问卷身份、显示名称与自包含 HTML 路径。 |
| ID | 是 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| html | 是 | string | 最短 1 |

### Loaded Questionnaire runtime shape

Loader 装配 HTML 内容后的问卷定义。

语义约束：

- Author 不直接编写 htmlContent；它由 manifest 声明的安全包内路径装配。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；Loader 装配 HTML 内容后的问卷定义。 |
| ID | 是 | string | 最短 1 |
| 名称 | 是 | string | 最短 1 |
| htmlContent | 是 | string | 最短 1 |

### Questionnaire result

问卷返回的有序 Resource Picker 选择列表。

语义约束：

- 仅支持 resourceSelected；sourceModuleId 必须是现有 Resource Picker，libraryId 必须是该 Picker 已链接的 Resource Library。
- entryIds 必须是该库内稳定且不重复的 Resource Entry ID，并遵守 Picker 单选/多选约束。
- Base 按 interactions 声明顺序在草稿上重放现有 Picker 提交流程；Player 确认后才原子写入并保存一次。
- 问卷结果最大 64 KiB；无效、过期或取消的结果不会修改 Character Data。
- 接入问卷不要求修改 dependencies.json；重放会自然触发 Picker 已有的 resourceSelected Dependency Logic。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | 未知字段不属于合同；问卷返回的有序 Resource Picker 选择列表。 |
| protocolVersion | 是 | "1" | — |
| interactions | 是 | array | 最少项 1；最多项 32 |
| interactions[] | 是 | object | 未知字段不属于合同 |
| interactions[].type | 是 | "resourceSelected" | — |
| interactions[].sourceModuleId | 是 | string | 最短 1 |
| interactions[].libraryId | 是 | string | 最短 1 |
| interactions[].entryIds | 是 | array | 最少项 1；最多项 100 |
| interactions[].entryIds[] | 是 | string | 最短 1 |

<!-- END GENERATED CONTRACT -->
