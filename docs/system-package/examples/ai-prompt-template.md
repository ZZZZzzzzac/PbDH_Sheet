# AI 协作提示词模板

将方括号内容替换为实际材料，并把本目录 Reference 提供给 AI。

```text
你正在为 PbDH Sheet Framework schemaVersion 0.1.0 制作 System Package。

系统名称：[名称]
系统包 ID：[稳定 kebab-case ID]
版本：[版本]
规则材料：[粘贴或列出]
需要的 Pages：[页面名称与用途]
需要收集的 Character Data：[字段清单]
Resource Libraries：[资源类型、现有数据]
Cards：[哪些 Library 作为 Cards、文字/图片字段]
Dependency 需求：[选择资源后要填什么、显示什么、筛选什么]
Guide 步骤：[线性说明]
Validation 规则：[只读报告要求]

严格要求：
- 使用中文框架键名和当前八种 Sheet Module。
- 使用 HTML Layout Template，不使用 Flow Layout、selectionText 或自定义表单控件。
- 所有 ID 唯一、路径安全相对、引用存在。
- Dependency 只使用当前声明式 union，单轮执行，不生成任意脚本写状态。
- Guide 不读取或修改 Character Data。
- Validation Script 只读并返回 issue array。
- 普通 Sheet Value/Resource Value 不擅自改成严格游戏数值类型。
- 不自定义、关闭或降级 Validator 规则，不生成 suggestion。

按以下顺序输出：
1. 文件树。
2. manifest.json。
3. Resource/Asset 文件。
4. modules.json。
5. pages.json、HTML、CSS 和可选 Shell。
6. dependencies.json。
7. Guide。
8. Validation Checks。
9. 引用与 ID 自检清单。
```

协作循环：先让 AI 生成最小可导入骨架，导入 Validator；把完整 `code/location/entities/evidence` 原样反馈给 AI；一次只修一组结构错误；无 error 后进入 Author Preview 检查视觉和 Player 工作流；最后用真实 Character Data 运行 Validation Checks。不要只粘贴自然语言错误摘要，否则会丢失文件和实体关系。
