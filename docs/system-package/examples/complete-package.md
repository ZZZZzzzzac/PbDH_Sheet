# 完整 System Package：全部能力内联示例

本页给出一套自包含的 `schemaVersion: 0.1.0` 示例。它刻意展示所有可选字段和典型组合；真实包应删除不用的声明，而不是保留空功能。

## 文件树

```text
adventure-sheet/
├─ manifest.json
├─ pages.json
├─ modules.json
├─ dependencies.json
├─ resources/
│  ├─ classes.json
│  └─ cards.json
├─ layouts/
│  ├─ shell.html
│  ├─ shell.css
│  ├─ main.html
│  ├─ main.css
│  └─ secret.html
├─ guides/
│  └─ creation.json
├─ checks/
│  └─ character-rules.js
└─ assets/
   ├─ logo.svg
   └─ card-a.svg
```

## 1. manifest.json

```json
{
  "ID": "adventure-sheet",
  "名称": "冒险人物卡",
  "版本": "1.2.0",
  "schemaVersion": "0.1.0",
  "pages": "pages.json",
  "modules": "modules.json",
  "shell": {
    "html": "layouts/shell.html",
    "css": "layouts/shell.css"
  },
  "dependencies": "dependencies.json",
  "characterCreationGuide": "guides/creation.json",
  "resourceLibraries": [
    { "ID": "classes", "名称": "职业", "路径": "resources/classes.json" },
    { "ID": "cards", "名称": "能力卡", "路径": "resources/cards.json" }
  ],
  "validationChecks": [
    { "ID": "character-rules", "脚本": "checks/character-rules.js" }
  ],
  "assets": [
    { "ID": "logo", "路径": "assets/logo.svg", "类型": "image/svg+xml" },
    { "ID": "card-a-art", "路径": "assets/card-a.svg" }
  ]
}
```

可选字段是 `shell`、`dependencies`、`characterCreationGuide`、`resourceLibraries`、`validationChecks`、`assets`。`shell.css` 与 Asset `类型` 也可省略；Asset MIME 会从扩展名推断。

## 2. pages.json

```json
[
  {
    "ID": "main",
    "名称": "人物卡",
    "默认隐藏": false,
    "打印": true,
    "layout": {
      "类型": "htmlTemplate",
      "html": "layouts/main.html",
      "css": "layouts/main.css"
    }
  },
  {
    "ID": "secret",
    "名称": "隐藏专页",
    "默认隐藏": true,
    "打印": false,
    "layout": {
      "类型": "htmlTemplate",
      "html": "layouts/secret.html"
    }
  }
]
```

- `默认隐藏` 省略时为 `false`；Dependency 可在运行时改变可见性。
- `打印` 省略时跟随 runtime visibility；显式值覆盖它。
- `layout.css` 可省略。
- Page 顺序就是导航与输出顺序。

## 3. Sheet Shell

### layouts/shell.html

```html
<main class="workspace">
  <section class="sheet-pane" aria-label="当前人物卡页面">
    <pb-page-outlet></pb-page-outlet>
  </section>
  <aside class="card-pane" aria-label="持久卡牌桌面">
    <pb-module id="pick-card"></pb-module>
    <pb-module id="card-table"></pb-module>
  </aside>
</main>
```

Shell 必须恰好有一个 `pb-page-outlet`。Shell 中的 Module 在切换 Current Page 时保持挂载。

### layouts/shell.css

```css
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 1fr);
  gap: 1rem;
}

.sheet-pane,
.card-pane {
  min-width: 0;
}

@media (max-width: 800px) {
  .workspace { grid-template-columns: 1fr; }
}

@media print {
  .workspace { grid-template-columns: 1fr; }
}
```

## 4. 九种 Sheet Module：modules.json

