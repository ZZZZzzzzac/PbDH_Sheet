# ADR-0031: Isolated Questionnaire Replays Resource Picker Selections

状态：Accepted
日期：2026-07-26

## 背景

Questionnaire Character Creation 需要允许 System Package Author 用与游戏资源和规则无关的问题发现 Player 偏好，再推荐职业、领域、子职业或其他 Resource Library entries。问卷的问题、评分、分支、总结、动画和视觉表现都属于 System Package 的系统特有知识；如果 Base Framework 为这些内容维护持续扩张的声明式问卷与展示合同，Author 的表现需求会反过来扩大框架接口。

一个已经完成的 System Package 通常已经通过 Resource Picker 与 Dependency Logic 建立手动车卡路径：Player 在 Picker 中选择 Resource Entry 后，`resourceSelected` 触发现有依赖，填写文字、更新计数、控制可见性或后续筛选，并可按 Picker 配置创建 Card。Author 添加问卷时不应重写或复制这些关系，也不应修改已有 `dependencies.json`。

同时，直接在主 Sheet Tool 中执行 Author HTML/JavaScript 会绕过 ADR-0002 与 ADR-0014 的声明式页面和安全静态 Layout 决定，并可能获得主应用 DOM、Storage 或 Runtime Store 能力。问卷需要充分的表现自由，但不能成为修改实时 Character Data 的任意脚本入口。

## 决策

Questionnaire Character Creation 作为与 Character Creation Guide 和 Sheet Modules 分离的可选 Player workflow 实现。

- System Package 可以声明一个 Author HTML/CSS/JavaScript 问卷入口。问卷拥有问题、答案、评分、分支、结果总结和全部问卷内视觉表现。
- Player 从 Base Framework 拥有的入口显式启动问卷。Base 在新的浏览器标签页打开受信任的 Questionnaire Host；Host 在不带 `allow-same-origin` 的 sandboxed iframe 中运行 Author HTML，并限制网络、Storage、父页面访问、弹窗、下载和其他未授权能力。
- 第一版问卷是单个自包含 HTML 文件，样式与脚本内联；Questionnaire Host 负责装配该 HTML、隔离策略、生命周期、消息来源检查、版本化消息 envelope、结果大小限制和错误报告。Host 与主 Sheet Tool 通信；Author iframe 不能直接访问主 Sheet Tool。
- 问卷答案、进度和中间结果是该标签页的 transient UI state，不进入 Character Data、Character Save、Dependency Logic、Validation Check、localStorage 或 IndexedDB。关闭问卷即丢弃未提交状态。
- 第一版问卷结果只包含一个有序的 Resource Picker selection 列表。每项只携带目标 Resource Picker Module ID、Resource Library ID 与 Stable Resource Entry IDs；Author HTML 不能提供 Resource Entry payload、Character Data patch、Dependency Action、Card instruction 或 Runtime Store action。
- Base 从当前 Effective Resource Catalog 重新解析 Stable Resource References，并验证目标 Module 是真实 Resource Picker、Resource Library 对该 Picker 有效且选择数量符合单选或多选合同。无效 Picker、未链接 Library、无效形状或违反选择数量约束时整批拒绝。仅当 Stable Resource Entry 不存在时，Base 将其保留为确认界面的缺失资源警告并跳过该选择；其余可用选择仍可由 Player 确认执行。没有任何可用选择时禁止确认。这允许问卷推荐由可选 Resource Extension 提供的资源，同时避免静默失败。
- 每项结果复用 Player 在对应 Resource Picker 中确认相同 Resource Entries 的完整提交语义，包括 `resourceSelected`、Dependency Logic、Derived Source Snapshot、Card creation、派生状态重建和自动保存。Questionnaire 不新增 Dependency Trigger，也不直接调用 Dependency Engine 的局部接口。
- 多个 Picker selections 按问卷结果声明顺序执行，等价于 Player 依次操作这些 Pickers。Base 可以先在 Character Data draft 上按相同语义预演全部选择，并在 Player 确认后原子提交一次；任一选择失败时 Character Data 保持不变。
- Base-owned 确认界面显示将提交的 Picker selections，以及当前 Effective Resource Catalog 中无法解析的 Library/Stable Entry ID；若提供详细变化预览，内容必须由 Base 对 draft 的真实执行结果生成，不能信任 Author HTML 自报的 Character Data 变化。
- Questionnaire 运行期间 Current System Package 或 Character Save 发生变化时，未提交结果失效，必须重新验证或重新运行。
- 第一版不支持问卷直接填写 Free Text、Long Text、Checkbox、Countable、Composite Resource 或 Card，不接受 `freeTextChanged`、`checkboxChanged`、`countableChanged` 等其他 Dependency Events，也不提供通用 Character Change Proposal。需要填写的内容继续由已有 Resource Picker 与 `dependencies.json` 产生。
- Author 为已完成的 System Package 添加问卷时，只需添加问卷入口和资源，并让结果引用已有 Picker/Library/Entry IDs；只要原手动车卡路径完整，就不需要修改 `modules.json`、Resource Libraries 或 `dependencies.json`。

