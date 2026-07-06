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
- Card Instance 至少包含 `instanceId`、`definitionId`、`containerId`、`order`、`face`、`orientation`、`tokenCount`。
- MVP 支持创建实例、删除实例、移动容器、排序、查看详情、翻面、横置/竖置、指示物数字加减或设置。
- 容器只表示摆放位置，如 configured、vault、library view，不表达抽牌或弃牌规则。
- Card Engine 不负责数量上限、职业合法性、费用支付、抽牌、洗牌、弃牌或效果结算。
- 卡牌规则合法性由 Validation Scripts 报告，玩家决定是否修正。

## 理由

- 实例模型天然支持重复拥有同名卡。
- 翻面、横置和指示物是纸笔桌游卡牌操作的基础能力。
- 把规则机制留给玩家和 Validation Scripts，避免 Base Framework 变成卡牌游戏引擎。
- 未来扩展自定义容器、多种指示物和更复杂卡牌状态时不需要重写核心模型。

## 代价

- Character Data 中卡牌状态比单纯 `cardId` 列表复杂。
- UI 需要提供移动端可用的按钮/菜单操作，不能只依赖拖拽。
- Validation Scripts 需要承担规则合法性检查。

## 后续信号

出现以下信号时，扩展 Card Engine：

- 规则包需要多种指示物类型。
- 玩家需要弃牌堆、暂放区等自定义容器。
- 多个 System Package 需要卡牌正反面独立图片。
- 卡牌实例状态需要导入导出兼容迁移。
