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
| shotDesign.performance.microExpression | **仅** `{eyes, mouthDetail}`；多角色用 `byName`，**禁止**名键根对象（如 `{"沈父":{…}}`） | DEX-EXPR / SH-MICRO-EXPR |
| lines[].lineId/functions/causedByActionId | 台词功能链，对齐 dialoguePlan；**plan 全部 lineId 须落 shots（DC-01）** | NAR, DC-01 |
| lines[].reactionAction | emotion_hit 必填写在 **dialoguePlan**；**禁止**单镜同时 onCam 对白+reactionAction — 须已拆双镜 | NAR-15, DEX-CAM-FIT |
| speaker 裸名 | 禁 OS/VO 后缀；禁 APP/UI 作 speaker | DEX-SPEAKER-BARE |

## 形状契约（防 SCHEMA/假绿）

- `microExpression`：**禁止** `{"角色名":{eyes,mouthDetail}}` 名键根；权威形 `{eyes,mouthDetail}` 或 `{eyes,mouthDetail,byName:{…}}`
- `sceneAvTags` / `sceneMeta[].sceneAvTags`：必须是 **string[]**，禁止逗号散文串
- `planData.narrativeBrief.seriesContinuity`：必须是 **record** `{ep1Summary, carryInfoIds?}`，禁止整段散文 string
- **DEX-CAM-FIT 硬约束（Chat 必须写对）**：
  - `dialoguePlan.lines[].reactionAction` **可以且应当**存在（NAR-15）
  - **禁止**单条 `shots[]` 同时具备：出镜对白 + `lines[].reactionAction`（或 VD 含「开口/说道…反应/愣/侧目」）
  - 权威形 = **两镜**：speak（口播、**无** reactionAction）+ reaction（无口播或仅 OS；VD≥minChars）
  - **禁止**占位 VD「听者反应特写」
  - **反例**：一镜 `dialogue.lines[{text, reactionAction}]` + VD「开口道完，听者反应」→ 不合规
  - **正例**：镜A 说话近景（仅 text）；镜B 听者反应特写（无 onCam 台词）；plan 行仍可有 reactionAction

## 出站硬闸（SB）

