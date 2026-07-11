# Pages、Shell 与布局

Page 是 Player 导航和打印的单位。`pages.json` 按数组顺序决定导航与输出顺序。每页需要 `ID`、`名称` 和一个 HTML Layout Template。

`默认隐藏` 缺省为 `false`。Dependency Logic 可以在运行时改变可见性。正常阅读只显示一个 Current Page；Current Page 是临时 UI 状态，不写入 Character Data。

`打印` 是可选覆盖：`true` 总打印，`false` 总排除，未写时采用运行时可见性。打印与 Current Page 无关。

布局 HTML 可以使用安全的静态标题、段落、容器、图片和 `<pb-module id="...">`。交互控件必须来自 Sheet Module；不要写 `input`、`button`、`form`、事件属性或 `script`。图片只能引用包内资源。

CSS 可以使用 Grid、Flex、media query 和框架公开的 `data-module-id`、`data-module-type`、`data-part`。CSS 被限制在当前页面，不能修改 `html/body`、App Shell 或其他页面，也不能用 `@import` 或外部 URL。

可选 Sheet Shell 用一个公共 HTML/CSS 包裹所有页面。Shell 必须且只能包含一个 `<pb-page-outlet></pb-page-outlet>`，可以同时放置公共 Sheet Modules。

完整允许项见[HTML Layout 接口](../reference/html-layout-template.md)，示例见 `demo-selection/layouts`。
