# AI 协作提示词：完整自包含模板

复制下面的提示词，把方括号替换为实际材料。模板直接列出当前接口和全部可选能力，不要求 AI 去另一个示例包猜结构。

```text
你正在为 PbDH Sheet Framework 制作一个声明式 System Package。

基础资料：
- schemaVersion: 0.1.0
- 系统名称：[名称]
- 稳定 package ID：[kebab-case ID]
- Author 版本：[版本]
- 规则材料：[粘贴规则或列出资料]
- Pages：[名称、用途、初始是否隐藏、是否打印]
- Character Data：[玩家需要填写和保存的字段]
- Resource Libraries：[资源类型、字段、现有数据]
- Cards：[哪些 Libraries 生成 Cards；名称/描述/卡图/展示字段]
- Dependencies：[选择/勾选后填文本、填 Counter、显隐、默认筛选]
- Guide：[线性步骤和可选 Page/Module target]
- Validation Checks：[只读报告规则]
- Assets：[图片/字体以外的包内文件；ID、路径、MIME]

先输出这个文件树，并按实际需求删除不用的可选文件：

package-root/
├─ manifest.json
├─ pages.json
├─ modules.json
├─ dependencies.json                 # 可选
├─ resources/*.json                  # 可选
├─ layouts/*.html
├─ layouts/*.css                     # 每个 Page/Shell CSS 都可选
├─ guides/character-creation.json    # 可选
├─ checks/*.js                       # 可选
└─ assets/*                          # 可选

manifest 必填键：
ID, 名称, 版本, schemaVersion, pages, modules

manifest 可选键与形态：
- shell: { html, css? }
- dependencies: path
- characterCreationGuide: path
- resourceLibraries: [{ ID, 名称, 路径 }]
- validationChecks: [{ ID, 脚本 }]
- assets: [{ ID, 路径, 类型? }]

Page 形态：
{
  ID, 名称,
  默认隐藏?: boolean,
  打印?: boolean,
  layout: { 类型: "htmlTemplate", html: path, css?: path }
}

只使用以下八种 Sheet Module，并按需展示这些可选键：
1. freeText: ID, 类型, 标签, 默认值?, 隐藏标签?, 占位文本?, 默认隐藏?
2. longText: ID, 类型, 标签, 默认值?, 行数?(2-20), 隐藏标签?, 占位文本?, 默认隐藏?
3. checkboxResource: ID, 类型, 标签, 选项:[{ID,标签,默认选中?}], 默认隐藏?
4. countableResource: ID, 类型, 标签, 最小值?, 最大值?, 默认值?, 步长?, 最大值可改?, 显示方式?(数值|标记), 当前值标记?, 剩余值标记?, 默认隐藏?；标记展示的两个标记各为一个不同的可见 Unicode 字素且最小值不得为负
5. readOnlyDisplay: ID, 类型, 标签, 内容?, 资源ID?, 替代文本?, 默认隐藏?；内容/资源至少一个
6. imageField: ID, 类型, 标签, 替代文本?, 默认隐藏?
7. resourcePicker: ID, 类型, 按钮文本, 资源库ID, 字段模板?, 多选?, 默认查询?, 创建卡牌?, 默认隐藏?
8. cardTable: ID, 类型, 标签, 资源库IDs, 状态选项?, 显示方式?, 卡名字段?, 描述字段?, 卡图字段?, 显示方式字段?, 默认隐藏?

Resource Picker 字段模板每项：
{ 键, 标签?, 默认显示?, 可筛选?, 可排序?, 可搜索?, 列宽? }
列宽只能是 compact|normal|wide|fill。
默认查询：{ filters?: Record<string,string[]>, sort?: { field, direction?: asc|desc } }
创建卡牌：{ 卡牌桌面模块ID, 默认状态? }
Resource Entry 的 ID 必填但 Picker 默认不显示；只有需要展示时才显式配置 ID 字段模板。

Dependency Rule：
{ ID, sources:[Source...], targets:[Target...], 触发, 条件?, 动作:[Action...] }

允许 source/trigger：
- resourcePicker + resourceSelected
- checkboxResource + checkboxChanged

允许 condition：
- always
- selectedResourceFieldEquals
- selectedResourceFieldNotEquals
- selectedResourceFieldIn
- checkboxOptionChecked
- checkboxOptionUnchecked

允许 action：
- fillText：目标只能 freeText/longText/readOnlyDisplay；内容是字符串或 selectedResourceField
- fillCountable：目标只能 countableResource；当前值?/最大值? 是整数或 selectedResourceField，最大值还可为 null
- setVisibility：目标 page|module
- setResourceDefaultFilter：目标 Resource Picker，值是非空 string[]

Guide：
{ 步骤:[{ ID, 标题, 说明, 目标?: {类型:"page",页面ID}|{类型:"module",模块ID} }] }

Validation Script：
module.exports = async ({ characterData, resourceLibraries, cardState, packageMetadata }) => [];
只返回 {level:error|warning|info,text,path?,code?}，不写状态、不访问 DOM/网络。

HTML/CSS 要求：
- 使用安全静态 HTML、pb-module 和可选 Sheet Shell 的唯一 pb-page-outlet。
- 不使用 Flow Layout、selectionText、自定义 input/button/script、inline style、on*、外部 URL。
- CSS 不用 @import，不污染 html/body/:root，不依赖 React DOM/class。

严格要求：
- 所有 ID 唯一且稳定，所有引用存在，所有路径安全相对。
- 普通 Sheet Value/Resource Value 保持显示文本语义。
- Card Table 使用资源库IDs；每个 Card Definition 有配置后的非空名称和描述。
- Dependency 单轮执行，不生成链式规则或任意脚本写状态。
- Guide 不读取 Character Data，不分支、不自动推进。
- Validator 规则不能由包关闭、降级或声明例外。
- 不生成 suggestion 字段。

按这个顺序输出完整文件内容：
1. 文件树
2. manifest.json
3. Resource/Asset 文件
4. modules.json
5. pages.json、HTML、CSS、可选 Shell
6. dependencies.json
7. Guide
8. Validation Checks
9. ID/路径/引用/Card 字段/Dependency target 自检表
```

## 推荐协作循环

1. 先让 AI 输出最小可导入骨架。
2. 运行 Validator，把完整 `code/location/entities/evidence` 原样反馈。
3. 一次修一组结构错误；无 error 后再补 Resources、Dependencies、Cards、Guide、Checks。
4. 使用 Author Preview 检查 Player 工作流和布局。
5. 用真实 Character Data 运行 Validation Checks。

不要只反馈自然语言错误摘要，否则 AI 会丢失文件位置、实体和现场值。
