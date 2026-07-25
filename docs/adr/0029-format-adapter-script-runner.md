# ADR-0029: Format Adapter Script Runner

状态：Accepted
日期：2026-07-25

## 背景

Character Format Adapter 与 Resource Format Adapter 最初使用声明式字段、集合、分组、Card 匹配和导出映射。真实 ZZZ、dhSheet 与 DHCB fixtures 很快需要多字段组合、动态集合选择、嵌套记录匹配、类型路由、图片绑定、复合 Entry 分组和非对称导出。继续扩展映射操作会让 Base Framework 维护一套接近通用程序语言的浅层接口；格式知识也会分散在 Base 转换引擎与 System Package Author Data 两处。

项目已经通过 ADR-0005 建立受限 Package Script 的 Worker 执行、超时、输入副本、异常处理和语法验证模型。Format Adapter 可以复用同一执行 seam，同时让 Base 继续拥有文件安全和原生数据合同。

## 决策

Format Adapter 保留声明式 Adapter identity、Player-facing 名称、Carrier 与 Detection Rules，但语义转换改由 System Package Author 提供的 CommonJS 脚本完成：

- Resource Format Adapter 声明一个 Import Script。
- Character Format Adapter 声明一个 Import Script，并可选声明一个 Export Script。
- Base Framework 安全读取 JSON、embedded JSON 与 ZIP members；脚本不读取文件系统或解析 HTML。
- 每次转换脚本在独立 Web Worker 中执行，使用固定超时。
- 输入是 structured clone 后的只读副本，只包含该转换需要的外部文档、文件元数据、允许的资产数据、Character Data、Effective Resource Catalog 与 Current System Package metadata。
- 不提供 DOM、存储、下载、安装、Character Save mutation 或 Base Framework mutation API。
- 脚本返回规范化转换结果和 diagnostics；Base 严格验证 shape、Module/Card/Resource references 与图片，再进入既有原生 Character Data 或 Resource Extension pipeline。
- Script 成功不等于导入成功。原生 schema、冲突、确认、持久化和 derived-state rebuild 仍由 Base Framework 拥有。
- Character import 不安装 Resource Extension；Resource import 不修改 Character Data。
- Adapter Scripts 不参与实时 Dependency Logic、Guide、Validation Check、渲染或普通 Player 编辑。
- 旧声明式格式转换 DSL 在合并前直接移除，不建立双轨兼容层。

所有脚本使用 `module.exports = async (input) => result` 或同步等价形式，不允许 import 外部依赖。

- Character Import result：Sheet Value patches、Card Resource references、Player Image candidates、建议存档名、跳过计数和 diagnostics。
- Character Export result：外部 JSON document、导出/跳过计数和 diagnostics。
- Resource Import result：原生 Resource Extension document、保留资产映射、转换计数和 diagnostics。

## 理由

- Format Adapter seam 已有 ZZZ、dhSheet、DHCB 等多个真实 Adapter，脚本接口具有实际而非假设的复用价值。
- Base 的接口保持小而深：Carrier 安全、隔离执行、结果验证和原生 pipeline 隐藏在一个执行 seam 后。
- 格式特有的条件、遍历和兼容逻辑集中在对应 Adapter Script，获得更好的 locality。
- Author 与 AI 使用普通 JavaScript 表达复杂外部格式，不需要学习持续扩张的自制 DSL。
- 在功能首次合并前删除旧 DSL，不承担迁移兼容成本。

## 代价

- System Package Validator 无法静态证明所有来源字段路径与业务分支，只能验证脚本文件、语法和声明引用；真实 fixtures 与脚本接口测试承担行为验证。
- Worker 不是绝对安全的恶意代码沙箱；与 ADR-0005 相同，陌生来源 System Package 的更强隔离仍可能需要 QuickJS/WASM/SES。
- Author Preview 必须清楚报告脚本异常、超时和无效输出。
- 简单格式也需要维护脚本文件，而不再只写字段表。

## 拒绝的替代方案

### 继续扩展声明式转换操作

拒绝。动态集合选择已经要求遍历、条件、唯一性和嵌套投影；后续 fallback、排序、版本分支和复杂分组会把 Base 的 Author-facing interface 扩展成难以验证和维护的小型程序语言。

### 同时保留声明式 DSL 与脚本

拒绝。首次发布前没有兼容负担；双轨会增加 Loader、Validator、文档、测试和运行时分支，并让 Author 难以判断应使用哪种模型。

### 在主线程直接执行脚本

拒绝。转换可能处理大型卡包或错误循环，必须可超时终止，且不能阻塞 Sheet Tool UI。

## 后续信号

- 出现陌生来源 System Package 的安全要求时，升级 Package Script sandbox。
- Adapter Script interface 需要频繁增加 Base helper 时，优先让脚本返回更接近原生合同的数据，而不是重新建立转换 DSL。
- 多个脚本复制稳定且格式无关的代码时，可在版本化 Script input 中增加少量纯数据 helper contract，但不能传递可变框架能力。
