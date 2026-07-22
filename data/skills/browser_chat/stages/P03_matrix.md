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
- 读取 `data/fixtures/adaptation_matrix_catalog.json` + 项目 `adaptationProfile.lockedChoices`
- 读取当前 `genreTemplate.packId` 与 `viralWritingContext`（P0 已抓 peak/hook）
- V05 类型框架须与 packId 可仲裁（DEX-PACK-RECONCILE）
- **须** `userConfirmed: true`（API `confirmMatrixChoices`）后才可进 P06
- rulePackVersion `2.0.1`
- 深度维含 D05 故事内核平移、D06 内容平移（extensible 须 `viralDerivation` 补本剧特有爆点钩子）

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

1. 读取 `preCheck.issues` 与 catalog + `adaptation_profiles.json`
2. 12 维 + D/V/R/C/DLG/O 系列全部 choice；深度维 choice≠keep 时填 `deepAdaptation.*`

### 出口形状族（Shape contract）

- **可选 string**：无内容必须**省略 key**；禁止输出 JSON `null`
- **`nameMap` / `relationMap` / `substitutions`**：仅允许 `[{ "from": "原", "to": "新" }]`；禁止 `"原→新"` 作 object key，禁止无冒号伪对象
- **`designBrief.B16`**：由 nameMap 编译的 `{ "原": "新" }` record 镜像

正例：

```json
"deepAdaptation": {
  "nameMap": [{ "from": "温如瓷", "to": "沈清瓷" }],
  "relationMap": [{ "from": "温家", "to": "沈家" }],
  "substitutions": [{ "from": "系统", "to": "天命书" }],
  "settingProfile": { "era": "架空大邺" }
}
```

3. 产出 **并列** `planData.adaptationMatrixStructured` + 累积 `planData.narrativeBrief.adaptationConstraints[]`
4. 从 P0 `recommendedMatrixDraft` 生成 `recommendedConfig`（摘要 + 机器可读 matrix 引用）
5. 等待用户确认 / `confirmMatrixChoices` 后 `userConfirmed: true`

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
