# Chat 全链路规范 v2.0.1

## 三层边界

| 层 | 职责 |
|----|------|
| **Chat** | P→G→W→B→GB→SB→CD→AS→BP→EN→MD×4→导出 JSON |
| **外部校验** | export/import 后 `inspectBundle` 对照 [PROMPT_STANDARD.md](./PROMPT_STANDARD.md) |
| **Import** | 原样落库，不 BLOCK，不用 compiler 覆盖 Chat prompt |

## 默认路径（T3 一气呵成）

```
P? → G → W → designBrief → GB → SB → CD → AS → BP → EN → MD-IMG/VID/AUD/FX → 导出
```

## ScriptBundle 全量出口

见 `data/fixtures/script-bundle-template-v2.json`。

必填：`script`, `meta`, `planData`, `designBrief`, `preDesignPack`  
T2：`characterDesign`, `assetPipeline`, `visualLockTable`  
T3：每镜 `generation.{imagePrompt,videoPrompt,audioPrompt,fxPrompt}` 或 `flowData.storyboard[]`

## 技能索引

| 阶段 | 技能文件 |
|------|----------|
| 编排 | `data/skills/browser_flow_orchestration.md` |
| SB/GB/EN | `data/skills/browser_chat/corridor/` |
| T2 | `production/CD_character_design.md`, `AS_asset_pipeline.md`, `BP_blueprint.md` |
| T3 | `production/MD_modality_*.md`, `T3_quality_gate.md` |
| 标准 | `docs/PROMPT_STANDARD.md` |

## API

| 操作 | 端点 |
|------|------|
| 导入 | `POST /api/ruleEngine/importScript` |
| 验收 | `POST /api/ruleEngine/inspectBundle` |
| 导出全量 | `POST /api/ruleEngine/exportFullBundle` |
