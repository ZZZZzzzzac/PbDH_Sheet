# 常见错误：内联坏例子与修复

本页所有错误都可独立阅读，不需要下载错误 fixture。`code` 是稳定诊断分类；精确位置看 `location.file/line/column/pointer`，相关实体看 `entities`，现场值看 `evidence`。

## 1. manifest 缺失或 JSON 损坏

包根没有 `manifest.json` → `MANIFEST_MISSING`。

```text
{ "ID": "broken", "名称": "坏包", }
```

尾随逗号导致 `MANIFEST_JSON_INVALID`。修复为合法 JSON，并补齐必填字段：

```json
{
  "ID": "fixed",
  "名称": "修复包",
  "版本": "1.0.0",
  "schemaVersion": "0.1.0",
  "pages": "pages.json",
  "modules": "modules.json"
}
```

## 2. 路径不安全或文件不存在

```json
{ "pages": "../pages.json", "modules": "https://example.com/modules.json" }
```

产生 `PACKAGE_PATH_UNSAFE`。路径必须是包根内安全相对路径。合法写法：

```json
{ "pages": "config/pages.json", "modules": "config/modules.json" }
```

合法路径指向不存在文件时产生 `PACKAGE_FILE_MISSING`。

## 3. HTML 引用不存在的 Module

```html
<main><pb-module id="character-name"></pb-module></main>
```

若 `modules.json` 没有 `character-name`，产生 `MISSING_MODULE_REFERENCE`。补声明或改正 ID：

```json
[{ "ID": "character-name", "类型": "freeText", "标签": "姓名" }]
```

## 4. HTML/CSS 使用被禁止能力

```html
<button onclick="save()">保存</button>
<img src="https://example.com/avatar.png" alt="头像">
```

可能产生 `HTML_TEMPLATE_FORBIDDEN_TAG`、`HTML_TEMPLATE_FORBIDDEN_EVENT_HANDLER`、`HTML_TEMPLATE_EXTERNAL_RESOURCE`。交互必须由 Sheet Module 提供；图片改用包内路径：

```html
<img src="assets/avatar.png" alt="头像">
<pb-module id="save-note"></pb-module>
```

```css
@import url("https://example.com/theme.css");
body { color: red; }
```

`@import` 产生 `CSS_TEMPLATE_IMPORT_FORBIDDEN`，外部 URL 产生 `CSS_TEMPLATE_EXTERNAL_RESOURCE`；`body` 是不允许的全局污染。把规则写到 Page class 下。

## 5. Sheet Shell outlet 数量错误

```html
<main><p>没有 outlet</p></main>
```

或：

```html
<main><pb-page-outlet></pb-page-outlet><pb-page-outlet></pb-page-outlet></main>
```

都产生 `SHELL_PAGE_OUTLET_COUNT_INVALID`。Shell 必须恰好有一个：

```html
<main class="workspace">
  <section><pb-page-outlet></pb-page-outlet></section>
  <aside><pb-module id="card-table"></pb-module></aside>
</main>
```

## 6. Resource 引用或字段不存在

```json
{ "ID": "pick-class", "类型": "resourcePicker", "按钮文本": "选职业", "资源库": [{ "ID": "class" }] }
```

manifest 实际声明 `classes` 时产生 `MISSING_RESOURCE_LIBRARY_REFERENCE`。ID 必须完全相同。

Dependency 引用资源中不存在的字段：

```json
{
  "类型": "fillText",
  "目标模块ID": "class-name",
  "内容": { "类型": "selectedResourceField", "字段": "职业名称" }
}
```

资源只有 `名称` 时产生 `MISSING_RESOURCE_FIELD_REFERENCE`。查看 evidence 的 `referencedField/knownFields` 后改成：

```json
{
  "类型": "fillText",
  "目标模块ID": "class-name",
  "内容": { "类型": "selectedResourceField", "字段": "名称" }
}
```

## 7. Dependency source/trigger/target 不匹配

Resource Picker source 却使用 checkbox trigger 会产生 `UNSUPPORTED_DEPENDENCY_TRIGGER`：

```json
{
  "sources": [{ "类型": "resourcePicker", "模块ID": "pick-class" }],
  "触发": { "类型": "checkboxChanged", "来源模块ID": "pick-class" }
}
```

正确组合：

```json
{
  "sources": [{ "类型": "resourcePicker", "模块ID": "pick-class" }],
  "触发": { "类型": "resourceSelected", "来源模块ID": "pick-class" }
}
```

`fillText` 目标不是 freeText/longText/readOnlyDisplay，或 `fillCountable` 目标不是 countableResource，会产生 `UNSUPPORTED_DEPENDENCY_TARGET_MODULE`。

## 8. fillCountable 资源值不是完整整数

资源写成：

```json
{ "ID": "class-a", "名称": "战士", "初始生命": "6点" }
```

`fillCountable` 不会猜测或部分解析 `6点`，运行时产生 warning 并跳过。Author Data 应写：

```json
{ "ID": "class-a", "名称": "战士", "初始生命": 6 }
```

Normalizer 后得到文本 `"6"`，可完整解析。

## 9. Card Definition 字段缺失

```json
[{ "ID": "card-a", "名称": "只有名字" }]
```

若 Card Table 默认使用 `名称/描述`，产生 `CARD_DEFINITION_FIELD_MISSING`。补齐描述：

```json
[{ "ID": "card-a", "名称": "完整卡牌", "描述": "卡牌效果。" }]
```

Card Picker 的 Library 未包含在目标 Table `资源来源` 中，产生 `CARD_TABLE_LIBRARY_MISMATCH`。

## 10. Card art 图片不存在

```json
[{ "ID": "card-a", "名称": "卡牌", "描述": "效果", "卡图": "missing-art" }]
```

明确写出的无效引用产生 `MISSING_CARD_ART_ASSET_REFERENCE`。把图片放入 `assets/**` 并改成有效包内路径，或省略卡图使用文字 fallback。

## 11. Validation Script 语法或返回值错误

```js
module.exports = ({ characterData }) => {
  return [;
};
```

导入阶段产生 `VALIDATION_SCRIPT_SYNTAX_INVALID`。合法最小脚本：

```js
module.exports = () => [];
```

运行时返回对象而不是数组、抛异常或超时，会转为 framework issue。合法 issue：

```js
module.exports = () => [{
  level: "warning",
  code: "EXAMPLE_WARNING",
  path: "character.values.level",
  text: "等级需要复核。"
}];
```

修复方向始终由 Author 决定：Validator 报告事实，不猜测应该修改引用端还是定义端，也不提供 `suggestion` 字段。

## 12. Restricted Markdown 语法超出范围

以下内容不会产生链接、图片、任意颜色或嵌套颜色：

```md
[外部链接](https://example.com)
![图片](https://example.com/card.png)
:pink[未知颜色]
:red[外层 :blue[内层]]
<span style="color:#f00">inline HTML/CSS</span>
```

改成批准语法：

```md
**重要规则**
:red[警告]
:blue[***蓝色粗斜体***]

1. 第一项
2. 第二项
```

只支持段落/换行、粗体、斜体、三星号粗斜体、有序/无序列表，以及 `red/orange/yellow/green/blue/purple/gray` 七个 directive。未知、畸形或嵌套颜色安全降级为无颜色文本。不要把 Markdown 写进标签、placeholder、按钮、Guide、诊断或无障碍名称。
