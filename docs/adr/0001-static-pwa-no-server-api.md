# ADR-0001: Static PWA Without Server API

状态：Accepted
日期：2026-07-06

## 背景

PbDH Sheet Framework 第一版需要让玩家在线打开网页后导入本地 System Package，编辑 Character Data，保存、导出、打印。服务器 API 可以提供系统包市场、云端角色存档、AI 生成、服务端 PDF 等能力，但这些能力会引入账号、权限、同步、后端存储和运维复杂度。

## 决策

第一版使用静态 Web 应用架构：

- Base Framework 部署为静态站点，产物为 HTML、JS、CSS 和图标资源。
- 主路径是 HTTPS 静态部署网页。
- PWA 只缓存应用壳，不缓存用户上传的 System Package。
- System Package 只支持本地上传；不支持 URL 导入。
- 第一版不依赖服务器 API、账号、云同步、系统包市场或后端数据库。

## 理由

- PRD 的核心价值是通用 Sheet Tool 底座，不是在线平台。
- 静态站点能覆盖大多数玩家使用场景，也利于移动端。
- HTTPS 部署下，ES module、Web Worker、IndexedDB 和 PWA 都有稳定浏览器支持。
- 去掉后端 API 能降低第一版实现和维护成本。

## 代价

- 不提供多设备云同步。
- 不提供在线系统包市场。
- 不提供远程 URL 一键加载系统包。
- 浏览器本地数据被清理后，玩家需要重新上传 System Package；Character Data 需要靠 JSON 导出备份。

## 后续信号

出现以下信号时，重新评估服务器 API：

- 大量玩家需要跨设备同步 Character Data。
- 作者需要在线发布、更新和撤回 System Package。
- 需要统一托管大体积资源包。
- 服务端 PDF 或 AI 生成成为核心需求。
