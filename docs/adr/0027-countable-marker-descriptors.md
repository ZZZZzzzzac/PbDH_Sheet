# ADR-0027: Countable Marker Descriptors

状态：Accepted
日期：2026-07-23

## 背景

Marker Presentation 原先把当前值与剩余值写成 Unicode 字素字符串，无法复用 System Package 图片。继续把字段扩成 string/object union 会保留两套长期解析路径；直接把图片路径当字符串又无法区分文字与 Asset 引用。

## 决策

System Package schemaVersion 升至 `0.2.0`。`当前值标记`与`剩余值标记`统一使用以`类型`区分的 Marker Descriptor：文字保存单一可见 Unicode 字素，图片保存来源内`assets/**`相对路径；两侧可以混用。旧字符串形态不兼容迁移。图片复用 ADR-0019 的发现、校验、缓存与 URL 解析管线。`标识字号`改为 Marker 专用的`标记尺寸`：文字用作字号，文字与图片共享同尺寸正方形标记格，使 current 变化只替换槽内内容；数值展示字号继续由 scoped CSS 控制。

## 理由

- 单一对象合同让 Author、Validator、AI 文档和 Renderer 都显式区分文字与图片，避免字符串推断和兼容分支。
- 当前所有已知 System Package 都由仓库维护，可以一次迁移；现在承担破坏性修改比长期维护旧形态成本低。
- 复用现有来源限定 Asset 管线，不引入 base64、外链或 Marker 专用缓存。
- 图片需要几何尺寸而非字体语义；`标记尺寸`能同时驱动文字和图片随拟合缩放。

## 代价

- 所有 `0.1.0` System Package 必须迁移 Marker Descriptor 与 manifest，旧字符串不会自动升级。
- Numeric Presentation 不再通过 Module 字段声明字号，需要 Author 使用 Page/Skin scoped CSS。
- 图片解码失败需要稳定视觉 fallback；打印仍忽略 Author Marker 并使用统一空方块。

## 后续信号

- Author 明确需要 Numeric Presentation 的独立语义字号字段。
- Marker 图片需要裁切、染色、动画控制或每格不同内容。
- 外部 System Package 生态形成后需要正式的跨 schemaVersion 迁移器。
