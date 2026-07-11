# PbDH Sheet Framework 架构

状态：Draft  
日期：2026-07-06

本文记录 PbDH Sheet Framework 第一版架构。具体 JSON 字段、模块配置格式和 Character Data 格式后续可演进；本文只固定影响 Base Framework 边界的方向。

相关图见：[C4 架构图](c4.md)。

## 一句话定位

PbDH Sheet Framework 是一个无服务器 API 的静态 Web 应用。Author 上传或制作 System Package，Base Framework 将其渲染为 Player 使用的 Sheet Tool，并在浏览器本地保存 Character Data。

## 核心约束

- 第一版主路径是 HTTPS 静态部署网页。
- PWA 只缓存应用壳，不缓存用户上传的 System Package。
- System Package 来源只支持本地上传 zip；目录包是 Author 增强路径。
- Base Framework 不提供账号、云同步、系统包市场、服务器 PDF 或在线 AI 生成。
- Character Data 按模块/字段 ID 存，不按页面布局树存。
- System Package 是声明式数据包，不能修改 Base Framework 模块代码。
- Sheet Renderer 在第一版渲染 HTML Layout Template，并在 `<pb-module>` 占位符处挂载 Sheet Modules。
- 游戏值默认按字符串处理；框架只严格校验结构字段、ID、引用和路径。
- 复杂规则检查用 JS Validation Scripts，只读输入，输出 issue list。

## 质量属性

| 属性 | 目标 | 取舍 |
| --- | --- | --- |
| 可维护性 | 模块、加载、校验、状态、依赖、导出分层清楚 | 不追求最少文件数 |
| 可扩展性 | System Package schema、模块注册表、依赖动作可演进 | MVP 先不做链式依赖 |
| 离线能力 | 已访问过网页后，可用 PWA 打开应用壳 | 不保证浏览器永不清缓存 |
| 数据安全 | Character Data 可导出 JSON 备份 | 不做云同步 |
| Author 体验 | 校验错误给路径、原因、建议和 AI debug | 需要维护系统包文档 |
| Player 体验 | 本地保存、多角色、车卡指引、导出、打印、卡牌基础操作 | 不做多人同步和自动规则结算 |

## 系统上下文

```text
Author（作者）
  -> System Package zip / 目录包
  -> PbDH Sheet Framework
  -> 通过 QQ 群 / GitHub 等其他渠道分发 System Package 给 Player

Player（玩家）
  -> 浏览器
  -> PbDH Sheet Framework
  -> Character Data JSON / HTML 快照 / 浏览器打印 PDF

PbDH Sheet Framework
  -> IndexedDB / localStorage
  -> PWA 应用壳缓存
```

## 容器划分

```text
静态托管应用
  |
  +-- app-shell
  |     PWA、全局错误、模式切换
  |
  +-- package-loader
  |     zip/目录输入 -> 虚拟文件系统
  |
  +-- package-schema
  |     TypeScript 类型、schema 校验、Normalized System Package
  |
  +-- package-validator
  |     fatal/error/warning/info/debug 诊断
  |
  +-- storage
  |     IndexedDB、localStorage 小索引
  |
  +-- state-store
  |     Zustand 运行时状态、actions、运行时数据流枢纽
  |
  +-- sheet-renderer
  |     HTML Layout Template、页面结构渲染、模块注册表、模块组件
  |
  +-- dependency-engine
  |     依赖规则 -> 视图效果 / 数据补丁 / 选项效果
  |
  +-- card-engine
  |     Card Definition + Card Instance 操作
  |
  +-- guide-session + spotlight
  |     临时线性步骤、目标滚动/高亮、纯文本说明
  |
  +-- validation-runner
  |     在 Web Worker 中执行 JS 检查
  |
  +-- export-print
        Print Mode、HTML 快照、图片加载等待
```

## 主数据流

### 导入 System Package

```text
上传 zip / 选择目录包
  -> package-loader 构建虚拟文件系统
  -> 读取 manifest
  -> package-schema 解析已知结构
  -> package-validator 检查结构和引用
  -> fatal：导入失败
  -> error：显示 Author 错误视图，不渲染 Sheet Tool
  -> warning：允许渲染
  -> storage 缓存包数据和资源索引
  -> state-store 设置当前 System Package
```

