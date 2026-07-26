---
name: T3_quality_gate
description: T3 全链路出口质量闸门 — 四模态 prompt + 资产包
stageId: T3
outputTag: exportReady
rulePackVersion: "2.1.0"
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
  - `spatialRelation`: `"axis=女主-男主；anchors=女主左|男主右"`（从 B13 压串；禁止 object）
  - 禁止 `"visualEffect": { "level", "desc" }`（V62 制作路径 legacy，非 T3 export）
  - 禁止 `"spatialRelation": { "axis", "anchors" }`
- **B12.beats**：必须为 **number**；叙事写 `summary`。禁止 `"beats": "自残取佩…"`
- **导出前自检（阻断）**：
  - 扫描全部 `preDesignPack.shots[].visualEffect` / `audioCue` / `spatialRelation`（含 narrative）；若为 object → **不得导出**（RH-MOD-01 / RH-SPATIAL-OBJ）
  - 扫描 `designBrief.B12[].beats`；若非 number → **不得导出**（DEX-B12-BEATS-NUM / RH-B12-BEATS）
  - **DEX-LITERARY-STALE**（BLOCK）：公式已更换 → **按新规范重设计**（入口 W1 → **W3 redesignPass 验收消债**）；或 `acknowledgeKeepLegacy` 保留旧稿补洞。勿只改旧 NAR/DC；勿只完成 W1。导入默认不消 stale。
  - **【设计未闭合】**：export 嵌 `runDesignExitGate(SB,{chatStrict})`；未过 → 短文案「请回 W3/SB 写完再 export；勿当导入补洞」。**禁止**跳过 designExit / 只改 audit 假绿出站。
  - **DEX-CAM-FIT**（BLOCK · SB）：**Chat 硬约束** — `reactionAction` 写在 dialoguePlan；shots **禁止**单镜 onCam 对白+reactionAction（或 VD「开口…反应」）。权威形=说话镜+反应镜两镜；禁「听者反应特写」。服务器 untilClear 仅兜底；**chatStrict 未拆不得假绿**。深链 `cam_fit`（RH-DEX-CAM-FIT：下次写权威形；本包勿手拆已愈项）
  - **DEX-NAR-14/15**：**优先**按标点拆成多条 `lines`（分句 ≤15）；`emotion_hit` **必须**同写 `reactionAction`（**plan**；shots 已拆双镜后 speak 行无 reactionAction）。决策树：标点→A；**残句无标点→must 重设计或 Confirm B**；VisBeat→C。
  - **二次修复必再入编排**：改完字段后须 `designSplitOps.forwardReentry` / tool `design_split_forward_reentry`，或 SB `setStepStatus` heal（会自动 SplitOrchestrator mirror + 残句 B）。**禁止只改 plan 不 mirror**，否则镜级 NAR-15 / DC-01 会二次爆。
  - **NAR-14「可不手改」仅当 A 拆净或已 B 绑 hint**；残句进【须手改】。导入与设计 **同核** `runSplitOrchestrator`（高置信 auto / 低置信 Confirm）；禁静默同文克隆；残留才 stamp `lipConfirmRequired`；真实反应镜存在才可绑 splitHint（禁静默发明）。
  - **契约不符＝重设计**：deep link `nar14_residual` → W3；禁止只改 `narrativeSelfcheck.passed`（服务器会覆写）。
  - **DEX-DC-01 / DC-01-EXTRA / DEX-DC-ALIGN**：缺覆盖=DC-01；乱入=EXTRA；`lineId` ⊆ shots；拆行后缺镜行 → Confirm/Orchestrator
  - **DEX-SPEAKER-BARE**：speaker 裸名；禁 OS/VO 后缀；禁 APP/UI 作说话人
  - **DEX-STILL-ONEBEAT**（**BLOCK**）：visualDescription 一镜一可静帧拍。多拍 → 智能拆镜或 Confirm；首帧分流：`still_firstframe_dirty`（假双脸/多拍）/ `still_firstframe_stale`（描写漂移）/ `still_firstframe_weak`（弱静照→batch_still）/ `dirty_still_prompt`（真手+脸）；禁只 regen（RH-STILL-FIRSTFRAME / RH-STILL-WEAK / RH-STILL-STALE）
  - **DEX-STILL-CU-CAST**（**BLOCK**，导入 demote）：特写/近景 × 出镜≥2 → **文学单人特写优先降出场人数**（slice_cast，禁拆镜 Confirm）；多人同框意图 → 智能拆（反应特写+场面镜）或 Confirm；深链 `still_cu_cast`（RH-STILL-CU-CAST）；禁 silent single_hero 洗绿 / 只 regen
  - **DEX-STILL-OS-NAME / DEX-STILL-FILLER**（设计期 **BLOCK**，导入 soft demote）：禁（OS）人名与「对白瞬间神态」填料
  - **弱静帧别名**：`img_still_weak` ≡ `still_firstframe_weak` → MD-IMG `batch_still`（禁落 INFRA）
  - **VLM 基建**：缺 Key → evidence=`vlm_infra` / `pendingHumanRejudge`；CTA 配 Key；人审可过但记 `humanOverride:vlm_infra`
  - **DEX-STILL-OS-NAME / FILLER**（WARN）：人名裸名禁（OS）；禁「对白瞬间神态」
  - **DEX-QP-02 / QP-02**（BLOCK）：画面描写空/过短/抽象无物象 — 与 export 同核；须 SB 重设计。深链 `qp02_visual_short`。minChars 仅防空壳底线
  - **DEX-CAST-ON-DESC**（BLOCK）：描写点名须进 `charCodes`（与 DEX-CAST-CODES 分立）。**智能绑定**：CD/资产唯一命中可自动补码+cref；歧义拒绑保留姓名；CD 无则 orphan stub（仍 BLOCK export 假绿）。**禁剥名**、禁自由 NER 造角。深链 `cast_on_desc_missing`（RH-CAST-ON-DESC）
  - **DEX-EMPTY-SHOT-CONSISTENCY**（BLOCK）：空镜声明不得与人名/出脸/codes 并存。深链 `empty_shot_conflict`（RH-EMPTY-SHOT）；forbidRegenWithoutDescFix。compose 出站禁再叠「正脸清晰」
  - **DEX-EXPR-SPEAK**（BLOCK）：高强度**出镜**对白须 `microExpression`+`lipSyncPolicy`；OS/VO 不强制口型闸。禁默认表演假过。深链 `expr_speak_missing`（RH-EXPR-SPEAK）
  - **DEX-ASSET-CREF**（BLOCK · AS；SB 可 stub 延期）：出脸/`CHAR-*` 须本镜绑；SB 可用 stub+`assetCrefPlan` 过设计闸，AS/compose 须定妆真图。禁止假 `--cref`/假绿。深链 `asset_cref`（RH-ASSET-CREF → AS）
  - **designBrief 同挂 EMPTY/EXPR/CAST**（与 SB 同核）：不得提前出站绕开 SB
  - **NO-LIP-DIALOGUE**（BLOCK · EN/MD-VID）：**出镜对白**禁止显式 `lipSyncPolicy=none/silent` 与提示词 `no lip sync`。空 policy → 自动升 `subtle_natural`（≠假阳）。**仅 OS/VO 的镜允许 no lip**。深链 `no_lip_dialogue`（RH-NO-LIP-DIALOGUE）
  - **STILL-MOUTH-HANDOFF**：静帧闭口 ∩ 视频强口型（仅出镜对白）→ soft 一次后须复检；仍冲突 **BLOCK**（禁 silent soft 假愈）。深链 `still_mouth_handoff`
  - **SFX-UNBACKED**（WARN）：字面 `sfx:<>` 无 adapter / 无 `audioCue` 真源 ≠ 音效满分。深链 `sfx_unbacked`（RH-SFX-UNBACKED）。DEX-SFX-BRIDGE 禁逼造假意图
  - **镜面**：描写含镜/倒影须 anti-warp；成片变形 → `svq_motion_fail`
  - **emotionHold**：对白高情绪须时长预留可读；不足并 `lip_duration_short`
  - **静帧脏禁烧**：保真环失败且设计缺口 → `still_firstframe_dirty`；仅弱图/无 visualPass → `still_firstframe_weak`（重出 HQ）；禁脏首帧续烧
  - **视频污染壳**：XML 索要 / 跨镜 PEAK sidecar / EN QF → sanitize + preferCompile 重编（RH-VIDEO-PROMPT-STUB）
  - **DEX-CUT-01 / DEX-CAM-XSHOT**（WARN）：邻镜硬切/运镜突变，与 export 同核
  - **DEX-DC-16**：`designBrief.B6.characters` 每人必须进 `characterDesign.assets`（code/name/`L0.identity`）；禁仅 stub（如「侍女」）
  - **DEX-FX-F0**：无特效镜写 `visualEffect: "F0"`（或 fxLevel/fxFeasibility F0）；有特效写散文 `generation.fxPrompt`。禁止 `modalityPromptAudit.FX=pass` 却全空
  - **DEX-DURATION / LIP**：对白镜 `duration` ≥ 朗读时长。可抬短镜由**设计侧**抬时（autoClose/export）；超 vendor/多句须 Confirm。DFW-DURATION 不得与超限 LIP 同镜谎称「导入可愈」。导入抬时仅兜底。
  - **DEX-MOD-SEED**：T3 每镜非空 `generation.imagePrompt` / `videoPrompt`；有台词则 `audioPrompt`
  - 服务器 import salvage/heal 仅兜底；Chat 输出仍以权威形为规范；**chatStrict=propose-only**（L2 不落盘）
  - `chatRepairText` 分两层：【须手改】vs【导入将自动适配】；并含【深链·反推舞台】`toonflow://stage/...`
  - 若返回 `shapeSalvageSummary`（【已自动适配】），下次导出须改权威形，勿依赖 salvage