```json
[
  {
    "ID": "name",
    "类型": "freeText",
    "标签": "角色名",
    "默认值": "***无名冒险者***",
    "隐藏标签": false,
    "占位文本": "请输入角色名",
    "默认隐藏": false
  },
  {
    "ID": "biography",
    "类型": "longText",
    "标签": "角色背景",
    "默认值": "",
    "行数": 6,
    "隐藏标签": true,
    "占位文本": "记录角色的经历与动机",
    "默认隐藏": false
  },
  {
    "ID": "creation-options",
    "类型": "checkboxResource",
    "标签": "车卡选项",
    "选项": [
      { "ID": "show-secret", "标签": "显示隐藏专页", "默认选中": false },
      { "ID": "veteran", "标签": "老兵角色", "默认选中": true }
    ],
    "默认隐藏": false
  },
  {
    "ID": "hp",
    "类型": "countableResource",
    "标签": "生命",
    "最小值": 0,
    "最大值": 6,
    "默认值": 6,
    "步长": 1,
    "最大值可改": true,
    "显示方式": "标记",
    "当前值标记": "❤️",
    "剩余值标记": "🖤",
    "默认隐藏": false
  },
  {
    "ID": "class-summary",
    "类型": "readOnlyDisplay",
    "标签": "职业摘要",
    "内容": "尚未选择职业",
    "资源ID": "logo",
    "替代文本": "系统标志",
    "默认隐藏": false
  },
  {
    "ID": "portrait",
    "类型": "imageField",
    "标签": "角色头像",
    "替代文本": "玩家上传的角色头像",
    "默认隐藏": false
  },
  {
    "ID": "pick-class",
    "类型": "resourcePicker",
    "按钮文本": "选择职业",
    "资源库ID": "classes",
    "字段模板": [
      {
        "键": "名称",
        "标签": "职业名",
        "默认显示": true,
        "可筛选": false,
        "可排序": true,
        "可搜索": true,
        "列宽": "normal"
      },
      {
        "键": "流派",
        "标签": "流派",
        "默认显示": true,
        "可筛选": true,
        "可排序": true,
        "可搜索": true,
        "列宽": "compact"
      },
      {
        "键": "描述",
        "默认显示": true,
        "可筛选": false,
        "可排序": false,
        "可搜索": true,
        "列宽": "fill"
      }
    ],
    "多选": false,
    "默认查询": {
      "filters": { "流派": ["守护", "奥秘"] },
      "sort": { "field": "名称", "direction": "asc" }
    },
    "默认隐藏": false
  },
  {
    "ID": "pick-card",
    "类型": "resourcePicker",
    "按钮文本": "添加能力卡",
    "资源库ID": "cards",
    "多选": true,
    "创建卡牌": {
      "卡牌桌面模块ID": "card-table",
      "默认状态": "当前"
    }
  },
  {
    "ID": "compose-card",
    "类型": "resourceComposer",
    "按钮文本": "组合能力卡",
    "来源槽位": [
      { "ID": "name", "标签": "名称来源", "资源库ID": "cards" },
      { "ID": "description", "标签": "描述来源", "资源库ID": "cards" }
    ],
    "输出字段": [
      { "字段": "名称", "来源槽位ID": "name", "来源字段": "名称" },
      { "字段": "描述", "来源槽位ID": "description", "来源字段": "描述" }
    ],
    "创建卡牌": { "卡牌桌面模块ID": "card-table", "默认状态": "当前" }
  },
  {
    "ID": "card-table",
    "类型": "cardTable",
    "标签": "能力卡桌面",
    "资源来源": [
      { "类型": "resourceLibrary", "ID": "cards" },
      {
        "类型": "resourceComposer",
        "ID": "compose-card",
        "卡牌展示": { "名称模板": "{{名称}}", "描述模板": "{{描述}}", "标签字段": [] }
      }
    ],
    "状态选项": ["当前", "宝库", "已消耗"],
    "状态背景色": {
      "宝库": "#d8e2f3",
      "已消耗": "#ead7d7"
    },
    "显示方式": "text",
    "卡图字段": "卡图",
    "显示方式字段": "展示",
    "背面卡牌ID字段": "背面卡牌ID",
    "默认隐藏": false
  }
]
```

### Module 可选字段速查

| 类型 | 可选字段 |
| --- | --- |
| 所有 Module | `默认隐藏`，省略为 `false` |
| freeText | `默认值`、`隐藏标签`、`占位文本` |
| longText | `默认值`、`行数`（2–20）、`隐藏标签`、`占位文本` |
| checkboxResource option | `默认选中` |
| countableResource | `最小值`、`最大值`、`默认值`、`步长`、`最大值可改`、`显示方式`、`当前值标记`、`剩余值标记`；标记展示要求两个不同的单一 Unicode 字素且最小值非负 |
| readOnlyDisplay | `内容`、`资源ID`、`替代文本`；内容/资源至少一个 |
| imageField | `替代文本` |
| resourcePicker | `字段模板`、`多选`、`默认查询`、`创建卡牌` |
| resourceComposer | `来源槽位`、`输出字段`、`创建卡牌` |
| cardTable | `状态选项`、`状态背景色`、`显示方式`、五个字段名配置（含 `背面卡牌ID字段`）；通用指示物不需要 Author 配置 |

列宽的全部值是 `compact | normal | wide | fill`。sort direction 是 `asc | desc`。Resource Entry 的 `ID` 默认不在 Picker 显示/筛选/排序/搜索；需要时在 `字段模板` 中显式配置。

## 5. Resource Libraries

### resources/classes.json

```json
[
  {
    "ID": "class-guardian",
    "名称": "守卫",
    "流派": "守护",
    "初始生命": 8,
    "描述": "保护队友并承受伤害。"
  },
  {
    "ID": "class-mage",
    "名称": "秘法师",
    "流派": "奥秘",
    "初始生命": 5,
    "描述": "研究并施展奥秘。"
  }
]
```

