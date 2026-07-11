# Package pipeline

```text
zip / directory files / directory handle
→ Package VFS（规范化路径、读取 bytes/text）
→ manifest.json Loader
→ 读取 Pages/Layouts/Modules/Resources/Dependencies/Guide/Checks/Assets
→ Normalized System Package
→ System Package Validator
→ fatal/error: diagnostics only
→ warning/info/debug: package + diagnostics
→ Runtime Store / cache / Renderer / Engines
```

VFS 来源共享相同路径安全规则。Loader 负责文件存在、JSON 解析、manifest shape 和外部文件装配；Resource Library normalizer 把 Author values 转成显示文本并推断字段 metadata；Validator 检查框架 schema、ID、引用、HTML/CSS 安全和脚本语法；Renderer/Engines 不重新解释物理文件。

Package cache 保存 normalized package 与 Assets。缓存可能被浏览器清除，不是发布或备份。Character Data 单独保存，只绑定 package ID/version，不包含完整包。

Validator 规则仅来自 Base Framework；System Package 不能声明规则例外。Validation Scripts 是 Player 数据的游戏规则检查，不参与包结构校验。