- `runDesignExitGate(SB)`：**必须**过闸再 `setStepStatus` 完成；禁止自检假绿跳过
- **setStepStatus ≡ exportGate**：默认 **diagnose-only**（写 `meta.expandProvenance.mode=diagnose_only`）；高置信可拍债可压力智拆（带 cap）；显式 `forceExpand:true` 才满额 apply IRD/cam/oneBeat；扩后必 slot heal；高置信 auto-close 含 **可抬短镜抬时**（LIP/DFW 同靶+vendor snap），**不**静默同文唇拆；超 vendor/多句须 Confirm 语义拆后重跑 designExit
- 失败时：服务器会先高置信 auto-close（**LIP 抬时** / NAR-15 占位 RA / DC-01 mirror / 噪声 EXTRA / peak→shotDesignIntent / 唯一名→charCodes；有定妆图写 assetCrefPlan，无图则 stub+deferredStill）；仍红则按失败清单 **同轮重写 shots/JSON**，禁止只改 `passed`/自报绿
- **LIP**：可抬→设计退出前抬净；导入 raise 仅兜底；禁 DFW「导入可愈」与超限 LIP 互斥谎称；`importOk≠designExitPass`
- 不发明定妆 URL / 假 `--cref`；**无定妆图**时可设计期 **stub+assetCrefPlan 延期**（配角后期 AS 智能补图）；生成/compose 仍须真图
- 出脸镜须 `charCodes` 或可派生 speaker 入册；`DEX-ASSET-CREF` 在 SB 认 stub 绑，AS 要 imaged
- **导入**：已有 `preDesignPack.shots` 时 **智拆=可拍+因果连续**（非禁智拆）；高置信可拍债可压力扩，超 cap/低置信→Confirm；`forceExpand` 显式扩；扩后必 continuity+egress（`importDesignSlotHeal`）；`skipAutoDesignSb`=仅跳空包 LLM；dryRun 回显 expandDelta/continuity/heal/rePush；展示 postHeal 与非法同文占比
- **一镜一画面（语义强制）**：连续≥3 归一化同文 VD（**有对白也算**）→ `DEX-DUP-VD` BLOCK；禁止「同文口型复用」当设计；超 vendor/多句 → Confirm 语义拆（子镜须景别/运镜/`intent.picture` 相对父镜可区分）或改短，**禁止**指望导入静默拆成同文 N 镜
- **DEX-DUP-VD / DEX-DIRTY-STILL-PROMPT / DEX-HAND-LIP**：同文连镜、手+眼同帧、文学体裸 `--cref CHAR`/`--sref SCENE`、手镜 lip≠none → BLOCK；composed prompt **尾** IR 码除外
- **配方智能适配（≠改设计）**：分镜 VD/景别/intent 是 SSOT；compose 按镜型适配（手 CU **仅**显式手部特写；座次/中景/权力反差 **压过** 摩挲扳指动作，禁手CU禁出脸对撞）；**特写×出镜≥2**：VD 只点名一人 → **降出场人数+裁主角 cref**（禁拆镜 Confirm）；VD 多人同框意图 → `still_cu_cast` 智能拆；成稿泄漏「仅N人」同核；禁【Edit焦点】文学洗绿；Edit 反拼版用短锁（`*_EDIT_ZH`），接触几何/主look优先于拼版句；文学意图原子（端坐太师椅/抄书等）须在 compose/首烧/Edit 存活；**禁止**把配方句回写 `visualDescription`。真脏手+脸 → Chat BLOCK + VisBeat Confirm 拆；导入与设计 **同核智能拆/降人数**（非仅软过）；残留才 `importOk≠designExitPass` / Confirm，禁静默同文拆手脸
- **PROMPT-FIDELITY / 文学存活**：座次/锚点未覆盖 = 契约债 → heal 双写 VD+egress untilClear（可拍）；不过绿≠挡拍；Edit 焦点只追加，禁掏空文学基底
- **`importOk≠designExitPass`**：导入可进仓 ≠ 设计闭合；仓债写入 EpisodePackage.warehouseDebt；placement-only **禁**假置 `importSplitExpanded`；禁止只改 `modalityPromptAudit` / `narrativeSelfcheck.passed`
- composeStillPromptPreview `persist:true` 写库用 `result.composeMode`（禁裸变量 `mode` → `mode is not defined`）
- VLM 缺 Key：图已出、HQ 未过（≠ preview HTTP 400）
- DC-01（缺覆盖）、**DC-01-EXTRA（乱入）**；时长噪点如「：3s」属伪台词，导入会剥离，勿当文学台词修
- **Audio XOR + PromptFidelity**：有词无声 BLOCK；无词有声 strip；禁 trim 多拍假绿；VD/对白变须重编译（`VIDEO-PROMPT-STALE`）
- **RA×CAM 双轨**：`emotion_hit` 的 RA 写在 **dialoguePlan**；镜侧权威=说话镜+反应镜；禁单镜 onCam+RA
- **质量同核（BLOCK）**：DEX-QP-02、DEX-LIT-CONTACT-XOR、DEX-LIT-CONTACT、DEX-LIT-ANCHOR、DEX-PROP-CONT、DEX-CAST-ON-DESC、DEX-EMPTY-SHOT-CONSISTENCY、DEX-EXPR-SPEAK、**DEX-ASSET-CREF**、**DEX-SHOT-INTENT**
- **文学细节**：缺接触/空间落点 → `hand_edit_vd`（stillIntentOps）；导入 WARN、SB BLOCK；禁 compose 发明落点
- **视频设计债**：伪台词/错 lip/空 Motion/beat 灌水/运镜越权 → `videoIntentOps`（DEX-VID-*）；导入/touch 同核 until-clear；禁 demote 假绿；`designExitPass≠videoPromptReady`
- **残句**：A 拆后仍 NAR-14 → 须重设计/显式 splitHint/`Confirm B`；导入 ingest **禁**静默 residual B / 同文唇拆（标 `lipConfirmRequired`）
- 拆行后须 `confirm_design_split` / Orchestrator（mirror+补缺 lineId），禁止只写 hint
- VisBeat 与 Orchestrator：先 expanders，再 clause-split，再残句 B（禁双拆打架）
- 修后强制 `forwardReentry`（防二次 DC-01/时长/NAR-15）
- 空镜描写禁止再叠正脸/权力位（compose egress 同核）；有脸须 CHAR + assetCrefPlan/定妆
- 分镜表列：镜/类型/场景/**画面描写/景别/表演**/台词/时长（parser 往返保留描写）
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
5. **CastingSheet**：身份以 CD/`charCodes`/`--cref` 为准；描写点名**智能绑定**既有 CD/资产（唯一命中补码；歧义拒绑；无资产 stub+保留名）。**禁剥名**；`visualDescription` **禁止当作自由 NER 造名源**（见 `docs/PRODUCTION_PILLARS.md`）
6. **静帧 Identity（DEX-STILL-*）**：一镜一可静帧拍；人名裸名禁`（OS）`；禁「对白瞬间神态」填料；多拍 → **DEX-STILL-ONEBEAT BLOCK**（智能拆或 Confirm）；**特写×多人 → DEX-STILL-CU-CAST BLOCK**（反应特写+场面镜；导入不硬拦）
7. 出口前人工核对台词数 ≥ 剧本可枚举句数
8. **口型闸**：仅出镜对白强制 lip；`type:os|vo` 可 no lip；空 `lipSyncPolicy` ≠ silent 假阳

