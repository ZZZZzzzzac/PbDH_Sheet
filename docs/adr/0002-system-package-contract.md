# ADR-0002: System Package Contract

状态：Accepted
日期：2026-07-06

## 背景

System Package 是 Author 和 Base Framework 之间的外部契约。它不是任意资源文件集合，而是声明 Sheet Tool 应如何使用 Base Framework 模块、资源、布局、样式、依赖和检查脚本。

## 决策

System Package 第一版定义为声明式数据包：

- zip 是主要上传格式。
- 目录包是作者增强路径，浏览器支持时启用。
- zip 只是目录包压缩；进入框架后必须归一化为同一个 Normalized System Package。
- 包内必须有固定入口 manifest，物理目录结构不强制固定。
- manifest 声明 resource libraries、pages、modules、styles、dependency rules、validation scripts 和 assets 的路径。
- 所有路径相对包根目录；禁止绝对路径、`..` 和外部 URL。
- System Package 可以声明使用 Base Framework 已实现模块，但不能修改模块逻辑或注入 UI 代码。
- System Package 必须声明 package schema version。Base Framework 对不兼容版本允许导入，但给强 warning。

## 理由

- 固定入口让 Loader 和 Validator 有清晰起点。
- 不固定目录结构，保留作者组织资源文件的自由。
- Normalized System Package 隔离 zip、目录和未来来源差异，避免渲染器关心文件来源。
- 路径限制避免跨包引用、路径歧义和安全问题。
- schema version 为未来格式演进留出空间。

## 代价

- Author 必须理解 manifest。
- Validator 需要提供足够清楚的错误位置和修复建议。
- 未来 schema 升级需要迁移策略或兼容层。

## 后续信号

出现以下信号时，补充迁移机制：

- 多个已发布 System Package 依赖旧 schema。
- Character Data 因 System Package 版本变化产生常见兼容问题。
- Author 经常需要批量升级包格式。
