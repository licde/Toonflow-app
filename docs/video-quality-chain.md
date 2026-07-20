# 视频质量链与自测 cookbook

对标 [image-quality-chain.md](./image-quality-chain.md)：设计意图 → generation 四槽 → 模式方言 → 厂商包 → 检测/智能修复。

## 五层闭环

```
Layer A 设计契约
  implementationPlan (avCausality / voiceIntent / fxIntent / promptAnchors)
  → auditImplementationFieldWalk（MOD-02/03/anchors = BLOCK）
  → exportGate + chatRepair

Layer B IR 写回
  buildPromptIR ← plan + lines + visualEffect
  → applyPromptIRToShot（video/audio/fx/image + duration）
  → stub（如「中景 static, duration 2s」）不得赢过 SSOT

Layer C 模式
  sanitizeVideoPrompt（五段冲突消解）
  → applyModeDialect（text / singleImage / firstLast / multi）
  → **finalizeFiveSectionPrompt**（清 Ns/占位 Audio/Narrative cref）
  → postModeSanitize

Layer D 厂商
  bridgeShotToVendor（时长桶 snap + nativeAudio）
  → applyVendorPromptPack（Agnes/Wan/Seedance/Kling 薄方言）
  → **decideVideoQuality**（L1–L5）→ burn 或挡烧

Layer E 智能修复
  qualityGate / precheckLoop adapters
  → soft_patch（LIP 抬时长、LANG 回填、CAM 夹 static、VP-CONFLICT finalize、F0）
  → **split_shot**（超口型/F3/NAR-14 → splitHint + 挡烧 + RH）
  → 不可修 → RH + rePushPlan（burnGateEnvelope）
  → 批视频 soft_defer（单镜延后，不整批 400）
```

## 智能决策（L1–L5）

| 级 | decision | burnAllowed | nextStep | 典型触发 |
|----|----------|-------------|----------|----------|
| L1 | auto | true | burn | 占位符 → finalize |
| L2 | soft_patch | 再闸后 | soft_patch | LANG/CAM/可抬秒 LIP |
| L3 | split_shot | **false** | split_shot | lip>厂商桶、多句一口、F3、长句无 splitHint（NAR-14） |
| L4 | rePush_design | **false** | chat_repair / batch_still | F4/F5、缺材料、缺 cref/still |
| L5 | soft_defer | false（单镜） | retry_shot 或保留 split_shot | 批任务弱镜（不整批 400） |

质量优先：L3/L4 未关闭不得硬烧。机器只建议拆镜（写 `splitHint` 到 episode package + 信封），不自动改镜号以免 identity 漂移。

### 信封字段（`burnGateEnvelope` + `serializeQualityDecision`）

`decision` · `burnAllowed` · `nextStep` · `splitHint` · `rePushPlan` · `repairHints` · `reverseTriggers` · **`chatRepairText`（一键复制）**

| decision | reverse trigger | Chat 舞台 |
|----------|-----------------|-----------|
| split_shot | `pr_lip_duration` / `narrative_split_hint` / `fx_infeasible` | SB / W3 |
| rePush_design | `lang_*` / `img_cref_missing` / … | 既有 rePushPlan |
| soft_defer | 同上 | 批结果 `deferred`，可单镜重试 |

### 导入 / 制作复制闭环

1. **dryRun / exportGate**：`exportGate.chatRepairText` = BLOCK 明细 + `missingFieldSummary` + RH 话术。  
2. **importScript 400**：`ExportGateBlockError` 经 `formatExportGateBlockPayload` 带回完整清单（不再只回一行 message）。  
3. **UI**：阻断主 CTA「复制闭环修复清单」；回推按钮标明「仅跳转」。  
4. **制作 burn / identity**：失败响应含 `chatRepairText` + `repairHints`。  
5. **importHeal**：`visualEffect`/`audit.desc` → `fxPrompt` 投影（不编造）；默认 heal 含 LIP/CAM/VP。

NAR-14/15 在 **export / burn / designPhaseGates** 升为 **BLOCK**；有 `splitHint` 建议写回后仍须 Chat 确认拆镜再导出。

