# Character Creation Guide interface

Root：`{ 步骤: GuideStep[] }`，至少一项。

GuideStep：

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `ID` | string | 是 | 非空、Guide 内唯一 |
| `标题` | string | 是 | 非空纯文本 |
| `说明` | string | 是 | 非空纯文本 |
| `目标` | GuideTarget | 否 | 至多一个 |

GuideTarget：`{类型:"page", 页面ID:string}` 或 `{类型:"module", 模块ID:string}`，引用必须存在。

Guide Session 只保存当前打开会话的 zero-based step index。Spotlight 通过 Renderer 的稳定 target markers 获取几何和可见性。目标不可见时不覆盖 Dependency visibility。

禁止字段/语义：完成条件、分支、自动推进、action requests、脚本、Character Data 读取或持久进度。旧 ADR-0013 已由 ADR-0015 取代。
