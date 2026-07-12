---
name: adaptation_execution_matrix
description: P0.3 改编矩阵 12 维决策（步骤0.3）
stageId: P03
outputTag: adaptationMatrix
---

# P0.3 改编矩阵

基于 P0 预检与用户选定方向，填写 **12 维改编矩阵** 与诊断-方案映射。

## 入口

- `planData.preCheck` 已通过 ruleAudit.P0
- 用户确认改编方向（或默认推荐方向 1）

## 12 维矩阵（P13–P18 延伸）

| 维度 | 选项 A/B/C/D | 须标注 |
|------|--------------|--------|
| 性别结构 | 保持/调整/对调/群像 | 解决的 P 问题 ID |
| 场景结构 | 线性/插叙/双线/浓缩 | 同上 |
| 人物锚点 | 内核/矛盾/金手指边界 | 同上 |
| 关系网络 | 三角/多角/对立/师徒 | 同上 |
| 情感逻辑 | 虐/甜/爽/混合 | 同上 |
| 冲突设计 | 人vs人/人vs己/人vs环境 | 同上 |
| 视觉风格 | 见 art_skills 前缀 | 同上 |
| 叙事结构 | 三幕/四段/单元剧 | 同上 |
| 核心道具 | 保留/强化/替换 | 同上 |
| 台词策略 | 保真/口语化/压缩 | 同上 |
| 音乐氛围 | 见 designBrief 预留 | 同上 |
| 节奏规划 | 快/中/慢+留白 | 同上 |

## 诊断-方案映射表

每个诊断问题 → 至少一个矩阵维度 → 推荐选项 + 逻辑理由。

## 边界条件

- 每个改编维度必须标注解决的具体诊断问题
- 推荐配置必须有明确逻辑理由
- 不得与 G 层锚点后续设定冲突（预留 G1–G5 字段）

## 输出

写入 `planData.adaptationMatrix`：

```xml
<adaptationMatrix>
  <mapping>...</mapping>
  <matrix dim="性别结构" choice="B" resolves="P-002,P-005" reason="..." />
  ...
  <recommendedConfig>...</recommendedConfig>
</adaptationMatrix>
```

## ruleAudit

- stage: `P03`
- BLOCK：12 维均有 choice、映射表覆盖 preCheck 主要问题
