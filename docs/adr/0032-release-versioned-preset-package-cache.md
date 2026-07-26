# ADR-0032: Release-versioned Preset System Package Cache

状态：Accepted
日期：2026-07-26

## 背景

Base Framework 会把当前 System Package 缓存在 IndexedDB。启动时若缓存存在，Runtime Store 原先直接恢复它，不会重新读取构建时预置目录。发布版本即使已经包含更新后的预制包，玩家仍可能继续使用旧缓存；浏览器强制刷新不会清除 IndexedDB，只有清理站点数据才会暴露新版内容，同时还会危及未导出的本地数据。

System Package manifest 的版本属于 Author 合同，不能被 Base Framework 发布版本替代。缓存也没有记录它来自构建预置、本地导入还是 Author Preview，因此不能只按 Package ID 安全覆盖。

## 决策

- 当前 System Package 缓存记录来源：`preset`、`imported` 或 `author-preview`。
- `preset` 缓存同时记录预制包 ID 与创建它的 Base Framework 发布版本。
- 构建生成的预制包目录为每个包注入当前 Base Framework 发布版本；所有预制包文件 URL 都携带该版本作为查询参数，避免 HTTP 缓存复用旧响应。
- 启动恢复时，若当前缓存明确来自同一预制包且发布版本已变化，Runtime Store 读取并激活当前构建中的预制包，再原位更新缓存。
- 发布此机制前的旧缓存没有来源元数据。只在缓存包含指向同一构建预制目录的静态 asset URL 时，把它识别为旧预制缓存并迁移；不能证明来源的缓存按本地导入处理，不自动覆盖。
- 本地 zip、目录与 Author Preview 缓存永不因 Base Framework 版本变化而自动替换。
- 更新只替换 System Package 本体和它的 assets；Character Saves、Resource Extensions、Skin 与框架偏好继续按既有键保留并在新包上重建运行状态。
- 若预制包刷新失败，继续加载已校验的旧缓存，并显示 warning；不要求玩家清理站点数据。

## 理由

- Base Framework 发布版本是构建内预制内容的可靠失效边界，不要求每次发布都把它混入 Author 的 System Package 版本语义。
- 来源元数据让自动更新仅作用于站点负责分发的内容，避免覆盖玩家或 Author 自己导入的同 ID 包。
- 查询参数同时解决 IndexedDB 更新后文件请求仍命中旧 HTTP 缓存的问题，不引入 Service Worker，也不改变 ADR-0030 的静态 Web 决策。
- 更新失败时保留旧缓存，比清空缓存或阻断启动更符合本地优先的数据安全边界。

## 代价

- 每个新的 Base Framework 发布首次启动时，当前预制包会重新读取一次，即使该包本身没有变化。
- 旧缓存迁移依赖已保存的静态 asset URL；没有静态 assets 或无法证明来源的旧预制缓存不会自动更新，需要玩家重新选择该预制包。
- 来源和发布版本成为 System Package 缓存仓储需要维护的元数据，但不进入 System Package 或 Character Data 合同。

## 后续信号

- 预制包数量或体积使每次 Base 发布后的首次刷新成本明显影响启动体验。
- 需要让预制包独立于 Base Framework 发布时，应引入独立、不可变的预制包构建版本或内容摘要。
- 若重新引入 Service Worker，必须让其缓存版本与本 ADR 的预制包缓存更新顺序共同接受端到端验收。
