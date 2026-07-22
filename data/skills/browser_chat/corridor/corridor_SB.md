---
name: corridor_SB
description: SB 分镜表走廊 — shots dialogue.lines，禁 prompt
stageId: SB
outputTag: storyboardTable
rulePackVersion: "2.1.0"
---

# 走廊 SB · 分镜表

质量走廊第二阶段：scriptPlan → shots[]。**每句台词映射 dialogue.lines**，严禁 compiled prompt。

## 入口条件

- corridor_GB scriptPlan 已通过
- script 全文可用

## 每镜必填字段

| 字段 | 说明 | ruleId |
|------|------|--------|
| id | shot-1 递增 | — |
| narrative.type | CHAR-SCENE / CHAR-PROP 等 | V4 |
| narrative.sceneName | 场景名（后续映射 SCENE-CODE） | V5 |
| narrative.dialogue.lines | **每句台词原文**，含角色名与引号 | R2, H3 |
| narrative.emotionIntensity | 0-10，对齐 GB 场情绪 | L10 |
| narrative.shotSize | 景别（特写/中景/全景） | S4 |
| narrative.duration | 预估秒数 | — |
| narrative.transitionType | 切/淡入/叠化 | PR-CAM-01 |
| narrative.rhythmZone | 起/承/转/合（引用 B12） | DC-05 |
| narrative.markers | 伏笔/揭晓/钩子标记；可含 infoId/causeId/effectId | PR-09, DC-06 |
| narrative.spatialRelation | **站位 string**（由 B13 压串；禁止贴 `{axis,anchors}` 对象） | PR-06, PR-14 · DEX-SPATIAL-STR |
| retentionTier | ep1: 0-2s / 2-5s / 5-30s / body / endHook | RET |
| shotDesign | T2+ 构图/表演/锚点（高情绪≥4 必填 performance） | GEN |
| lines[].lineId/functions/causedByActionId | 台词功能链，对齐 dialoguePlan；**plan 全部 lineId 须落 shots（DC-01）** | NAR, DC-01 |
| lines[].reactionAction | emotion_hit 必填；与 plan 镜像 | NAR-15 |
| speaker 裸名 | 禁 OS/VO 后缀；禁 APP/UI 作 speaker | DEX-SPEAKER-BARE |

## 出站硬闸（SB）

- `runDesignExitGate(SB)`：NAR-14/15（plan+shots 同核）、DC-01、DEX-DC-ALIGN、DEX-SPEAKER-BARE、DC-16 预检
- **残句**：A 拆后仍 NAR-14 → 须重设计/显式 splitHint/`Confirm B`；导入 ingest 可 auto B（有真实反应镜才绑 hint）
- 拆行后须 `confirm_design_split` / Orchestrator（mirror+补缺 lineId），禁止只写 hint
- VisBeat 与 Orchestrator：先 expanders，再 clause-split，再残句 B（禁双拆打架）
- 修后强制 `forwardReentry`（防二次 DC-01/时长）
| clip30sCandidate / rhythm31545 | 投流与 3-15-45 标注 | VIR |
| audioCue | W3 sceneMeta.avCausality.audioBeat（**string**；禁止 `{beat,type}` object） |
| visualEffect / fxLevel | W3 fxIntent（**visualEffect 为 string** `"F1: 描述"`；fxLevel 可选 `"F1"`） |

| visualBeatTags | L0 拍点标签（reveal/prop_insert/reaction…）；与景别冲突见 DEX-VIS-* | DEX-VIS |
| suggestedVisualBeatTags | Suggestor 提案，**确认前不立法** | — |
| weaponId | 五刀等武器；升超 visual_multi | GEN |

无 AV 意图时**省略**上述可选字段；禁止写 `null`。

### VisBeat 自检（SB）

- purpose→tags：钩子→`reveal`+`prop_insert`；反应→`reaction`
- 揭示/道具插入 **不得** 与纯脸 `特写/CU` 同镜（须拆 insert→reaction 或显式 override）
- Suggestor 只提案；须 `setTags` / ConfirmBar 确认后才进 L0

### spatialRelation 压串公式（DEX-SPATIAL-STR · BLOCK）