除 `ID` 外允许任意 JSON value。Runtime 会把 number/boolean 转成文本，把 array/object JSON-stringify；因此 `fillCountable` 的 `初始生命` 最终是可解析的完整整数文本。

### resources/cards.json

```json
[
  {
    "ID": "card-a",
    "名称": "坚定防守",
    "描述": ":blue[**获得防御优势。**]",
    "卡图": "card-a-art",
    "展示": "image",
    "流派": ":green[守护]",
    "背面卡牌ID": "card-a-back"
  },
  {
    "ID": "card-a-back",
    "名称": "坚定防守（背面）",
    "描述": "本回合已经使用。",
    "卡图": "",
    "展示": "text",
    "流派": "守护"
  },
  {
    "ID": "card-b",
    "名称": "奥秘飞弹",
    "描述": "造成魔法伤害。\n\n- 无视普通护甲\n- 消耗 1 希望",
    "卡图": "",
    "展示": "text",
    "流派": "奥秘"
  }
]
```

被 Card Table 使用的每个条目都必须有非空的配置后 name/description。卡图可省略；空值使用文字 fallback。

上述 Card name/description/tag 与 freeText/longText value 使用同一 Restricted Markdown。颜色可与强调组合，但不能嵌套；原始字符串保持在 Resource Value/Character Data 中。

## 6. Page layouts

### layouts/main.html

```html
<main class="character-page">
  <header>
    <img src="assets/logo.svg" alt="冒险人物卡标志">
    <h1>人物卡</h1>
  </header>
  <section class="identity" aria-label="身份">
    <pb-module id="name"></pb-module>
    <pb-module id="portrait"></pb-module>
    <pb-module id="pick-class"></pb-module>
    <pb-module id="class-summary"></pb-module>
  </section>
  <section aria-label="资源">
    <pb-module id="hp"></pb-module>
    <pb-module id="creation-options"></pb-module>
  </section>
  <section aria-label="背景">
    <pb-module id="biography"></pb-module>
  </section>
</main>
```

### layouts/main.css

```css
.character-page { display: grid; gap: 1rem; padding: 1rem; }
.identity { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
@media (max-width: 700px) { .identity { grid-template-columns: 1fr; } }
```

### layouts/secret.html

```html
<main class="secret-page">
  <h1>隐藏专页</h1>
  <p>由 Checkbox Dependency 控制 Page visibility。</p>
</main>
```

该 Page 没有 CSS 文件，展示 `layout.css` 的省略用法。

## 7. dependencies.json

下面包含两种 source/trigger、全部 condition 和四种 action。Rule 的 `sources`、`targets`、`动作` 都至少一项。

```json
[
  {
    "ID": "fill-selected-class",
    "sources": [{ "类型": "resourcePicker", "模块ID": "pick-class" }],
    "targets": [
      { "类型": "module", "模块ID": "class-summary" },
      { "类型": "module", "模块ID": "hp" },
      { "类型": "module", "模块ID": "pick-card" }
    ],
    "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" },
    "条件": { "类型": "always" },
    "动作": [
      {
        "类型": "fillText",
        "目标模块ID": "class-summary",
        "内容": { "类型": "selectedResourceField", "字段": "描述" }
      },
      {
        "类型": "fillCountable",
        "目标模块ID": "hp",
        "当前值": { "类型": "selectedResourceField", "字段": "初始生命" },
        "最大值": { "类型": "selectedResourceField", "字段": "初始生命" }
      },
      {
        "类型": "setResourceDefaultFilter",
        "目标模块ID": "pick-card",
        "字段": "流派",
        "值": ["守护"]
      }
    ]
  },
  {
    "ID": "show-secret",
    "sources": [{ "类型": "checkboxResource", "模块ID": "creation-options" }],
    "targets": [{ "类型": "page", "页面ID": "secret" }],
    "触发": { "类型": "checkboxChanged", "来源模块ID": "creation-options" },
    "条件": { "类型": "checkboxOptionChecked", "选项ID": "show-secret" },
    "动作": [{ "类型": "setVisibility", "目标类型": "page", "目标ID": "secret", "显示": true }]
  },
  {
    "ID": "hide-secret",
    "sources": [{ "类型": "checkboxResource", "模块ID": "creation-options" }],
    "targets": [{ "类型": "page", "页面ID": "secret" }],
    "触发": { "类型": "checkboxChanged", "来源模块ID": "creation-options" },
    "条件": { "类型": "checkboxOptionUnchecked", "选项ID": "show-secret" },
    "动作": [{ "类型": "setVisibility", "目标类型": "page", "目标ID": "secret", "显示": false }]
  },
  {
    "ID": "guardian-note",
    "sources": [{ "类型": "resourcePicker", "模块ID": "pick-class" }],
    "targets": [{ "类型": "module", "模块ID": "biography" }],
    "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" },
    "条件": { "类型": "selectedResourceFieldEquals", "字段": "流派", "值": "守护" },
    "动作": [{ "类型": "fillText", "目标模块ID": "biography", "内容": "你为何选择守护他人？" }]
  },
  {
    "ID": "non-guardian-note",
    "sources": [{ "类型": "resourcePicker", "模块ID": "pick-class" }],
    "targets": [{ "类型": "module", "模块ID": "biography" }],
    "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" },
    "条件": { "类型": "selectedResourceFieldNotEquals", "字段": "流派", "值": "守护" },
    "动作": [{ "类型": "fillText", "目标模块ID": "biography", "内容": "你为何踏上冒险？" }]
  },
  {
    "ID": "known-style-note",
    "sources": [{ "类型": "resourcePicker", "模块ID": "pick-class" }],
    "targets": [{ "类型": "module", "模块ID": "class-summary" }],
    "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" },
    "条件": { "类型": "selectedResourceFieldIn", "字段": "流派", "值": ["守护", "奥秘"] },
    "动作": [{ "类型": "setVisibility", "目标类型": "module", "目标ID": "class-summary", "显示": true }]
  }
]
```