### speaker 正反例（DEX-SPEAKER-BARE）

- **正例**：`{ "speaker": "沈清漪", "type": "os", "text": "……" }`
- **反例（禁止）**：`{ "speaker": "沈清漪（OS）", "text": "……" }` — 导入会剥 OS，但 Chat 不得依赖 salvage；生产闸会把「名（OS）」当第二张脸

### visualDescription 正反例（DEX-STILL-ONEBEAT · **BLOCK**；DEX-QP-02 / QP-02 · BLOCK）

- **正例（一镜一拍）**：`{ "visualDescription": "中景。沈清漪咬帕止血，眉心微蹙。" }`（单拍、裸名、可拍≥minChars）
- **反例（多拍）**：一镜堆刺入+包扎+露出匕首+浅笑 → `DEX-STILL-ONEBEAT`（**BLOCK**）
- **正例（簪刺标准三镜 · 契约金样）**：
  1. `大特写。银簪尖端刺入锁骨下方皮肉，暗红色血珠自簪尖渗出。` · tags `prop_insert,reveal`
  2. `特写。沈清漪唇边勾起一抹浅笑，眼神决绝。` · tags `reaction,face_cu`
  3. `近景。梳妆台下方露出一柄匕首的冷光。` · tags `reveal,prop_insert`
  - VO/画外音进 AUD，**不**进 visualDescription
  - 金样：`data/fixtures/golden/still-onebeat-zan-ci.json`；高置信 exit **auto apply** splitPlan；低置信 Confirm
- **正例（跪地拔剑 · 题材扩样）**：①`特写。少年跪地落泪，目光决绝。` ②`近景。少年拔剑起身，剑尖指向对方。` · 金样 `still-onebeat-kneel-sword.json`
- **反例**：`沈清漪（OS）对白瞬间神态` → `DEX-STILL-OS-NAME` + `DEX-STILL-FILLER`
- **反例**：7 字空壳 / 纯「很美很有氛围」→ `DEX-QP-02` / `QP-02`（minChars 仅防空壳；正式标准=可拍物象）
- **反例**：`空镜无人物。沈清漪正脸特写` → `DEX-EMPTY-SHOT-CONSISTENCY`
- **反例**：描写写「沈清漪」但 `charCodes: []` → `DEX-CAST-ON-DESC`（唯一 CD 可智能绑；歧义拒绑保留名）
- **正例（无图）**：点名保留「沈清漪」进 characters；**禁假 --cref**；有定妆图再挂 cref
- **反例**：有脸/CHAR 无本镜绑且无法 stub 入册 → `DEX-ASSET-CREF`（深链 AS）；仅 stub 无真图时 **AS/compose** 仍 BLOCK
- 首帧反推分流：
  - `still_firstframe_dirty` → 假双脸/多拍：**智能拆镜**（优先）或改单拍描写 → stale → MD-IMG；**禁止只 regen**
  - `still_firstframe_stale` → 描写已变：改 VD 后重出 HQ
  - `still_firstframe_weak` → 弱静照/缺 visualPass：`batch_still` 重出（勿先逼改 VD）
  - **可拍优先（Chat≡Web CTA）**：finding=契约债→反推+untilClear 治愈至可拍 HQ；**永不灰「生成/烧片」**；CTA=`智拆并生成`/`增强锚点并生成`/`补定妆并继续生成`；`PROMPT-FIDELITY` 同源补锚双写 VD；`forbidRegen`≡建议治愈非门闩。工具：`resolve_still_cta`
  - `dirty_still_prompt` → 真手+脸同帧：改 VD / VisBeat 拆；非 seating+扳指动作误脏
  - 视频污染壳（XML 索要 / 跨镜 PEAK / EN QF）→ sanitize 后重编译本镜
- 描写过短反推：`qp02_visual_short` → SB 重写 `visualDescription`；导入不发明占位

