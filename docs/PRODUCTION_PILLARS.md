# Production Pillars — 制片三柱纪律（SSOT）

行业规范落地入口。改身份 / 时长 / 表情 / 成片记分前先读本文。

## 三柱

| 柱 | 行业纪律 | 仓库 SSOT |
|----|----------|-----------|
| **Identity** | Casting sheet + 定妆参考 | `characterDesign.assets` + `charCodes` + `--cref CHAR-*`；描写禁止造名 |
| **Duration** | Audio-ready：镜长 ≥ 口型预算 | `duration_norms.json` ↔ `resolveRequiredDuration` + NAR-14；`meta.pillarsDurationV2` 迁移开关 |
| **Expression** | 表演与身份分离 | `shotDesign.performance.microExpression` + `lipSyncPolicy`；禁止合成万能嘴型 |
| **Umbrella** | 成片质量记分 | `short_video_quality_scorecard` → 烧片 `scoreShortVideo`（≠ 设计时 `adaptScorecard`） |

## 实践完备梯（规范↔逻辑对齐）

通用规范类须六阶齐：Declare → Mount → Hard → UntilClear → FE-block → NoEscape。登记见 `practice_completeness_inventory.json`；质量态见 `quality_state_matrix.json`；CI：`yarn test:practice-completeness`。

**Key 可选**：无 Key/无 adapter → 仅 L0 + 像素维 `unmeasured`，禁伪装 `hq_ok`/`videoPass`，文案非「必须配置 Key」；有 Key → 声明的 L1 must 必须跑。

## 铁律

1. **有正式源才进 prompt**（CD / lip 预算 / performance 字段）
2. **描写只匹配，不发明**（禁止 NER 造角色）
3. **双闸**：`designExitGate`（设计）≠ `exportGate` / LIP-01 / scorecard（成片）
4. **双轨**：must-edit vs auto-adapt（见 `semantic_gate_dual_track_matrix.json`）
5. **金标矩阵**：每柱对等用例，禁止只修个案
6. **一镜一拍**：多拍 `visualDescription` → `DEX-STILL-ONEBEAT` BLOCK；高置信 `expandStillOneBeat` / splitPlan 回写；禁 trim 假绿与只 regen
7. **视频纯中文壳**：`finalizeFiveSectionPrompt` + compilers 主词中文；EN 运镜仅 vendor adapter 别名
8. **主强设计 · 有界愈 · 遗失强补充**：`ShotChainContract`（`shotChainContract.ts`）统摄 exit/import/compose/burn；执行层可 auto_adapt；设计遗失仅正式源 salvage，否则 `DESIGN-LOSS` 回 SB（`designLossSupplement.ts`）
9. **时长单源只升不降**：`resolveShotDurationSec`；`DUR-DESYNC` 禁烧片短于设计秒
10. **运镜双轨**：白名单/对白猛推夹 static；一镜多互斥运镜 → 智能拆（`camShootableFit.ts`）
11. **音画×景别联动**（`audioShotLinkage.ts`）：一镜一主声源；口播+反应同镜须拆；OS/独白可压反应/特写（无口型）；音效随主拍不单拆；禁 soft 顶须拆
12. **IRD 智能反推设计**（`stillIntentReverse.ts` + `stillIntentOps`）：失败→可应用补丁→auto/Confirm→**再 designExit**；导入默认设计层愈；hygiene≠still_ok；`irdProvenance` 防假绿
13. **霜兰令导入加固**：`SH-SERIES-CONT`/`SH-SCENE-AV-TAGS`/`SH-MICRO-EXPR` 前置 salvage；拆后 `reindexDerivedTables`；`importOk≠designExitPass`；CI `yarn test:frost-import-hardening`
14. **拆镜愈完仍绿**：禁「听者反应特写」等短占位；子镜继承父锚点消 CHAIN-BEAT；export 路径 duration raise-only；尾清单可剥；RH 区分自愈自伤
15. **Audio XOR + PromptFidelity（台词↔语音 / 提示词↔设计）**：
    - **M1** 乱入：`DC-01-EXTRA`（shot 有、plan/script 无）BLOCK
    - **M2** 有词无声：对白镜缺 `audioPrompt` → `CHAT-AUD-01` **BLOCK**（可先 auto seed）
    - **M3** 无词有声：设计确认静音（`dialogueLines: []`）→ `AUD-ORPHAN-SPEECH` strip；未传 lines 可保留嵌入 CJK
    - **M4** 出镜对白禁 `none/silent` / `no lip sync` → `NO-LIP-DIALOGUE`
    - **M5** 提示词须覆盖 VD 锚点 → `PROMPT-FIDELITY`（契约债→heal 双写 untilClear；**永不挡试拍/烧片**；draft≠hq_ok）
    - **M6** 多拍拒出站 → `DEX-STILL-ONEBEAT` / `split_shot`；禁 `trimToOneBeat` 假绿
    - **M7** VD/对白 `designContentHash` 漂移 → `VIDEO-PROMPT-STALE`；须重编译再烧
    - CI：`yarn test:dialogue-audio-loop` · `yarn test:prompt-fidelity-loop`

