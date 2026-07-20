# 02 — SelfHeal 自愈与 FE 自集成

包内导航：[README](./README.md) · [导入测试](./01-import-automation-tests.md)

## 1. 架构

```text
detect → classify → route → apply → revalidate → retryGen
```

| 段 | 实现 | 说明 |
|----|------|------|
| detect | dryRun issues / identity gaps / GC / polish 错误文案 | 统一进 `runSelfHeal` 输入 |
| classify | `classifyGenerationFailure` | 得到 ruleId / category |
| route | `buildRePushPlan(TRIGGERS)` | **永不传** `SB`/`EN` 等层名 |
| apply | `patchApplicator` / StillRunner | confidence≥0.8 才自动写 |
| revalidate | 调用方再跑 gate / dryRun | orchestrator 返回 `retrySuggested` |
| retryGen | 生产路径建议人工或下一轮 API | 默认不自动烧厂商费 |

模块（相对仓库根）：

- `src/ruleEngine/design/selfHealOrchestrator.ts` — `runSelfHeal`
- `src/ruleEngine/design/patchApplicator.ts` — duration / generate_audio / imageAppend…
- `src/ruleEngine/design/assetStillRunner.ts` — `runAssetStillQueue`
- `src/ruleEngine/design/rePushRunner.ts` — `executeRePushPlan`
- `src/routes/ruleEngine/selfHeal.ts` — HTTP
- SSOT：`data/fixtures/reverse_route_table.json`（含 `orphan_stub_no_image` / `polish_failed` / `media_probe_mute`）
- 补丁目录：`src/ruleEngine/validators/autoFix.ts`（`AUTO_FIX`）

`decide.mode`：`infra_retry` | `soft_patch` | `still_queue` | `human` | `ok`。

## 1.1 PrecheckLoop（预检自愈，与 SelfHeal 并列）

DC/预检证据与台词覆盖等走独立可移植环，见 [`docs/precheck-loop`](../precheck-loop/README.md)。

| 项 | 说明 |
|----|------|
| API | `POST /api/ruleEngine/precheckLoop`（`apply` 可选；响应含 `findings[].evidence`） |
| 门禁 | `yarn test:precheck-loop` |
| FE | 预检 BLOCK 时读 `precheckLoop.findings` / `repairHint`；一键修后再触达；**单次解包**与 SelfHeal 相同 |
| 与 SelfHeal | SelfHeal 偏生成失败/静照；PrecheckLoop 偏 closure diagnose→verify；二者勿混用路由表 |

## 2. HTTP API

`POST /api/ruleEngine/selfHeal`

**Request（主要字段）**

```json
{
  "projectId": 1,
  "scriptId": 2,
  "shotId": 10,
  "errorText": "optional vendor error",
  "category": "optional",
  "jobKind": "video",
  "round": 1,
  "dryRun": false,
  "apply": true,
  "identityGaps": [{ "code": "SCENE-001", "reason": "stub_quality", "kind": "SCENE" }],
  "issues": [{
    "ruleId": "PR-09",
    "autoFix": { "confidence": 0.9, "patch": { "duration": 5 } }
  }]
}
```

| 字段 | 默认行为 |
|------|----------|
| `dryRun: true` | 不跑 StillRunner DB 写、不算生产 apply（显式 true 才 dry） |
| `dryRun` 省略 / false | 可跑 StillRunner（需 db） |
| `apply: true` | `soft_patch` 时写回 EpisodePackage shot |

**Response（计费 / 可观测）**

| 字段 | 含义 |
|------|------|
| `healRound` | 当前轮次 |
| `patchesApplied` | 已应用补丁键 |
| `exhausted` | 是否触达 maxRounds（表内默认 3） |
| `mode` / `message` | 决策结果 |
| `stillQueue` / `stillRunner` | 缺静照队列与准备结果 |
| `skipped` | 只读告知：如 `derivatives` / `audioGap`（**永不伪造 L6 衍生**） |
| `nextQueue` / `nextStep` | 重闸后队列；`batch_still`=资产已建请批量生图（不代打 Agnes） |
| `retrySuggested` | 建议调用方再生成 |
| `autoApplicable` | 是否可自动；false 则交 FE 跳舞台 |
| `rePushPlan` | 阶段计划（triggers 解析） |
| `appliedToDb` | 是否已写入 package |

与 `POST /api/ruleEngine/applyAutoFix`：autofix 偏 dryRun 问题列表写字段；selfHeal 做编排 + 静照准备 + 失败路径一轮。