### 编辑 Character

```text
Sheet Module 事件
  -> dispatch store action
  -> 更新 Character Data
  -> state-store 调用 dependency-engine
  -> dependency-engine 纯函数计算派生视图状态和补丁
  -> store 提交允许的补丁
  -> sheet-renderer 重渲染可见模块、选项和效果
  -> debounce 后自动保存到 IndexedDB
```

### 运行检查

```text
手动检查或导出/打印
  -> 从 Character Data + Resource Libraries + metadata 构建输入副本
  -> 在隔离 Web Worker 中执行声明的 JS 检查
  -> 归一化 issue list
  -> 合并 issues 并补充来源信息
  -> 显示报告
```

### 运行车卡指引

```text
Player 启动车卡指引
  -> guide-session 从第一个 Guide Step 建立临时线性位置
  -> spotlight surface 解析 page / Sheet Module 稳定目标
  -> 可见目标滚入视口并高亮；隐藏目标降级为提示
  -> Player 可直接操作高亮模块，模块仍走既有 store actions / engines
  -> Player 手动上一步、下一步、完成或退出
  -> 完成/退出只清除临时 Guide Session
```

### 导出和打印

```text
运行检查
  -> 显示 warning/error，Player 可以继续
  -> 进入 Print Mode 或构建 HTML 快照
  -> 等待当前显示图片加载
  -> 图片失败时使用文字 fallback
  -> 浏览器打印 / 保存 PDF / 导出只读 HTML 快照
```

## 核心用例与内部 API 边界

本节只定义内部边界，不锁死具体函数签名。实现时可以调整参数形状，但不能绕过这些边界。

### Package 边界

Package 相关能力只由 package-loader、package-schema、package-validator 和 asset resolver 提供。

```text
importPackage(source)
  -> 加载 zip 或目录来源

validatePackage(rawPackage)
  -> 诊断结果

normalizePackage(rawPackage)
  -> Normalized System Package

resolveAsset(assetRef)
  -> Blob URL / 加载状态 / 错误

getResourceLibrary(libraryId)
  -> Resource Library
```

约束：

- Sheet Module 不直接读取 zip、目录文件或 IndexedDB asset。
- 页面和模块只使用 Normalized System Package。
- 路径解析、路径安全和 asset fallback 只在 package/asset 层处理。

### Character 边界

Character 相关能力由 state-store 和 storage service 协作提供。

```text
createCharacter(packageId)
switchCharacter(characterId)
updateModuleValue(moduleId, value)
importCharacterJson(file)
exportCharacterJson(characterId)
```

约束：

- Character Data 按模块/字段 ID 存，不按页面布局树存。
- Sheet Module 只发出 action，不直接写 IndexedDB。
- Storage Service 负责持久化；组件和 Dependency Engine 不直接操作存储。

### Renderer 与 Module 边界

Sheet Renderer 根据 HTML Layout Template 和 Module Registry 渲染模块。模板负责页面结构、静态装饰和 CSS 布局；`<pb-module>` 占位符负责挂载框架提供的 Sheet Modules。

System Package 可选声明 Sheet Shell。Shell 通过唯一 `<pb-page-outlet>` 挂载 Current Page，并可在 outlet 外放置 Persistent Modules。切页只替换 outlet 内容；输出模式在 outlet 中放入全部可打印页面，Persistent Modules 仍只渲染一次。

Author-facing 接口见：[System Package HTML Layout Template 接口](system-package-html-layout-template.md)。

```text
renderModule({
  moduleConfig,
  value,
  derivedState,
  assetResolver,
  dispatch
})
```

约束：

