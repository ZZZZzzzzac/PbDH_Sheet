# 完整包讲解

实际文件：`public/system-packages/demo-selection`。

阅读顺序：

1. `manifest.json`：观察 Shell、Pages、Modules、Libraries、Dependencies、Guide、Checks 和 Assets 的入口。
2. `pages.json`：观察多 Page、默认显隐与独立 HTML/CSS。
3. `layouts/shell.html`：观察唯一 `pb-page-outlet`。
4. `modules.json`：观察 Resource Picker、文本目标、Card Table 和字段模板。
5. `resources/*.json`：观察普通资源与 Card Definitions。
6. `dependencies.json`：观察 resourceSelected、checkboxChanged、fillText、fillCountable、visibility 和 filter。
7. `guides/character-creation.json`：观察线性 Page/Module target。
8. `checks/*.js`：观察只读规则报告。

这是接口组合示例，不代表推荐的游戏内容或视觉设计。复制后删除不用的声明，并同步删除 manifest 引用。