**禁止：** `buildRePushPlan(fix.rePushTargets)` 把层名当 trigger（已改为优先 `fix.applied` ruleIds）。

### FE 解包陷阱（必读）

Axios 拦截器已返回 `{ code, data, message }` 信封。`Toonflow-web/src/utils/ruleEngine.ts` 必须 **只取一次** `envelope.data`（经 `postData`）。若写成 `const { data } = await axios.post(...); return data.data`，则 `selfHeal` 业务体为 `undefined`，UI 读 `healRound` 崩溃，而 Network 仍显示 200。

### 自愈能力白名单

| 可点修 | 仅告知（不伪造） |
|--------|------------------|
| 场景 describe / SCENE 补码 | 无 `L6.stateVariants` 的衍生（`arcVisual_only_no_stateVariants`） |
| 主 CHAR/SCENE seed + digit↔slug | 导入恒 `audioGap` |
| 静照队列准备（不默认真打 Agnes） | 双 cref不全、旁白无完整 CD |

## 3. 生产路径自动 heal

| 路径 | 行为 |
|------|------|
| `generateVideo` 身份缺口 | 调 `runSelfHeal` 一轮；响应带 `heal` / `stillRunner` |
| `generateVideo` catch | `errorReason` JSON 含 `healRound` / `patchesApplied` / `retrySuggested` |
| `checkVideoStateList` 成功但 GC-07 mute | `healHint` + `media_probe_mute` |
| INFRA / 429 / TLS | `mode: infra_retry`，**不改 prompt**，只退避 |

INFRA 与 `vendor_passthrough` 不走 soft_patch。

## 4. FE 自集成

| 项 | 位置 |
|----|------|
| 一键自愈按钮 | `Toonflow-web/.../ShotSpecDrawer.vue` |
| 客户端 | `Toonflow-web/src/utils/ruleEngine.ts` → `selfHeal()` |
| 对照台 | `getShotSpecDiff` + `missingAssetImageQueue` |
| 伺服真源 | 宿主 `data/web`（非 `data/web_new`） |

集成命令：

```bash
# 在 Toonflow-app 根
RUN_WEB_INTEGRATE=1 yarn build:integrate
# 等价：构建 sibling Toonflow-web build:fast:lite 并 copy → data/web

yarn test:fe-integration-contract
```

未设 `RUN_WEB_INTEGRATE=1` 时，`build:integrate` 只做门禁检查，不重编 FE。

## 5. StillRunner（控计费）

`runAssetStillQueue(db, projectId, queue)`：

- 按 `assetCode:` 解析资产  
- 去掉 `orphanStub:1`  
- 替换 `stub for …` 为可润色环境描述  
- 返回 `assetIds` 供 **人工 / 批量** `batchGenerateImageAssets`  

**默认不自动调用 Agnes 生图**，避免静默扣费；编排只「准备」队列。

## 6. 扩展 trigger

1. 在 `data/fixtures/reverse_route_table.json` 增加 `trigger` + `reverseTarget` + `forwardStages`。  
2. 在 `AUTO_FIX` 增加同名 ruleId，且生产 issue 挂 `autoFix.confidence >= 0.8` + `patch`。  
3. 若需新 decide 分支，只改 `selfHealOrchestrator.ts`（禁止第二张路由表）。  
4. 补 `scripts/test-self-heal-orchestrator.ts` 或专题测，并挂 `test-closure-suite.ts`。

已知本包 trigger：`orphan_stub_no_image`、`polish_failed`、`media_probe_mute`（以及既有 `img_cref_missing` 等）。

## 7. 人手验收（8 条）

1. 注入 / 导入 stub SCENE → heal → stub 清除或静照入队 → gate 可过。  
2. polish 返回 `text` → DB 有 prompt；仅 `_output` 不得标「已完成」。  
3. 对白视频成功但 mute（GC-07）→ heal 打 `generate_audio` 提示 / soft_patch。  
4. identity 无 `filePath` → StillRunner → 再 gate。  
5. dryRun 带 PR-09 时长 autoFix → apply 后字段写入。  
6. `buildRePushPlan` 不把 `SB` 当有效业务 trigger。  
7. maxRounds 耗尽 → `exhausted`，无死循环。  
8. `yarn test:self-heal-orchestrator` + `yarn test:asset-still-runner` + 导入子集（见 [01](./01-import-automation-tests.md) §8）通过。

## 8. 推荐命令

```bash
yarn test:self-heal-orchestrator
yarn test:asset-still-runner
yarn test:identity-asset-gate
yarn test:fe-integration-contract
```
