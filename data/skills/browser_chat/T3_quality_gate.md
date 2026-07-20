---
name: T3_quality_gate
description: T3 全链路出口质量闸门 — 四模态 prompt + 资产包
stageId: T3
outputTag: exportReady
rulePackVersion: "2.0.1"
---

# T3 质量闸门（全链路出口）

T3 为 **默认出口**。export 前对照 `docs/PROMPT_STANDARD.md` 自检，且**必须调用** `POST /api/ruleEngine/exportGate`。

## T3 必填产物

| 字段 | 来源 | 说明 |
|------|------|------|
| T1 全套 | GB/SB | script + preDesignPack + 台词 100% + visualDescription |
| characterDesign | CD | L0–L6 + CHAR-CODE |
| assetPipeline | AS | 场景/道具 |
| visualLockTable | BP | cref 可解析 |
| generation×4 | MD | 每镜 image/video/audio/fx |
| rulePackVersion | — | `"2.0.1"` |

## 每镜 generation 结构

```json
{
  "shotIndex": 1,
  "visualDescription": "婢女俯身唤醒",
  "visualEffect": "烛火摇曳，微光闪烁",
  "fxLevel": "F1",
  "charCodes": ["CHAR-MAID"],
  "generation": {
    "imagePrompt": "婢女, 寝殿烛火, 中景, 暖光, 古言写实, no text, --cref CHAR-MAID --ar 16:9",
    "videoPrompt": "中景 static, slow push, duration 2s, motion-from-frame, subtle mouth speaking",
    "audioPrompt": "婢女, 轻柔女声, 正常语速, 关切",
    "fxPrompt": "candlelight flicker, subtle warm glow, no CGI particles"
  }
}
```

无特效镜示例（F0 轨）：`"fxLevel": "F0"`，**省略** `fxPrompt` 或留空且 audit 声明 F0——禁止假 `modalityPromptAudit.FX=pass`。

或写入 `flowData.storyboard[]`：`prompt` / `videoDesc` / `duration`。

Slot 定义 SSOT：`data/fixtures/modality_prompt_slots.json`（skills / compiler / audit 均引用此文件）。

## 出口前自检（对照 PROMPT_STANDARD §8）

0. 跑 `W3_narrative_selfcheck` + `modality_closure_checklist` → 列出 missing/optimize
0b. T3：`planData.narrativeBrief.implementationPlan[]` 非空，每场含 `fxIntent`（含 F0）
0c. **场镜基数**：唯一 `preDesignPack.shots[].sceneName` 数 = `implementationPlan` 条数 = `sceneMeta` 条数；接场不得共用 sceneName 却多留 sceneRef F1（孤儿场 → 导入永卡）
0d. 禁假绿：不得 `modalityPromptAudit.FX=pass` / `narrativeSelfcheck.passed=true` 而字段仍缺
1. 台词覆盖率 100%（可合并，不可丢）
2. 每镜 visualDescription 非空
3. characterDesign 覆盖主角/反派
4. visualLockTable 解析全部 charCodes
5. 每镜 imagePrompt + videoPrompt 非空；**禁止**仅 `中景 static, duration Ns` 无峰值/口型的 stub 作为最终出口（须 peak 或 lip 关键词，或注明 F0 空镜）
6. 台词镜 audioPrompt 非空
7. **FX 双轨**：F0 声明 **或** 非空散文 `fxPrompt`（禁字母等级当散文）；`fxFeasibilityAudit.items` 覆盖全部镜号
8. **无映射镜的 sceneRef 禁止 F1+**（孤儿场：删 plan 或降 F0 或独立 sceneName）
8. 禁假 `ruleAudit` / `linkageAudit` / `modalityPromptAudit` pass

## 出口形状族（EXPORT_SHAPE_RULES / PDSR Prevent）

- 可选 string：无内容**省略 key**，禁止 JSON `null`
- `deepAdaptation.nameMap|relationMap|substitutions` 仅 `[{ "from", "to" }]`；禁止 arrow-key 伪对象
- `designBrief.B5` / `infoLinkageChain`：`payoffEp` 仅 number（未来集号）；本集收 → `payoffLabel: "本集收"`
- 勿发明 `B16_adaptationDeepRef` 替代 `designBrief.B16` record
- **SB 镜级 string 字段**（T3 Browser 出口；object 仅服务器 salvage，Chat 勿写）：
  - `visualEffect`: `"F1: 烛火摇曳，微光闪烁"`（可选同镜 `fxLevel: "F1"`）
  - `audioCue`: `"茶盏碎裂声骤停"`（来自 W3 avCausality.audioBeat）
  - 禁止 `"visualEffect": { "level", "desc" }`（V62 制作路径 legacy，非 T3 export）
- **导出前自检（阻断）**：扫描全部 `preDesignPack.shots[].visualEffect` / `audioCue`；若为 object → **不得导出**，按 RH-MOD-01 改成 string 后再跑 `exportGate`。服务器 import salvage 仅兜底，Chat 输出仍以 string 为规范。

## 禁止写入 bundle

- `ruleAudit: { passed: true }` 假通过
- `linkageAudit` 假六链 pass
- `externalHashCheck: { match: true }` demo 值

## 下游

export JSON → `POST /api/ruleEngine/exportGate` → `exportAllowed=true` 且附 `closureSnapshot` → `POST importScript` 落库。  
禁止仅靠 `ruleAudit` / `linkageAudit` / `modalityPromptAudit` 自报通过。

**配角入册（DC-16）**：`chatRepairText` 含 RH-DC-16 时，补真实 `characterDesign`（code/name/`L0.identity`，禁仅 stub）后须**再预览**直至 `exportAllowed`。详见 `preview_vs_import_guide.md` 与 `docs/image-quality-chain.md`。