## 音画 × 反应/特写（怎么拆 vs 怎么愈）

| 声源 | 推荐景别 | 默认同镜？ | 处置 |
|------|----------|------------|------|
| **出镜对白** | CU/MS + static + lip | 单拍可同镜 | 猛推 → `cam_heal` 夹 static；口型超长 → 时长升或 `DEX-LIP-SPLIT` |
| **口播 + 听者反应同 VD** | 说话镜 + 反应镜 | **须拆** | `must_split` / `reaction_shot`；禁 trim 假绿 |
| **对白对比 / AB** | 双方各一拍 | **须拆** | VisBeat / still_onebeat |
| **OS / VO / 独白** | ECU/反应/过肩 | **可同镜** | 无 lip；`audioPrompt` seed；VD 禁张嘴说话 |
| **音效 / 环境** | 随主视觉 | 可同镜 | 不单拆；无 adapter → `SFX-UNBACKED`≠满分 |

**直接答案：** 可拍优先靠「一镜一拍 + 一镜一主声源」。该拆就拆（说话↔反应、对比 AB、互斥运镜）；OS/独白+反应/特写用**同镜无口型**比硬拆更好；音效不另开镜。

## 柱归属（闸）

| 柱 | 设计闸 | 成片闸 | Auto-adapt 例 | Must-edit 例 |
|----|--------|--------|---------------|--------------|
| Identity | DEX-CAST-CODES, DC-16, DEX-STILL-ONEBEAT | IMG-CREF-CHAR, still_firstframe_dirty | OS speaker 归一；高置信智能拆 | 缺 CD / 假名无法映射；低置信多拍 Confirm |
| Duration | NAR-14/15, DEX-LIP-SPLIT, DUR-DESYNC | LIP-01 | 物理分句、silent raise；子镜 durationTiers | 无标点超长、缺 reaction、时长降档 |
| Expression | GEN-01 | stillMouthVideoHandoff | emotionNorm 默认带出；拆后 micro 切片 | 高强度 speak 缺 performance |
| Chain | DESIGN-LOSS, CHAIN-BEAT, PROMPT-FIDELITY, DEX-CAM-FIT, DEX-INTENT-PIC, IRD-CONFIRM | assertChainEgress burn | CAM-SPEAK clamp；audio seed；IRD 高置信 auto | 遗失无源；须拆运镜；锚点未覆盖；低置信 Confirm |

## 禁止清单

- 从 `visualDescription` regex 发明角色名（如「沈清漪咬帕」→「沈清漪咬」）
- `NAME:` 无 CHAR code 当作第二张脸硬拦却不给 RH-DC-16
- 用 `referenceUrlCount>=2`（角色+场景 URL）写「严格锁定多参考身份」——场景 URL 不是第二张脸
- 通用「嘴部自然微张」覆盖已有 `mouthDetail` / 描写嘴部动作
- 设计 `adaptScorecard` 与成片 `scoreShortVideo` 混用假绿
- 脏静照静默作为视频首帧（须可反推重出静照）
- 拆镜后按 storyboard **index** 继承父镜 `filePath`（须 clientId / banIndexMedia）
- Audio 占位 `"1."` / `No spoken dialogue` 与出镜对白并存假绿
- 无设计对白却保留口播 / `lip-sync active` 当可烧（须 `AUD-ORPHAN-SPEECH` 或 BLOCK）
- 设计/对白已变仍用旧 `videoPrompt` 烧片（须 `VIDEO-PROMPT-STALE`）
- 多拍 VD `trimToOneBeat` 当 compose 成功出站
- freeform 视频词跳过 VD 锚点覆盖仍当 PASS