- Sheet Module 接收当前值、模块配置和派生状态。
- Sheet Module 发出 action。
- Sheet Module 不调用其他模块。
- Sheet Module 不直接调用 Dependency Engine。
- Sheet Module 不执行跨模块写入。
- Sheet Module 不直接运行依赖逻辑、检查脚本或存储逻辑。
- Sheet Module 不知道自己位于哪个模板容器中；布局信息只由 Sheet Renderer 使用。
- Sheet Renderer 可以读取模板结构和 scoped CSS，但这些值不进入 Character Data。
- HTML Layout Template 不能声明交互控件或自定义行为；所有读写状态的交互必须来自框架模块或框架交互面。

### Dependency Engine 边界

Dependency Engine 是跨模块联动唯一协调者。

```text
evaluateDependencies({
  characterData,
  resourceLibraries,
  cardState,
  packageMetadata,
  rules
})
  -> viewEffects
  -> dataPatches
  -> optionEffects
  -> dependencyErrors
```

约束：

- Dependency Engine 只读角色卡相关数据，不读 DOM 或 UI 临时状态。
- Dependency Engine 输出 patch/effect，不直接操作组件。
- Dependency Engine 尽量是纯函数：同一输入得到同一输出，不直接读写 Zustand store、IndexedDB 或 UI。
- Dependency Engine 由 Zustand store action 调用，Sheet Module 不直接调用它。
- 所有跨模块变化必须通过 Dependency Engine。
- MVP 单轮计算，不做链式触发。

### Guide Session 与 Spotlight 边界

Guide Session 与 Spotlight Surface 运行 Author 声明的 Character Creation Guide，但不实现或请求任何游戏规则行为。

```text
startGuideSession()
  -> { stepIndex: 0 }

resolveGuideTarget(currentStep)
  -> visible page/module target | unavailable | no target
```

约束：

- Guide Session 只读取 Guide definition 并维护当前打开会话中的 step index；不读取 Character Data，也不持久化。
- Spotlight Surface 只通过 Renderer 暴露的稳定 page/module 标识读取目标几何与可见性。
- Guide 不发出 resourceSelected、不执行 fillText、不操作 Cards、不运行 Validation Checks。
- 高亮目标继续通过自身 Sheet Module action 与既有 engines 工作；Guide 不观察操作结果，也不自动推进。
- 隐藏目标保持隐藏；Guide 显示不可见提示，不覆盖 Dependency Logic 的派生状态。

### Validation Runner 边界

Validation Runner 负责执行 System Package 声明的 JS checks。

```text
runValidationChecks({
  characterData,
  resourceLibraries,
  cardState,
  packageMetadata,
  checks
})
  -> validationIssues[]
```

约束：

- 检查脚本只在 Web Worker 中运行。
- 输入是副本。
- 输出是 issue list。
- Validation Runner 不修改 Character Data。
- Validation Scripts 不参与实时 UI 依赖逻辑。

### Storage 边界

Storage Service 统一管理浏览器持久化。

```text
saveCharacter(characterData)
loadCharacter(characterId)
listCharacters(packageId)
cachePackage(normalizedPackage, assetIndex)
loadPackageCache(packageId)
saveAssetBlob(assetRef, blob)
```

约束：

- `localStorage` 只保存小索引和 UI 偏好。
- IndexedDB 保存 Character Saves、System Package cache 和 assets。
- UI 组件、Sheet Modules、Validation Scripts 不直接读写 IndexedDB。

### Export 边界

Export/Print 只读取当前内存状态和 asset resolver，不重新解释 System Package。

```text
buildHtmlSnapshot(characterData, renderedPrintView)
enterPrintMode(characterId)
waitForVisibleImages(printView)
```

约束：

- 导出前运行 Validation Runner。
- warning/error 只提示，不硬阻止。
- HTML 导出是只读快照。
- PDF 通过浏览器打印/另存 PDF，不内置 PDF 生成器。

## System Package 边界

System Package 包含：

- manifest 入口文件。
- Resource Libraries。
- 页面和 HTML Layout Template 声明。
- Sheet Module 声明。
- 依赖规则。
- Character Creation Guide 声明。
- Validation Script 声明。
- 样式和模块实例 CSS 覆盖。
- Assets。

System Package 不能：

