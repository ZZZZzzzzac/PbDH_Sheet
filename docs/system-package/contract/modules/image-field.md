# `imageField` Module

`imageField` 让玩家选择并移除角色图片，例如头像或徽记。它不同于 `readOnlyDisplay` 的包内静态资产：图片二进制属于角色数据，而不是系统包。

模块值保存 Player Image 引用，实际 data URL 位于 Character Data 的 `playerImages`。包作者应提供有意义的标签和替代文本，并在 Layout 中为不同图片比例设置稳定容器。System Package 本身不得用 Character Data 式 base64 存放批量素材。

---

<!-- BEGIN GENERATED CONTRACT -->

## 精确合同（自动生成）

> 以下部分由运行时 Zod Schema、约束注册表和真实安全常量生成。不要手工编辑标记之间的内容。

合同版本：`0.2.0`。未列入 `required` 的字段均可省略；`additionalProperties: false` 表示未知字段不属于受支持合同。Resource Entry 等明确 catch-all 的对象除外。跨文件引用和运行时行为以同节“语义约束”为准。

### imageField Module

imageField Sheet Module 的作者源文件形状。

语义约束：

- ID 是 Character Data 的持久键；发布后不可随显示名称随意改变。
- 默认值只在没有持久值时生效；未知字段不属于受支持合同。

| 路径 | 必填 | 类型 | 约束 / 默认值 |
| --- | --- | --- | --- |
| $ | 是 | object | imageField Sheet Module 的作者源文件形状。 |
| ID | 是 | string | 最短 1 |
| 默认隐藏 | 否 | boolean | 默认 false |
| 类型 | 是 | "imageField" | — |
| 标签 | 是 | string | 最短 1 |
| 替代文本 | 否 | string | — |

### 自动验证例子

以下 JSON 在生成前通过对应 Zod Schema；跨实体引用仍由完整包 Validator 检查。

#### imageField 最小例子

玩家选择的图片保存在 Character Data playerImages。

```json
{
  "ID": "portrait",
  "类型": "imageField",
  "标签": "头像"
}
```

<!-- END GENERATED CONTRACT -->
