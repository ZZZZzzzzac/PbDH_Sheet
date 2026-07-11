# 常见错误与定位

| 现象 | 常见 code | 检查 |
| --- | --- | --- |
| 上传后无法读取 | `ZIP_READ_FAILED`, `MANIFEST_MISSING` | zip 根与文件完整性 |
| JSON 解析失败 | `MANIFEST_JSON_INVALID`, `PACKAGE_JSON_INVALID` | location.file 与 JSON 语法 |
| 页面/模块不显示 | `MISSING_MODULE_REFERENCE` | `pb-module id` 与 modules ID |
| 引用资源失败 | `MISSING_RESOURCE_LIBRARY_REFERENCE` | manifest Library ID 与 Module `资源库ID` |
| Dependency 空值 | `MISSING_RESOURCE_FIELD_REFERENCE` | evidence 中 referenced/known fields |
| Cards 阻止渲染 | `CARD_DEFINITION_FIELD_MISSING` | Table 配置后的 name/description 字段 |
| Check 导入失败 | `VALIDATION_SCRIPT_SYNTAX_INVALID` | script file/line/column |
| Shell 失败 | `SHELL_PAGE_OUTLET_COUNT_INVALID` | 必须恰好一个 `pb-page-outlet` |
| HTML/CSS 被拒绝 | `HTML_TEMPLATE_*`, `CSS_TEMPLATE_*` | 禁止标签、属性、事件、外部 URL |

直接上传 `public/system-packages/error-fixtures/*.zip` 可观察诊断上下文。修复方向由 Author 决定：Validator 只给出事实，不猜测应改引用端还是定义端。
