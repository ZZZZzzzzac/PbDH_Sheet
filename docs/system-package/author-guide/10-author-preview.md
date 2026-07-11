# Author Preview

Author Preview 复用正常 Player-facing Sheet Tool，不是独立编辑器。

在支持 File System Access API 的桌面 Chromium 浏览器中：

1. 打开 System Package 菜单。
2. 选择“进入 Author Preview”。
3. 授权开发目录。
4. 修改并保存目录文件。
5. 刷新浏览器，框架重新读取同一目录并运行正常 Loader、Validator、Renderer 和 Sheet Modules。

Preview 中仍可填写角色、存档、运行 Checks、导入导出 JSON 和打印。进入 Preview 会让成功加载的开发包成为 Current System Package；退出只停止刷新重读，不恢复旧包。

Preview 状态只在当前标签页会话保持。目录句柄可以保存，但浏览器可能在刷新或重启后要求重新授权。权限丢失或最新包有 fatal/error 时，框架保持 Preview、清除旧画面并显示当前错误，不回退缓存快照。

不支持 `showDirectoryPicker` 时仍可用普通目录导入或 zip；它们不会在刷新时自动重读。Preview 不监听文件变化，核心循环始终是“保存文件，然后刷新”。
