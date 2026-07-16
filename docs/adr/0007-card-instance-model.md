# ADR-0007: Card Instance Model

状态：Accepted
日期：2026-07-06

## 背景

PbDH 的卡牌系统核心不是抽牌、弃牌、费用支付或规则自动结算，而是让玩家像操作纸面卡一样展示和管理卡牌。玩家脑中执行规则，Base Framework 提供卡牌实例的基本物理操作。

## 决策

Card Engine 使用卡牌实例模型：

- Card Definition 来自 Resource Library，表示不可变卡牌定义。
- Card Instance 表示玩家拥有和操作的一张具体卡。
- 同一个 Card Definition 可以有多个 Card Instance。
- Card Instance 的具体字段是实现细节，不在此固定；关键是它能记录卡牌在桌面上的位置、层级和状态。
- 卡牌以自由桌面模型展示：玩家在一个卡牌桌面区域内自由摆放卡牌，通过坐标和层级确定位置，不强制离散容器区域。
- 卡牌可以标记 Author 定义的不同状态，但状态是卡牌实例的属性，不是物理区域隔离。
- MVP 支持创建实例、删除实例、拖拽移动、排序、状态切换。
- MVP 后扩展支持双面 Card Definition 翻面、四分之一圈旋转和多类型非负指示物。
- Card Engine 不负责数量上限、职业合法性、费用支付、抽牌、洗牌、弃牌或效果结算。
- 卡牌规则合法性由 Validation Scripts 报告，玩家决定是否修正。

## 理由

- 实例模型天然支持重复拥有同名卡。
- 自由桌面模型比离散容器更贴近纸笔桌游的自由摆放体验。
- 把规则机制留给玩家和 Validation Scripts，避免 Base Framework 变成卡牌游戏引擎。
- 扩展翻面、横置、指示物、自定义容器或更复杂卡牌状态时不需要重写核心模型。

## 代价

- Character Data 中卡牌状态比单纯 `cardId` 列表复杂。
- UI 需要提供移动端可用的按钮/菜单操作，不能只依赖拖拽。
- 翻面、横置、指示物增加了右键/触屏/键盘交互和 Character Data 兼容成本。
- Validation Scripts 需要承担规则合法性检查。

## 后续信号

出现以下信号时，扩展 Card Engine：

- 玩家需要弃牌堆、暂放区等自定义容器。
- 卡牌实例状态需要导入导出兼容迁移。

## 追加说明（2026-07-10）

初版 ADR 设想了多个离散物理区域，卡牌在区域间移动。开发过程中确定改为自由桌面模型：玩家在一个卡牌桌面区域内自由摆放卡牌，通过坐标和层级确定位置，不强制离散容器区域。卡牌仍可标记 Author 定义的状态，但状态是实例属性而非物理区域隔离。

同时，翻面、横置/竖置、指示物数字等操作不在 MVP 范围，列入后续信号。Card Instance 的具体字段从 ADR 中移除，归为实现细节。

## 追加说明（2026-07-14）

后续信号已经出现，Card Engine 扩展为支持：正面 Card Definition 通过可配置字段引用同一 Resource Library 中的背面 Card Definition；Player 通过 Card 右键菜单翻面和以 90° 步长旋转；每张 Card Instance 无需 Author 配置即可添加最多十个通用指示物，框架从固定十色 palette 分配背景色。Player 通过 36px 边缘徽章操作独立的非负计数；徽章只显示放大的数值。指示物在 0 时保留，在 0 上继续减少才移除。卡牌指示物与 Countable Resource 只共享纯计数转移，不共享 Sheet Value、Dependency Logic 或打印策略合同。

## 追加说明（2026-07-16）

当卡背只有图片、没有独立规则定义时，Card Definition 或 Composite Resource 可通过可配置 `卡背字段`（默认 `卡背`）直接引用来源内图片。直接卡背优先于背面 Definition 引用；翻面只替换渲染用卡图，不改变 Card Definition Reference。该路径让 Resource Composer 输出的角色专属复合卡也能使用通用卡背，而无需伪造可选择的背面 Resource Entry。
