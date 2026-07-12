---
name: P03_matrix
description: P0.3 改编矩阵 12 维决策与诊断映射
stageId: P03
outputTag: adaptationMatrix
rulePackVersion: "2.0.1"
---

# P0.3 改编矩阵

基于 P0 预检与用户选定方向，填写 **12 维改编矩阵** 与诊断-方案映射。为 G 层锚点与 W 阶段预留字段。

## 入口条件

- `planData.preCheck` ruleAudit.pass = true
- 用户确认改编方向（默认推荐方向 1）
- rulePackVersion `2.0.1`

## 12 维矩阵

| 维度 | 选项 | 须标注 |
|------|------|--------|
| 性别结构 | 保持/调整/对调/群像 | 解决的 P 问题 ID |
| 场景结构 | 线性/插叙/双线/浓缩 | 同上 |
| 人物锚点 | 内核/矛盾/金手指边界 | 同上 |
| 关系网络 | 三角/多角/对立/师徒 | 同上 |
| 情感逻辑 | 虐/甜/爽/混合 | 同上 |
| 冲突设计 | 人vs人/人vs己/人vs环境 | 同上 |
| 视觉风格 | art_skills 前缀 | 同上 |
| 叙事结构 | 三幕/四段/单元剧 | 同上 |
| 核心道具 | 保留/强化/替换 | 同上 |
| 台词策略 | 保真/口语化/压缩 | 同上 |
| 音乐氛围 | designBrief 预留 | 同上 |
| 节奏规划 | 快/中/慢+留白 | 同上 |

## 执行步骤

1. 读取 `preCheck.issues` 与 `preCheck.directions`
2. 为每个主要诊断问题映射 ≥1 个矩阵维度
3. 每维选定 choice（A/B/C/D）并写 reason
4. 汇总 `recommendedConfig` 供 P06 引用
5. 自检：不得与后续 G1–G5 锚点冲突

## 输出

```xml
<adaptationMatrix rulePackVersion="2.0.1">
  <mapping>
    <link issue="P-001" dim="冲突设计" choice="B" reason="..." />
  </mapping>
  <matrix dim="性别结构" choice="B" resolves="P-002,P-005" reason="..." />
  <recommendedConfig>...</recommendedConfig>
</adaptationMatrix>
```

## BLOCK 闸门

- 12 维均有 choice + reason
- 映射表覆盖 preCheck 主要问题（≥80%）
- 每维 resolves 字段非空

## ruleAudit

stage `P03`；未通过不得进 P06_story_core。
