# ADR 目录约定

本目录记录 PbDH Sheet Framework 的架构决策。

## 文件命名

- 使用 `NNNN-short-title.md`。
- 编号递增，不复用，不因废弃决策而重排。
- 标题使用英文短语，正文使用中文。

## ADR 格式

每个 ADR 使用以下结构：

```text
# ADR-NNNN: 标题

状态：Accepted | Superseded | Deprecated
日期：YYYY-MM-DD

## 背景
## 决策
## 理由
## 代价
## 后续信号
```

## 维护规则

- 新架构约束先写 ADR，再进入实现。
- 如果新决策替代旧决策，不改旧 ADR 编号；新建 ADR，并在旧 ADR 状态中标注 `Superseded`。
- ADR 只记录影响架构边界、数据契约、质量属性或演进路线的决策；普通实现细节不写 ADR。