问卷选择与手动选择具有以下等价性承诺：给定相同 Current System Package、Effective Resource Catalog 与初始 Character Data，Player 手动在一组 Resource Pickers 中依次确认 Resource Entries，与问卷按相同顺序返回并确认相同 Stable Resource References，除时间戳、autosave 时机和 transient UI state 外，必须产生相同 Character Data、Cards、Resource Selection Snapshots 和 Dependency 派生结果。

## 理由

- Author HTML 保留原生 Web 的布局、动画和交互自由，Base 不需要为了单个问卷的艺术表现扩张通用问卷 UI 合同。
- 新标签页中的受信任 Host 与 sandboxed Author iframe 将任意问卷表现和主 Sheet Tool 分开；Author 代码只通过窄的结果消息 seam 影响框架。
- 返回 Picker selections 而不是 Character Data patches，让问卷只表达“Player 选择了什么”，而现有 Dependency Logic 继续表达“这个选择对角色卡意味着什么”。
- 手动 Picker 与问卷共用同一提交 Implementation，避免两套填表、Card 创建、派生重建和保存语义，也使既有 System Package 可以无依赖改动地补充问卷。
- 第一版只支持 Picker selections，使消息合同保持小而深，并避免把所有 Sheet Module 编辑动作重新包装成第二套 action vocabulary。
- Base 重新解析引用、预演结果并拥有最终确认，能防止 Author HTML 伪造 Resource Entry 内容或绕过 Character Data 与 Runtime Store 的写入路径。

## 代价

- System Package 获得一个新的受限 Author HTML/JavaScript seam；它只存在于隔离问卷标签页，但仍扩大陌生来源包的可执行代码面。浏览器 sandbox 不是针对主动恶意代码的绝对安全隔离，错误脚本仍可能耗尽问卷标签页资源。
- Questionnaire Host 需要处理新标签页被拦截或关闭、sandbox/CSP、消息认证、移动浏览器行为和错误恢复。
- Author 必须使用准确的 Picker Module ID、Resource Library ID 和 Stable Resource Entry IDs；System Package 更新这些稳定身份时必须同步问卷。
- 问卷不能直接生成或填写没有既有 Resource Picker 路径的自由文本、数值、勾选项、Composite Resource 或 Card。
- 多 Picker 批量执行需要从现有 Store 编排中提取可作用于 Character Data draft 的共享 Resource Picker selection Implementation，才能同时保证手动/问卷等价、预演与原子提交。
- 新标签页视觉体验在移动浏览器、弹窗策略和多窗口管理上不如主应用内对话框一致。

## 后续信号

- 多个真实 System Package 明确需要问卷直接复现 Free Text、Checkbox、Countable 或 Resource Composer 的完整 Player 操作时，逐项评估复用对应 Sheet Module 提交语义；不得直接开放任意 Dependency Event 或 Character Data patch。
- 如果多个问卷只需要相同的简单题目/选项 UI，可提供建立在同一 Questionnaire Host 和结果协议之上的可复制 Starter Questionnaire App；不把它升级为第二套强制 Base 问卷 DSL。
- 如果 sandboxed iframe 对陌生来源 System Package 的隔离不足，评估更强的代码隔离、签名或信任提示；不能因此让 Author HTML 进入主 Sheet Tool DOM。
- 如果新标签页在主要 Player 设备上被频繁拦截或造成明显流程中断，可在保持相同 sandbox、消息和结果合同的前提下评估 Base-owned 全屏 Host。
- 如果实际需求出现远程库、外部依赖或网络问卷，必须另行决策；第一版问卷只使用 System Package 内资源。
