# ADR-0012: Sheet Renderer Owns Flow Layout

状态：Superseded by [ADR-0014](0014-html-layout-template-primary-layout.md)
日期：2026-07-07

## 背景

Flow Layout 已经是 System Package 的第一版布局模型。当前实现和架构都把页面、分区、模块排列放在 Sheet Renderer 中：Renderer 读取 Flow Layout，找到 Sheet Module，再交给 Module Registry 渲染具体模块。

曾考虑把布局抽成单独的 Layout Renderer 或 Layout Module，用来帮助 Author 将定义好的 Sheet Modules 放到页面上。但第一版只有 Flow Layout 一个布局模型，Overlay Layout 已明确列为 future plan。此时拆出独立布局模块会形成一个只有一个 adapter 的假 seam，接口可能只是把布局树转交给 Sheet Renderer，深度不足。

## 决策

第一版不单独拆 Layout Renderer，也不把页面/分区布局建模为 Sheet Module。

- Sheet Renderer 直接负责 Flow Layout、页面结构渲染、分区/行/列排列和调用 Module Registry。
- Flow Layout 是 System Package 的声明式页面结构，不产生 Sheet Value。
- Sheet Modules 不知道自己位于哪个页面、分区、行或列。
- Character Data 继续按模块/字段 ID 存储，不按布局树存储。
- Dependency Engine、Validation Runner、Card Engine 和 Guide Runner 不依赖布局树来解释数据。
- 当出现第二个实际布局 adapter（如 Overlay Layout）或 Sheet Renderer 的接口开始变浅时，再重新评估是否抽出独立布局模块。

## 理由

- 第一版只有 Flow Layout，一个 adapter 还不是稳定 seam。
- 保持 Sheet Renderer 拥有布局能减少跨模块跳转，提升当前实现的局部性。
- 布局不是玩家可填写的 Sheet Module；把它放进 Module Registry 会混淆数据模块和页面结构。
- 现在先守住“布局只影响位置和尺寸”的规则，未来加 Overlay Layout 时仍不会影响 Character Data、依赖规则或检查脚本。

## 代价

- Sheet Renderer 会同时承担页面结构和模块调用，文件可能变大。
- Flow Layout 的校验、响应式规则和打印规则需要在 Renderer 附近保持清晰测试。
- 未来若加入 Overlay Layout，可能需要从 Sheet Renderer 中迁出一部分布局实现。

## 后续信号

出现以下信号时，重新评估是否抽出独立布局模块：

- Overlay Layout 或其他布局模型进入实际实现。
- Sheet Renderer 中出现多个互斥布局 adapter。
- 布局测试需要绕过模块渲染才能稳定表达。
- Sheet Renderer 的公开接口开始暴露过多布局细节，调用方需要理解行列、坐标、打印规则等实现细节。