- 修改 Base Framework 模块代码。
- 注入任意 UI 逻辑。
- 注入车卡指引脚本或自定义 guide UI。
- 调用外部服务。
- 绕过框架定义的依赖动作修改 Character Data。
- 绕过 Validator、Storage Service、Dependency Engine、Guide Session/Spotlight 或 Validation Runner。

## Sheet Module 边界

Sheet Modules 是框架提供的组件。单个模块：

- 渲染当前状态。
- 接收 Player 输入。
- 发出 store actions。
- 声明自己支持的依赖效果和样式 parts。
- 不直接读取 zip 文件、IndexedDB 或其他模块。
- 不执行跨模块写入。

Author 在页面 `layout.css` 中通过 `data-module-id` 精确指定模块实例，通过 `data-module-type` 设置类型默认样式，并通过稳定 `data-part` 定位模块内部部件。整个 CSS 先按页面隔离；实例规则由显式 module ID selector 隔离同页模块。

## Dependency Engine 边界

依赖规则是集中声明的 System Package 内容。Dependency Engine：

- 读取 Character Data、Resource Libraries、Card Instance State 和包 metadata。
- 不读取 DOM、UI 临时状态或 Validation Script 结果。
- 输出 view effects、data patches 和 option effects。
- 是唯一允许执行跨模块 Character Data patch 的组件。
- MVP 不支持链式触发。

每条规则应声明 sources 和 targets，用于校验、冲突检测和未来索引优化。

## Guide Session 与 Spotlight 边界

车卡指引是集中声明的 System Package 内容。Guide Session 与 Spotlight Surface：

- 只读取 Guide definition、临时 step index 和稳定 page/module 目标的显示几何。
- 不读取 Character Data，不执行 Author 脚本，不解释或请求游戏规则行为。
- 只输出遮罩、滚动、高亮、说明、目标不可见提示和手动导航 UI。
- 不发出资源选择事件，不执行跨模块 Character Data patch，不操作 Cards，不触发 Validation Runner。
- 高亮 Sheet Module 保持普通交互，所有实际行为仍由模块及既有引擎负责。

每个 Guide Step 声明稳定 ID、纯文本标题/说明，以及可选的单一页面或 Sheet Module 目标，用于校验、预览和 AI 辅助生成。

## Card Engine 边界

Card Definition 是不可变资源数据。Card Instance 是 Player 拥有的运行时状态。

卡牌以自由桌面模型展示：玩家在一个卡牌桌面区域内自由摆放卡牌，通过坐标和层级确定位置，不强制离散容器区域。卡牌实例的具体字段是实现细节，不在此固定。

Card Engine 支持 MVP 范围内的展示、创建、删除、拖拽移动、排序和状态切换。翻面、横置/竖置、指示物数字等操作列入后续信号。它不实现抽牌、弃牌、洗牌、支付、数量上限、合法性检查或效果结算。合法性问题由 Validation Scripts 报告。

## Storage 边界

- `localStorage` 只保存小指针和 UI 偏好。
- IndexedDB 保存 System Package cache、Character Saves、玩家上传图片 Blob 和资源索引。
- System Package 图片按 Blob 引用保存，不写入 Character Data；Player 导入 Character Data 后通过资源引用和重新加载 System Package 恢复系统图片。
- 玩家上传的头像/立绘属于玩家数据，必须随 Character Data 一起可恢复；Character Data 中以 dataUrl/base64 保存这些图片，确保导出导入跨设备可用。
- System Package cache 可能丢失；Player 可以重新上传 zip。
- Character Data JSON 导出是恢复机制。

## Validation 边界

System Package Validator 检查结构和框架契约。Validation Scripts 检查具体游戏规则下已填写角色卡是否合理。

Validator 严重级别：

- `fatal`：导入失败。
- `error`：包可进入错误视图查看，但 Sheet Tool 不渲染。
- `warning`：允许渲染。
- `info/debug`：服务 Author/AI 的辅助信息。

Validation Scripts：

- 多个 JS 文件。
- 每个脚本使用独立 Web Worker。
- 只接收输入副本。
- 输出包含 `level` 和 `text` 的 issue list。
- 无 DOM、无框架修改 API、无外部依赖。

## 技术基线