反推路由补齐：`cam_whitelist`→EN；`img_cref_missing` + RH-IMG-CREF。

## Untitled-3 反例（必须清掉）

脏特征：`0s-Ns`、`duration Ns`、`(dialogue/SFX filled…)`、`"---" (dialogue)`、Narrative 堆 `--cref/--sref`。  
金标：`yarn test:finalize-untitled3`。

## 拍板契约

| 项 | 规则 |
|----|------|
| 语言 | 运镜壳 EN；台词源语言进 `[Audio]` / `audioPrompt`（不英译） |
| 时长 | `max(shot, lipMin)` 写回 → 厂商向上 snap；不够则拆镜/BLOCK |
| FX | `fxLevel≠F0` 必须有散文 `fxPrompt`；禁 `F2` 字母当槽 |
| 模式 | sanitize 在 dialect 前；四模式共用 SSOT |
| Track B | 只声明类 / 从 lines·visualEffect 编译；不编造剧情与特效 |

## 智能修复矩阵

| 失败 | 自动 | 人修 |
|------|------|------|
| stub / VP-CONFLICT | IR + sanitize | 无峰值材料 → RH-MOD |
| LANG | 回填 `lines[]` | 无 lines → Chat |
| LIP-01 | 抬 `duration` | 超预算拆镜 RH-PR-09 |
| CAM-SPEAK | 夹 `[Camera]` static | — |
| FX 空→F0 | 声明 F0 | F4/F5 RH-FX |
| FX F1+ 有 visualEffect | 编译短散文 | 无材料 BLOCK |
| 厂商 mute | capability 不假绿 | — |

## 自测表

| 脚本 | 覆盖 |
|------|------|
| `yarn test:video-prompt-ir` | stub→IR 写回、峰值、中文 Audio、FX 散文 |
| `yarn test:sanitize-video-prompt` | Untitled-4 冲突消解 |
| `yarn test:video-mode-matrix` | 四模式不丢对白 |
| `yarn test:video-vendor-snap` | Kling/Seedance 时长桶、refs 方言 |
| `yarn test:video-heal-gates` | LIP/LANG/CAM/FX/burn RH 信封、softPatch 适配器齐 |
| `yarn test:finalize-untitled3` | Untitled-3 占位/cref/台词回填 |
| `yarn test:quality-decision-split` | L3/L4 挡烧与 splitHint |
| `yarn test:chat-repair-export` | 导入清单 BLOCK+missing + FX 投影 |
| `yarn test:storyboard-image-ir` | 分镜图 stub→IR+cref |
| `yarn test:shot-vendor-bridge` | bridge 字段映射 |
| `yarn test:mode-prompt-goldens` | 模式结构金标 |
| `yarn test:precheck-loop` | 环路（含新适配器） |
| `yarn audit:quality-matrix-coverage` | softPatch 不再排除 LIP/CAM-SPEAK |

## 关键文件

- [`src/ruleEngine/compilers/promptIR.ts`](../src/ruleEngine/compilers/promptIR.ts)
- [`src/ruleEngine/compilers/sanitizeVideoPrompt.ts`](../src/ruleEngine/compilers/sanitizeVideoPrompt.ts)
- [`src/ruleEngine/compilers/finalizeFiveSectionPrompt.ts`](../src/ruleEngine/compilers/finalizeFiveSectionPrompt.ts)
- [`src/ruleEngine/compilers/qualityDecision.ts`](../src/ruleEngine/compilers/qualityDecision.ts)
- [`src/ruleEngine/compilers/burnGateEnvelope.ts`](../src/ruleEngine/compilers/burnGateEnvelope.ts)
- [`src/ruleEngine/compilers/compileOrGenerateVideoPrompt.ts`](../src/ruleEngine/compilers/compileOrGenerateVideoPrompt.ts)
- [`src/ruleEngine/vendor-packs/videoVendorPack.ts`](../src/ruleEngine/vendor-packs/videoVendorPack.ts)
- adapters: `lip01` / `camSpeak` / `vpConflict` / `lang01`