### 智能拆 · Chat/exit 矩阵

| 模式 | Chat | 服务器 |
|------|------|--------|
| auto+高置信 | 展示已拆 N 镜；可 undo/override | exit apply still_onebeat + sync |
| auto+低置信 | RH 出 splitPlan，须 Confirm | 不 auto |
| chatStrict | 仅 propose；完成步前 Confirm | 未 apply → BLOCK |

## 每镜必填 visualDescription

| 字段 | 说明 |
|------|------|
| visualDescription | 画面主体与动作（供 EN subject / MD-IMG）；**一镜一拍、裸名**；须可拍五元组（见下） |

### 可拍原子（DEX-LIT-CONTACT-XOR / DEX-LIT-CONTACT / DEX-LIT-ANCHOR / DEX-LIT-EXPR）

大体构图够但描写稀疏 → 静帧漂移。VD 尽量声明：

1. **who** 主体裸名  
2. **action** 已声明动词（禁运行时发明）  
3. **prop** 关键道具  
4. **contactLocus** 接触落点（颊/唇/指尖…）— 脸特写+道具、渗血/咬唇、拭泪必备  
5. **spatialOrGrip / groundLocus** 握持或地面锚（手持/地上/脚边…）— 捡拾/持握/递接/抛落必备  
6. **contactRoleXor** 颊触与口创同镜须互斥句或拆（`纸未入口`/`另镜`）— **≠ audio_xor**  
7. **woundVisible / propReadable**（增强白名单）触面浅痕可见度、纸面可辨 — 不发明剧情  

**朝向 ≠ 锚点**：`侧脸/正面` 不能顶替 `地上/脚边`（防捡书假绿）。

| 衍生类 | 缺什么会漂 | 闸 |
|--------|------------|-----|
| 颊触+口创同镜 | 互斥句或拆镜 | DEX-LIT-CONTACT-XOR |
| 脸特写+道具 | 接触落点/接触动词 | DEX-LIT-CONTACT |
| 捡拾/俯身 | 地面/脚边/手触 | DEX-LIT-ANCHOR |
| 递接/抛落 | 交接或落点 | DEX-LIT-ANCHOR |
| 微创/撕拭 | 部位或道具对象 | DEX-LIT-CONTACT |
| 特写强表情 | 眉/眼/唇 | DEX-LIT-EXPR (WARN) |
| 泼洒倾倒 | 脸上/身上/地上等承受点 | DEX-LIT-ANCHOR |
| 抱拽按掐 | 腕/袖/肩/喉等接触 | DEX-LIT-CONTACT |
| 书写/抄书 | 案上/纸上或笔纸物象 | DEX-LIT-ANCHOR (WARN) |
| 推门/开门 | 门边/门外/门口 | DEX-LIT-ANCHOR (WARN) |
| 邻镜道具链 | 消失/瞬变/空降须交待 | DEX-PROP-CONT |
| 多定妆参考 | 服饰混色 | compose `primaryLookLock`（点名主 look）；VD 勿混写他角色衣装 |

**结构优先**：句式落点（划过X / 从Y / 手持…）为主闸，词表仅 boost。缺槽 → IRD `confirm_enhance` / `hand_edit_vd` / `confirm_split`；可选 `stillIntentOps.suggestFill/applyEnhance`（flag+Confirm/autoMin+复检）。导入可结构软填+demote（`importOk≠designExitPass`）。  
**可增强**（主体已有）：落点/XOR 互斥句/划过→浅痕可见/纸可读/表情落点。  
**漂移硬禁**：换主体、新角色、否定核心动作、`literaryLocked` 无 force。  
**禁只 regen 顶替改 VD**。 VisBeat 只管多拍拆镜，不管文学增强 CTA。

## 执行步骤

1. 按 scriptPlan 分场拆镜
2. 为每句台词创建 shot，填入 dialogue.lines
3. 标 shotSize + emotionIntensity + duration + rhythmZone
4. 为每镜填 **visualDescription**（必填）
5. 标 shotSize + emotionIntensity + duration + rhythmZone
6. 为信息镜填 markers；标 **string** spatialRelation（按上式从 B13 压串）
7. 写入 **Bundle 根** `preDesignPack.shots[]`（禁止只写 `planData.preDesignPack`）
8. 导出前自检：JSON 可 parse、根 `}` 闭合、顶层 shots≥1；script↔dialoguePlan↔shot `lineId`/原文同文（标点差 → DC-01 / RH-QP-03）

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