## 迁移

- `meta.pillarsDurationV2: true` 或新包默认启用 `duration_norms` cps=4.5；历史包未开旗保持旧 speechSpeed=4，避免全量抬时长。
- `meta.pillarsStillOneBeatMigrate` / VisBeat `enforce`：存量多拍可走 `migrateMultiBeatStockShots`（exit/import/rePush SB 同核）。

## FE / Agent

- 出站：`POST` designExitGate / `setStepStatus` 已返回 `designExitGate`（含 `splitApplied` / `splitLog`）
- 反推：`reverse_route_table.json` trigger → RH 模板 → Chat 站；`still_firstframe_dirty` fork 含「智能拆镜」
- 拆镜 ops：`/api/scriptAgent/designSplitOps` + `visBeatOps`；`executeRePushPlan` 可跑 SB 迁移钩子

## 相关代码

- Identity: `castingSheet.ts`, `stillIdentityCoverage.ts`, `hydrateComposeStillContext.ts`
- Identity 配方子 SSOT: `still_recipe_policy.json` ↔ `stillRecipePolicy.ts`（`pickIdentityLockLines` / `healStillRecipePolicy`）；多参考文案**仅**按 `CHAR-*` 数，禁止用 `referenceUrlCount`；扩规则改 JSON 的 `egressForbiddenPatterns`，compose 与 `stillPromptPipeline` 双挂自愈，`reason.recipeHeals` 可反推
- VisBeat 拍点 SSOT: `visual_beat_vocab.json` ↔ `visualBeatPolicy.ts`（L0 tags×景别矩阵）；Suggestor 只提案；`pillarsVisBeatV2`: off|shadow|enforce；DEX-VIS-* 见 design_exit_checklist
- VisBeat 闭环: `expanderRegistry`（weapon→**still_onebeat**→visual→cluster）+ `/api/scriptAgent/visBeatOps` + `test:visual-beat-loop`；FE 契约见 `docs/toonflow-web/VISBEAT_OPS_CONTRACT.md`
- Still one-beat: `expandStillOneBeat.ts` + golden `still-onebeat-zan-ci.json` / `still-onebeat-kneel-sword.json`；CI `yarn test:still-onebeat-loop`
- **IRD**: `stillIntentReverse.ts` + `/api/scriptAgent/stillIntentOps`；契约 `docs/toonflow-web/STILL_INTENT_OPS_CONTRACT.md`；CI `yarn test:still-intent-ird`；visBeat confirmExpand 委托 IRD
- VisBeat RH/晋升: `docs/VISBEAT_RH_AND_PROMOTE.md`；CI `yarn test:visual-beat`
- Duration: `duration_norms.json`, `resolveRequiredDuration.ts`, `dialogueMetrics.ts`
- Expression: `emotionNorm.ts`, `composeStillPrompt.ts`, `videoNativeCompiler.ts`, `stillMouthVideoHandoff.ts`；拆后 `recomposeAfterSplit.ts`
- Scorecard: `shortVideoQuality.ts`
- Still→video quality doctrine: `still_video_quality_doctrine.json` ↔ `src/ruleEngine/quality/*`（谓词单核、L2 healShotQuality 置信/回验、collectPostBurnFlags、failDimRouter）；`unknown≠0.7`；CI `yarn test:still-video-quality-loop`
- Language: `docs/LANGUAGE_MODALITY_POLICY.md`；egress `finalizeFiveSectionPrompt`
- Dialogue↔Audio / PromptFidelity: `dialogueCoverage.ts`, `sanitizeVideoPrompt.ts`, `assertPromptDesignFidelity.ts`, `shotChainContract.ts`（`designContentHash` / `VIDEO-PROMPT-STALE`）；CI `yarn test:dialogue-audio-loop` · `yarn test:prompt-fidelity-loop`

