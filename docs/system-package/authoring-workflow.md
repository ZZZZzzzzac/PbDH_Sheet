# System Package 制作工作流

## 推荐闭环

1. 从最小模板创建包，并给所有实体分配稳定 ID。
2. 一次只增加一个纵向能力：定义数据、放入 Layout、在 Author Preview 操作并保存。
3. 每次增量都运行 Loader/Validator，处理带文件、路径、实体和证据的诊断。
4. 用刷新后的 Character Data 验证加载、编辑、导入、导出和打印。
5. 提交前检查资产体积与路径，并跑仓库测试。

推荐命令：

```text
npm run validate:system-package -- path/to/package
npm run check:system-package-contract
npm test
npm run build
```

只有修改 Base Framework 合同本身时才运行 `npm run generate:system-package-contract`；普通 System Package 作者只需运行 Validator。

最小 GitHub Actions 检查：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm
- run: npm ci
- run: npm run validate:system-package -- path/to/package
```

需要保存机器诊断时使用 `npm run validate:system-package -- path/to/package -- --json`。退出码 1 表示包诊断失败，2 表示命令参数或文件读取失败。

## Author Preview

运行 `npm run dev` 后，在 Sheet Tool 顶部工具栏的“系统包”菜单选择“预览”。Author Preview 读取本地目录或 zip；每次选择或重新读取都会自动运行 Loader/Validator，不把未验证包加入正式内置列表。验证结果分为：

- `fatal`：包无法形成有效运行时对象，必须修复。
- `error`：合同或引用错误，不能作为可交付包。
- `warning`：可加载但可能产生错误体验。
- `info` / `debug`：说明和定位信息。

不要只看诊断文本；同时使用 `file`、JSON pointer、行列、关联实体和 evidence 定位源文件。

## 调试顺序

1. JSON 是否可解析，manifest 声明的路径是否存在。
2. ID 是否唯一，页面、模块、资源库及依赖引用是否闭合。
3. HTML 是否只使用允许的元素、属性与 `<pb-module>` / `<pb-page-outlet>`。
4. Resource 字段、模板和 Card Presentation 是否引用真实字段。
5. Dependency 的来源、触发、条件和目标类型是否匹配。
6. Guide 是否只承担展示与聚焦，不写入 Character Data。
7. Worker 脚本是否满足消息合同且不依赖 DOM、网络或宿主全局变量。

## 常见错误

- **复制旧文档字段**：从相关主题文件的自动生成部分和当前 Validator 核对，不使用旧 AI 提示词或历史示例。
- **把文件路径当资产 ID**：所有路径相对包根，使用 `/`，不得越界或使用 URL。
- **Layout 找不到模块**：`<pb-module id>` 必须对应 `modules.json` 的稳定 ID。
- **数据重置**：修改已发布模块或资源 Entry 的 ID 会让现有 Character Data 失联。
- **卡图过大**：先测文件数、展开体积和压缩体积；按实际展示尺寸缩放、去元数据、去重并优先 WebP/AVIF。
- **只测首次加载**：必须再测保存、刷新、旧数据恢复和打印。

## AI 协作

给 AI 的任务应包含包目录、目标与验收数据，并要求它：

1. 阅读本 README 和任务相关的 `contract/` 文件；
2. 把相关主题文件的手写部分和自动生成部分一起读完，而不是猜字段；
3. 从最小模板增量修改；
4. 运行 Validator、相关测试和构建；
5. 报告诊断及未覆盖风险。

不向 AI 粘贴另一份字段清单；复制合同会独立漂移。

## 交付检查

- manifest 版本与 schemaVersion 正确；所有 ID 稳定且唯一。
- 所有声明文件、资源和资产路径存在且安全。
- 每个页面可操作、可打印；Shell 与 Skin 覆盖不破坏语义。
- Character Data 往返后值、卡牌状态与 Player Images 保持。
- Validator 无 fatal/error，重要 warning 已解释。
- 没有提交源素材、生成中间物、重复导出或 base64 大对象。