补充形态：

- `fillText.内容` 可是常量字符串、`selectedResourceField`，或用 `{{字段}}` 组合多个字段的 `selectedResourceTemplate`；多选时可加 `选择索引` 或 `分隔符`。`写入方式`省略时替换，设为`追加`时保留 freeText/longText 旧值，并可用`追加分隔符`控制新旧内容间隔。
- `fillCountable.当前值/最大值` 可是整数常量或 `selectedResourceField`；`最大值: null` 移除动态上限；两项至少声明一个。
- `setVisibility.目标类型` 可为 `page | module`。
- `checkboxOptionChecked/Unchecked` 只用于 checkboxChanged。
- Resource field equals/notEquals/in 只用于 resourceSelected。

## 8. guides/creation.json

```json
{
  "步骤": [
    {
      "ID": "welcome",
      "标题": "开始创建角色",
      "说明": "先了解人物卡结构。"
    },
    {
      "ID": "choose-class",
      "标题": "选择职业",
      "说明": "打开职业资源库并选择一个职业。",
      "目标": { "类型": "module", "模块ID": "pick-class" }
    },
    {
      "ID": "review-page",
      "标题": "检查人物卡",
      "说明": "检查已填写的核心资料。",
      "目标": { "类型": "page", "页面ID": "main" }
    }
  ]
}
```

`目标` 可省略，或是一个 Page/Module target。Guide 不支持分支、完成条件、动作、脚本或持久进度。

## 9. checks/character-rules.js

```js
module.exports = async ({ characterData, resourceLibraries, cardState, packageMetadata }) => {
  const issues = [];
  const hp = characterData.character.values.hp;

  if (hp && typeof hp === "object" && hp.current === 0) {
    issues.push({
      level: "warning",
      code: "HP_EMPTY",
      path: "character.values.hp",
      text: "当前生命为 0，请确认角色状态。"
    });
  }

  if (!packageMetadata.id || !Array.isArray(resourceLibraries) || !cardState) {
    issues.push({ level: "info", text: "Validation input 不完整。" });
  }

  return issues;
};
```

Raw issue 的 `level` 是 `error | warning | info`，`text` 必填，`path/code` 可选。脚本可同步或 async，但只读 cloned/frozen input，不能访问 DOM、网络或 mutation API。

## 10. Assets

### assets/logo.svg

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">
  <rect width="120" height="40" rx="8" fill="#28384a"/>
  <text x="60" y="26" text-anchor="middle" fill="white">ADVENTURE</text>
</svg>
```

### assets/card-a.svg

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
  <rect width="300" height="420" rx="18" fill="#d9e4ef"/>
  <text x="150" y="210" text-anchor="middle">坚定防守</text>
</svg>
```

HTML `<img src>` 使用包内路径；readOnlyDisplay/Card art 可使用 Asset ID 或路径。不要使用外部 URL，也不要把大型图片 base64 写进资源 JSON。

## 11. 生成与自检顺序

1. manifest 与稳定 ID。
2. Resources/Assets。
3. Modules。
4. Pages/Layouts/Shell。
5. Dependencies。
6. Guide。
7. Validation Checks。
8. 运行 Validator，修复所有 fatal/error。
9. Author Preview 冒烟测试 Character Save、Picker、Cards、Guide、Checks 与输出。

本例的目标是展示接口形态，不代表推荐的游戏规则或最终视觉设计。
