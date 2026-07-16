# Resource Extension interfaces

Resource Extension 独立于 System Package 保存，只贡献 Resource Library Entries，不修改包本体。

## JSON 合同

```json
{
  "ID": "daggerheart-core.the-void",
  "名称": "The Void 虚空资源扩展",
  "版本": "2026.07.10",
  "目标系统包ID": "daggerheart-core",
  "resourceLibraries": [
    {
      "ID": "classes",
      "名称": "职业",
      "entries": [
        { "ID": "void-class-example", "名称": "示例职业", "闪避值": "10", "生命点": "6" }
      ]
    },
    {
      "ID": "new-library",
      "名称": "新增资源类型",
      "entries": [
        { "ID": "new-entry-example", "名称": "示例条目" }
      ]
    }
  ]
}
```

- `名称`、`版本`、`目标系统包ID` 与非空 `resourceLibraries` 必填。
- `目标系统包ID` 必须等于 Current System Package ID；版本只展示，不参与兼容判断。
- contribution 的 `ID` 命中有效 Library 时合并；未知 ID 形成独立 Library。System Package 的 Library 名称优先。
- Extension、contribution 或 Entry 缺少 `ID` 时，导入器生成不冲突 ID，并提供规范化产物下载。显式 ID 原样保留。
- 同一目标 Library 内的 Entry ID 与 System Package、其他 Extension 或候选内部冲突时，整包拒绝。不同 Library 可复用 Entry ID。
- 同 Extension ID 重导入进入整包替换确认，不追加旧 Entries。
- JSON 是纯文本格式；不得使用 `data:image/...` 或引用无法随 JSON 携带的 `assets/**` 图片。

## ZIP 合同

```text
extension.zip
├─ extension.json
└─ assets/
   └─ cards/example.webp
```

`extension.json` 使用同一合同。图片只允许 PNG、JPEG、WebP、GIF、AVIF 与安全 SVG。字体、音频、视频和其他文件拒绝。Entry 直接写来源内路径，例如 `"卡图": "assets/cards/example.webp"`。缺失图片是 error，未使用图片是 warning；不同 Extension 可安全复用相同相对路径。

ZIP 使用与 System Package 相同的压缩体积、展开体积、文件数、压缩比和路径安全限制，见 [Assets and paths](assets-and-paths.md)。

## 有效目录与生命周期

Resource Manager 从 System Package 菜单打开。首次安装立即提交；替换与卸载必须确认。Extension 与图片独立存入 IndexedDB，刷新或同 ID System Package 更新后重新计算 Effective Resource Catalog。实际 Entry 冲突会禁用 Extension 并显示诊断，但不阻止 System Package；Character Data 不被自动修改，失效 Card/Snapshot 引用显示 warning。

固定完整示例见 `public/resource-extensions/the-void-20260710.json`。它把原始混合数组在制作阶段显式分成 6 个 contributions；Runtime 不按 `类型` 猜测 Library。
