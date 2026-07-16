# ADR-0020: Readable Resource Identities

状态：Accepted  
日期：2026-07-16

## 背景

Resource Entry ID 同时服务于 Card Definition Reference、Derived Source Snapshot、Resource Extension 冲突检测和 Author 调试。机械生成的十六进制摘要虽然稳定，但让 Author 难以直接核对资源、卡图和合并目标。直接按显示名称猜测身份又会在改名、重名和本地化时产生歧义。

## 决策

Resource Entry ID 允许中文，并优先使用可读的稳定命名空间，例如 `职业:德鲁伊`、`子职:德鲁伊:元素结社:基础` 与 `领域卡:奥术:符文护符`。ID 是身份而不是显示名称；发布后不会因文案润色自动改变。

Resource Entry 可声明 Author-only `旧ID: string|string[]`。Normalizer 将它保存为 Entry aliases；当前 ID 和全部 aliases 在同一 Resource Library 内共同唯一。Character Data 载入时，Card Definition Reference 与 Derived Source Snapshot 若命中 alias，会改写为当前 ID。Resolver 在迁移前后都可识别 alias；Effective Resource Catalog 也把 alias 纳入跨来源冲突检测。框架不按名称推断迁移。

卡图不再需要独立 Asset ID；路径继续遵循 ADR-0019。Author 可使用中文目录和文件名提高可检查性，只要路径安全、来源内唯一且引用同步。

## 理由

- 可读 ID 让 Author、AI 和错误报告直接定位资源。
- 显式旧 ID 同时保留稳定引用和可控迁移，不引入名称猜测。
- 同一冲突命名空间防止 Extension 占用旧引用后产生解析歧义。
- ID 与卡图路径解耦，资源身份保持稳定时仍可独立整理文件。

## 代价

- Author 必须为重名资源选择稳定限定符。
- 已发布 ID 的迁移需要保留旧别名，Resource JSON 会增加一项隐藏元数据。
- 中文路径对部分外部工具的编码处理提出要求；Loader 仍以规范化 UTF-8 相对路径为准。