- Vite。
- React。
- TypeScript。
- Zustand。
- IndexedDB，配合 Dexie 或等价封装。
- Zod 或等价 schema 工具，用于结构化 JSON 校验。
- fflate 作为 zip 解包候选，需压测确认。
- Vitest、Testing Library 和 Playwright。

## 瓶颈和风险

| 风险 | 第一失败模式 | 缓解方式 |
| --- | --- | --- |
| 依赖复杂度 | 规则冲突或隐藏链式依赖 | 集中式引擎、sources/targets、MVP 不做链式 |
| 大资源包 | 移动端内存压力和图片解码慢 | 懒显示/懒解码、不用 base64、文字 fallback |
| 浏览器存储清理 | package/cache 丢失 | JSON 导出备份、重新上传 package |
| 检查脚本 bug | Worker 超时或输出格式错误 | 隔离 Worker、输出归一化、失败转 issue |
| 车卡指引与依赖重叠 | 指引变成第二套规则引擎 | Guide 只展示、滚动和高亮，不读取角色数据或请求任何规则动作 |
| CSS 覆盖滥用 | 单个模块布局损坏 | 模块级 CSS 作用域、稳定 parts、Author Preview |
| Package schema 漂移 | 旧包行为异常 | schema version warning、未来迁移 |

## 演进路线

### MVP

- 静态托管应用 + PWA 应用壳。
- zip 上传和可选目录包。
- 基于 manifest 的 System Package。
- HTML Layout Template + scoped CSS。
- 核心 Sheet Modules。
- 不支持链式触发的集中式 Dependency Engine。
- 声明式线性 Guide Session 与 Spotlight Surface。
- 在 Web Worker 中运行 JS Validation Scripts。
- 支持翻面、旋转和数字指示物的 Card Instance 模型。
- IndexedDB 持久化。
- HTML 快照和浏览器打印/PDF。

### 成长期

- package schema 迁移器。
- 依赖规则索引和可选链式触发。
- 如果出现第二个实际布局 adapter，再评估是否从 Sheet Renderer 抽出独立布局模块。
- 如果陌生来源包变多，升级更强脚本沙箱。
- 更丰富的卡牌容器和指示物类型。
- 如果包体积增长，再引入可选缩略图或打印资源。

### 成熟期

- 如果真实需求出现，再加入用于包发布、云存档或 AI 辅助的可选服务器 API。
- 如果文件直开场景变常见，再做更完整的离线/便携构建。
- 为公开 System Packages 建更强兼容性测试套件。

## ADR 索引

- [ADR-0001：静态 PWA，无服务器 API](adr/0001-static-pwa-no-server-api.md)
- [ADR-0002：System Package 契约](adr/0002-system-package-contract.md)
- [ADR-0003：System Package Validator 严重级别](adr/0003-system-package-validator.md)
- [ADR-0004：Dependency Engine 边界](adr/0004-dependency-engine-boundary.md)
- [ADR-0005：Validation Script Runner](adr/0005-validation-script-runner.md)
- [ADR-0006：本地存储与资源](adr/0006-local-storage-and-assets.md)
- [ADR-0007：Card Instance 模型](adr/0007-card-instance-model.md)
- [ADR-0008：Zustand 状态管理](adr/0008-zustand-state-management.md)
- [ADR-0009：前端技术基线](adr/0009-frontend-technology-baseline.md)
- [ADR-0010：模块实例级样式覆盖](adr/0010-module-scoped-style-overrides.md)
- [ADR-0011：Character Data 值类型分层](adr/0011-character-data-value-types.md)
- [ADR-0012：Sheet Renderer 负责 Flow Layout（已被 ADR-0014 取代）](adr/0012-sheet-renderer-owns-flow-layout.md)
- [ADR-0013：声明式车卡指引（已被 ADR-0015 取代）](adr/0013-declarative-character-creation-guide.md)
- [ADR-0014：HTML Layout Template 是主要作者布局模型](adr/0014-html-layout-template-primary-layout.md)
- [ADR-0015：车卡指引作为线性聚光灯导览](adr/0015-character-creation-guide-as-spotlight-tour.md)