## 静帧→视频质量闭环（Chat 必遵）

SSOT：`data/fixtures/still_video_quality_doctrine.json` + `reverse_route_table.json` + `repair_hint_catalog.json`。

| 症状 | 正推挡点 | 反推 trigger | Chat 动作 |
|------|----------|--------------|-----------|
| 描写点名无码 | DEX-CAST-ON-DESC | `cast_on_desc_missing` | 智能绑 CD；歧义拒绑；禁剥名 |
| 空镜∩正脸 | DEX-EMPTY + compose egress | `empty_shot_conflict` | 二选一改描写；禁只 regen |
| 高强度出镜对白无表演 | DEX-EXPR-SPEAK | `expr_speak_missing` | 补 microExpression+lipSyncPolicy |
| 有脸无定妆计划 | DEX-ASSET-CREF | `asset_cref` | SB 可 stub 延期；AS 补定妆真图 |
| 出镜对白+no lip | NO-LIP-DIALOGUE | `no_lip_dialogue` | 改 policy；OS 不强制；空 policy 升 subtle |
| 闭口静帧强口型 | mouth handoff | `still_mouth_handoff` | 改静帧口型或 EN 口型强度 |
| 假 sfx:<> | SFX-UNBACKED | `sfx_unbacked` | 补 audioCue 真源；无 adapter≠满分 |
| 脏静帧烧视频 | still detect | `still_firstframe_dirty` | hq_update 重出后再烧 |