B13 `{ "axis": "谢玄辞-沈清漪", "anchors": ["立于树影下", "从光亮处走来"] }` →

```text
axis=谢玄辞-沈清漪；anchors=立于树影下|从光亮处走来
```

- **正例**：`"spatialRelation": "axis=女主-男主；anchors=女主左|男主右"`（写在 `narrative.spatialRelation`）
- **反例（禁止）**：`"spatialRelation": { "axis": "女主-男主", "anchors": ["女主左","男主右"] }`
- 导入 salvage（SH-SHOT-SPATIAL）仅兜底；Chat **不得**依赖 salvage。

## 台词映射铁律（R2）

1. 剧本每句 `{角色}：{台词}` 须在 shots 中可追溯
2. **100% 覆盖**：可合并多句入一镜，**禁止删改字词、禁止丢句**
3. OS/VO/系统音单独标注 `type`（`os` / `vo`）— **禁止** `speaker: "沈清漪（OS）"`；speaker 只写本名，画外用 type
4. **禁止** `--cref SCENE-*`：角色用 `--cref CHAR-*`，场景用 `--sref SCENE-*`
5. **CastingSheet**：身份以 CD/`charCodes`/`--cref` 为准；`visualDescription` **禁止当作造名源**（见 `docs/PRODUCTION_PILLARS.md`）
6. **静帧 Identity（DEX-STILL-*）**：一镜一可静帧拍；人名裸名禁`（OS）`；禁「对白瞬间神态」填料；多拍须拆镜或 VisBeat Confirm
7. 出口前人工核对台词数 ≥ 剧本可枚举句数

### speaker 正反例（DEX-SPEAKER-BARE）

- **正例**：`{ "speaker": "沈清漪", "type": "os", "text": "……" }`
- **反例（禁止）**：`{ "speaker": "沈清漪（OS）", "text": "……" }` — 导入会剥 OS，但 Chat 不得依赖 salvage；生产闸会把「名（OS）」当第二张脸

### visualDescription 正反例（DEX-STILL-* · WARN；DEX-QP-02 / QP-02 · BLOCK）

- **正例**：`{ "visualDescription": "中景。沈清漪咬帕止血，眉心微蹙。" }`（单拍、裸名、可拍≥minChars）
- **反例**：一镜堆刺入+咬帕+包扎+露出匕首+笑（多拍）→ `DEX-STILL-ONEBEAT`
- **反例**：`沈清漪（OS）对白瞬间神态` → `DEX-STILL-OS-NAME` + `DEX-STILL-FILLER`
- **反例**：7 字空壳 / 纯「很美很有氛围」→ `DEX-QP-02` / `QP-02`（minChars 仅防空壳；正式标准=可拍物象）
- 首帧脏反推：`still_firstframe_dirty` → **先改 SB 描写** → stale → 再 MD-IMG 重出；**禁止只 regen**
- 描写过短反推：`qp02_visual_short` → SB 重写 `visualDescription`；导入不发明占位

## 每镜必填 visualDescription

| 字段 | 说明 |
|------|------|
| visualDescription | 画面主体与动作（供 EN subject / MD-IMG）；**一镜一拍、裸名** |

## 执行步骤

1. 按 scriptPlan 分场拆镜
2. 为每句台词创建 shot，填入 dialogue.lines
3. 标 shotSize + emotionIntensity + duration + rhythmZone
4. 为每镜填 **visualDescription**（必填）
5. 标 shotSize + emotionIntensity + duration + rhythmZone
6. 为信息镜填 markers；标 **string** spatialRelation（按上式从 B13 压串）
7. 写入 preDesignPack.shots[]

## BLOCK 闸门

| 项 | 条件 |
|----|------|
| R2 | 台词 100% 覆盖，零丢句 |
| visualDescription | 每镜非空 |
| DEX-SPATIAL-STR | 任一 `spatialRelation` 为 object → **不得导出** |
| 禁越界 | SB 阶段不写四模态 prompt（属 MD） |

## 严禁产出

compiled prompt、API 参数、vendor 字段、Touch 配置。

## 下游

通过 → CD（T2）→ EN → MD；台词问题 → rePush W3 或 SB 补镜。
