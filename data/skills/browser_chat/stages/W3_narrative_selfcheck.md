---
name: W3_narrative_selfcheck
description: W3 叙事质性 BLOCK 自检（export 前必跑）
stageId: W3_selfcheck
outputTag: narrativeSelfcheck
rulePackVersion: "2.1.0"
---

# W3 叙事质性 BLOCK 自检

W3 文学剧本完成后、**进入 designBrief 前**必须逐项自检。任一 BLOCK 项失败须回改 W3/P06，不得 export。

## 入口

- 已产出 `<scriptItem>` + sidecar JSON（ledger/dialoguePlan/retentionPlan/sceneMeta）
- 已读取完整 `planData.narrativeBrief`

## BLOCK 清单

| ID | 检查 | 失败则 |
|----|------|--------|
| NAR-empathy | 每条 informationLedger 有 emotionTarget + payoffBy 且 ep1 可指出兑现 | 补写/改剧本 |
| NAR-01 | ep1 第一场首 △ 强视觉冲突（非写景/开会） | 重写首场 |
| NAR-02 | ep1 前 30s 解释性台词 >2 且无 infoDelivery | 拆镜/改动作 |
| NAR-03 | 每条 dialoguePlan line 有 causedByActionId + ≥1 function | 补标注 |
| NAR-04 | retentionPlan.opening5s 在剧本首场可指出 | 对齐重写 |
| NAR-05 | changeLog 中 ≥80% P-issue 在剧本可追踪 | 回改 P06/W3 |
| NAR-06 | reconstructionTrace ≥80% 在 ep1 可指出 △/对白 | 回改 W3 |
| NAR-07 | ep1 无 forbiddenSuspense 模式 | 改信息交付 |
| NAR-14 | 长台词：优先按标点拆成 ≤15 字分句写入多条 `lines`；整句保留时须有 **splitHint**（如 `reaction_shot`）+ 反应 △ | 标点拆句 / 补 `dialoguePlan.lines[].splitHint` |
| NAR-15 | emotion_hit 台词有 **reactionAction** | 补 `dialoguePlan.lines[].reactionAction` |
| RET-01 | ep1 首场 sceneMeta.avCausality 非空 | 补声画峰值 |
| RET-02 | opening3to10s / rhythm31545 与正文时间轴一致；SB 镜可标 rhythm31545 | 对齐 retentionPlan |
| DEX-AV-TAGS | 每场 `sceneAvTags`（或 sceneMeta.avTags）非空且为 **string[]** | 按当前公式打标 |
| DEX-FX-INTENT | 每场 `fxIntent.level`（含 F0）；≤ pack 天花板 | 补声明/降级 |
| DEX-SCENE-CARD | implementationPlan 条数与 sceneMeta/唯一 sceneName 对齐 | 删孤儿或独立场名 |
| DEX-ADAPT-SCORE | 设计期 adaptScore 过阈值 | 补维度兑现/打标/拆镜 |
| DEX-CAM-FIT | 口播+反应同镜未拆 | **须已写出双镜**：speak（无 reactionAction）+ reaction（VD≥minChars，禁「听者反应特写」） |

**NAR-15 × DEX-CAM-FIT：** plan 行可写 `reactionAction`；**shots 禁止**单镜同时 onCam 对白 + `reactionAction`。  
**禁止假绿：** 不得在缺 splitHint/reactionAction/**sceneAvTags**/`shotDesignIntent`、或仍有未拆同镜 DEX-CAM-FIT/NAR-14 时写 `narrativeSelfcheck.passed=true`。  
**服务器自动闭环：** `setStepStatus` / export 会对 NAR-15 补占位 RA、从 peak 补 `shotDesignIntent`、唯一名+已定妆图绑 CREF；修不完仍 BLOCK，须按清单同轮重写 JSON，禁止只改 `passed`。  
**形状：** `sceneAvTags` 必须数组；`seriesContinuity` 必须 record；`microExpression` 仅 `{eyes,mouthDetail}`（多角 `byName`）。  
**NAR-14 优先**：按 `，。！？；` 标点拆成多条 `dialoguePlan.lines`（每分句 ≤15 字）；服务器也会物理拆句兜底，但导出 JSON 应直接写权威形。整句无标点且超长时才用 `splitHint: reaction_shot`。  
出站以服务器 `POST /api/scriptAgent/designExitGate` + `setStepStatus` 硬闸为准（见 `viral_adaptation_playbook.md`）。

## 输出

```json
{
  "narrativeSelfcheck": {
    "passed": true,
    "failedIds": [],
    "checkedAt": "ISO8601"
  }
}
```

## 闸门

`narrativeSelfcheck.passed !== true` → **禁止** designBrief / export。  
此外，export 前服务器 `exportGate` 会复核 `NAR-14` / `NAR-15`；若 bundle 自报 passed 但服务器失败，将判定为 `SELF_REPORT_MISMATCH` 并阻断出口。