**愈后**：designExit L2 愈 CAST/EMPTY 后须 stale 级联（MD-IMG/EN），禁止旧静帧/旧 VID 续烧。
## 禁止写入 bundle

- `ruleAudit: { passed: true }` 假通过
- `linkageAudit` 假六链 pass
- `externalHashCheck: { match: true }` demo 值
- **只导出纯 JSON**：禁止把 `chatRepairText` 修复清单粘在 JSON 前面再回传
- **根级 SSOT**：`preDesignPack` / `characterDesign` / `designBrief` / `visualLockTable` **必须写在 Bundle 根**，禁止只塞进 `planData.*`（服务器可 SH-HOIST，但下次导出须顶层）
- **完整闭合**：输出须可 `JSON.parse`；根对象 `}` 闭合完整。截断 → `JSON_INCOMPLETE`（≠ DG-EMPTY）。大包可分片续写，但最终必须是单份可 parse 包
- **末尾自检**：顶层 `preDesignPack.shots.length≥1`；勿把 PDP 再嵌回 `planData` 当唯一源

## 下游

export JSON → `POST /api/ruleEngine/exportGate` → `exportAllowed=true` 且附 `closureSnapshot` → `POST importScript` 落库。  
禁止仅靠 `ruleAudit` / `linkageAudit` / `modalityPromptAudit` 自报通过。

若 `chatRepairText` 出现「已结构 salvage（SH-HOIST-* / SH-JSON-BRACE）」：假空集已修，**只改剩余真闸**（如 NAR-14），勿整包重写 21 镜/CD。

**配角入册（DC-16）**：`chatRepairText` 含 RH-DC-16 时，补真实 `characterDesign`（code/name/`L0.identity`，禁仅 stub）后须**再预览**直至 `exportAllowed`。详见 `preview_vs_import_guide.md` 与 `docs/image-quality-chain.md`。

**两类 stub**：① **Speaker stub**（真说话人缺册 → `ensureCdSpeakerStubs`）仍 DC-16 BLOCK，须 Chat 补 `L0.identity`。② **CHAR-ORPH**（描写动词粘连假名）由 ingest **auto_adapt 剥离**，禁止为「沈清漪紧 / 视谢玄辞」等建角色，禁止整集重设计。

**语义双轨**：形态/时长/空 prompt 种子等可在 dryRun·导入自动适配；NAR-15 / DC-16（真缺口）/ SPEAKER-BARE / CAST-ON-DESC / EMPTY-SHOT / EXPR-SPEAK / ASSET-CREF / NO-LIP-DIALOGUE **必须** Chat 写完再过严闸；NAR-14 可愈则 Orchestrator，不可愈须手改。DEX-STILL-* 为 WARN 但须在 chatRepairText 可见并回 SB 改描写；禁止「只 regen 静照」假闭环。soft_patch（mouth）**不得**代替 BLOCK 静默过。
