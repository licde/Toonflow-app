# design_compliance_gate（对齐 qualityGate）

出口前必须调用 **同一内核**：

1. `POST /api/ruleEngine/exportGate`（或本地 `runExportGate`）→ 读取 `exportAllowed` / `closureSnapshot` / `qualityGate` / `chatPromptGaps`
2. 对照 `data/fixtures/quality_matrix.json` 的 id
3. **禁止** 自报 `linkageAudit: pass` / `modalityPromptAudit.passRate=100` / `FX=pass` / `ruleAudit.passed=true` 当权威

## 必检（matrix 引用）

- 台词：`DC-01` / `LANG-01`（源语言，禁英译进 VID）
- 画面：`QP-02`（禁空泛）
- 运镜/转场：`PR-CAM-01` / `DC-09`（白名单）
- 特效：`FX-GRADE-01`（无特效须声明 **F0**；有特效才写 `fxPrompt`；F4/F5 硬拦）
- 假绿：`FX-FALSE-GREEN`（禁止空 FX 仍写 modalityPromptAudit.FX=pass）
- 叙事辅字段：`NAR-14`（长台词 >20 字须 `splitHint`）/ `NAR-15`（emotion_hit 须 `reactionAction`）
- 爆款/留存：`VIR-01` / `RET-01` / `VIR-04`（WARN→T3 ep1 可升）

## Track A 作者权（Chat 必须写）

| 字段 | 阶段 | 规则 |
|------|------|------|
| `dialoguePlan.splitHint` | W3 | 单句 >20 字 |
| `dialoguePlan.reactionAction` | W3 | `functions` 含 emotion_hit |
| `sceneMeta.fxIntent` / F0–F5 | W3 | 无特效写 F0 |
| `generation.fxPrompt` | MD-FX | 仅 F1+ / visualEffect |
| `modalityPromptAudit.FX` | MD | 须与真实字段一致，禁止假绿 |
| `rhythm31545` 镜标 | SB | 对齐 retentionPlan |

## Track B 制作安全网（可声明自愈）

- 空 FX → soft_patch 声明 F0（不发明特效文案）
- 运镜/转场白名单 clamp
- LANG 源语言回填

## 失败处理

`repair_hint_catalog`：`RH-LANG-01` / `RH-FX-01` / `RH-NAR-14` / `RH-NAR-15` / `RH-QP-02` / `RH-QP-14` / `RH-QP-03`；或 `POST /api/ruleEngine/precheckLoop`。

若 `exportAllowed !== true`：必须按 `repairHints` 回改 JSON 字段，重跑 `exportGate`，不得直接 import。
