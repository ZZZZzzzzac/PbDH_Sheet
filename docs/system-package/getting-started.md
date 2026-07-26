# 快速开始

## 1. 复制最小模板

复制仓库根目录的 [`templates/system-package-minimal/`](../../templates/system-package-minimal/)，改成新的 `kebab-case` 目录名。不要从完整发布包或 kitchen-sink fixture 起步。

模板包含：

```text
system-package-minimal/
├─ manifest.json
├─ pages.json
├─ modules.json
├─ layouts/
│  ├─ main.html
│  └─ main.css
└─ assets/
```

## 2. 修改身份

在 `manifest.json` 修改 `ID`、`名称`、`版本`，保留当前 `schemaVersion: "0.2.0"`。`ID` 一旦被 Character Data 使用就应保持稳定。

## 3. 建立页面与字段

- `pages.json` 声明页面和 HTML/CSS 文件。
- `modules.json` 声明角色字段。
- HTML 用 `<pb-module id="模块ID"></pb-module>` 放置模块。
- 每个被页面引用的模块 ID 都必须存在并保持唯一。

字段类型和数据形状见[模块与角色数据](contract/modules-character-data.md)，布局允许项见[页面、布局与皮肤](contract/pages-layout-skins.md)。

## 4. 加入可选能力

只在需要时增加：

- `resources/*.json` 与 manifest 中的 `resourceLibraries`
- `dependencies.json`
- `guides/*.json`
- `checks/*.js`
- `skins/**`
- `adapters/**`

入口字段与文件发现规则见[Package 与资产](contract/package-and-assets.md)。

## 5. 预览和验证

安装依赖后可先运行无需 UI 的 Validator：

```text
npm run validate:system-package -- path/to/package
npm run validate:system-package -- path/to/package.zip -- --json
```

成功返回退出码 0；包诊断失败返回 1；命令参数或读取失败返回 2。目录和 zip 都复用应用的 VFS、Loader 与 Validator。

随后运行 `npm run dev`，打开终端给出的本地地址。在顶部工具栏的“系统包”菜单选择“预览”，选择包目录或 zip；导入时 Validator 自动运行。先处理 `fatal` 和 `error`，再检查 `warning`。浏览所有页面，操作每种字段，保存并重新加载 Character Data，最后检查 A4 打印预览。

具体闭环见[制作工作流](authoring-workflow.md)。
