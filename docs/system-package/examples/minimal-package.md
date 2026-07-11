# 最小包讲解

实际文件：`public/system-packages/demo-minimal`。

它展示最短有效链：manifest 指向 Pages 和 Modules；Page 指向 HTML/CSS；布局用 `pb-module` 挂载一个 freeText；Asset 由 manifest 声明。复制它时必须更换 package ID，不要只改名称。

最小包适合验证部署、zip/目录导入、基本保存与布局。它不展示 Resources、Dependencies、Cards、Guide 或 Checks，这些不是必需文件。

验收：目录导入和 zip 导入都应无 error；页面显示一个角色名字段；刷新后包可从缓存恢复。
