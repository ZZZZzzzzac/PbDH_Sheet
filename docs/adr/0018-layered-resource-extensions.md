# ADR-0018: Layered Resource Extensions

状态：Accepted  
日期：2026-07-16

## 背景

System Package 的资源目前随整个包分发。Author B 若只补充资源，也必须复制并重新发布 Author A 的完整 System Package，Player 难以判断包本体与二次资源的边界。直接改写缓存包会丢失来源、妨碍包升级，并让卸载或诊断扩展变得困难。

## 决策

Resource Extension 作为独立 JSON 或 ZIP 产物安装并持久化，不改写 System Package。Extension 用 System Package ID 定位目标包，并包含一个或多个显式 Resource Library contributions；每项 contribution 用 Resource Library ID 决定向现有库贡献 Entry 或形成独立库。运行时通过 Effective Resource Catalog 原子合并整个 Extension 的有效视图并保留每条 Entry 的来源。

同 Extension ID 重导入时整包替换。跨 System Package、其他 Extension 的 Entry ID 冲突会拒绝安装；包升级导致的实际冲突会禁用 Extension 并显示诊断，但不阻止 System Package 加载。目标 Library ID 消失时，Extension 自动成为独立库。兼容性只比较 System Package ID，不比较版本。

Resource Picker 使用统一多库合同，也可由 Author 声明为 Other Resources Picker，动态接收未被普通 Picker 引用的库。Player 可以安装或卸载 Extension，但不能配置 Picker 与 Library 的链接。

补充澄清：Other Resources Picker 的动态集合只包含 Resource Extension 贡献的独立 Library。System Package 自有 Library 与命中既有目标后合并的 contribution 都不进入 Other；独立 Library 若已被普通 Resource Picker 或 Resource Composer 使用，也不再进入 Other。

Other Resources Picker 创建 Card 时，Card Table 用一个声明式 `otherResourceLibraries` 动态来源接收其当前集合，不枚举 Extension Library ID。Card Instance 仍保存实际 Library ID 与 Entry ID；动态来源只负责 Author-owned Card Presentation 和创建权限。

## 理由

- 分离包本体与二次资源，允许 Author A 和 Author B 独立发布。
- 不改写缓存包，使包升级、来源追踪、替换和卸载保持可逆。
- 显式目标 ID 与原子冲突检查避免按名称或字段形状猜测资源类型。
- Effective Resource Catalog 把合并、来源和 Picker 分配封装成可独立测试的纯领域逻辑。

## 代价

- IndexedDB、Runtime Store、Validator、Card Definition Resolver 和 Dependency 重建都必须使用有效资源视图。
- Character Data 中的资源引用可能在 Extension 更新或卸载后失效，需要明确诊断。
- Resource Picker Author 合同会直接替换现有单库字段；项目无历史兼容要求，不提供迁移层。

## 后续信号

- 需要同时管理多个非 Current System Package 的待用 Extension。
- Extension 需要贡献规则、布局、模块或脚本，而不再只是 Resource Library 与图片。
- 多个 Extension 需要声明依赖、加载顺序或覆盖优先级。
