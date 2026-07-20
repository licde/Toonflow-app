# 01 — 导入自动化测试

包内导航：[README](./README.md) · [自愈集成](./02-selfheal-integration.md)

## 1. 目的与假绿定义

宣称「导入 / 闭环通过」必须同时满足：

| 层 | 含义 | 假绿典型 |
|----|------|----------|
| 结构绿 | normalize / prompt 金样字符串存在 | 有 `--sref` 但库里是 `stub for SCENE-00x` |
| 资产可生 | `o_assets` 名≠码、非 stub prompt、道具/配角已 seed | hydration 行数绿、静照无法画 |
| 单批同口径 | `generateVideo` ≡ `batchGenerateVideo`（identity + bridge） | 单镜闸住、批量绕过 |
| 导入红灯可见 | `ImportResult.assetQuality`；`stubCount>0` 阻断 | HTTP 200 但废卡进工作台 |

**公式：** 闭环绿 = 结构绿 ∧ 资产质量绿 ∧ 单镜≡批量 ∧ identity 可测 ∧ 导入红灯可见。

## 2. 命令速查

在仓库根执行（`Toonflow-app`）：

| 命令 | DB | 断言重点 |
|------|----|----------|
| `yarn test:import-fidelity-normalize` | 否 | sceneName→SCENE-*、sref、FX/voice/micro、PROP 码 |
| `yarn test:import-asset-quality` | 否 | 锁表改写、PROP-TMS/DANFANG、speaker 冬青、禁中文 key |
| `yarn test:identity-asset-gate` | 否 | queue 含 no_image/stub_quality，排除 SCENE-? |
| `yarn test:polish-assets-text` | 否 | polish 读 `text`，禁仅解构 `_output` |
| `yarn test:batch-video-parity` | 否 | batch 源码含 identity + bridge + capability |
| `yarn test:agnes-result-url` | 否 | 禁止 remixed id 当下载 URL |
| `yarn test:shot-vendor-bridge` | 否 | duration/audio 来自设计字段 |
| `yarn test:deepseek-20260716-closure` | 否 | 43ce74 结构层：hydrate/extract/bridge/四模式 |
| `yarn test:image-mode-template-wire` | 否 | 分镜图加载 image universal 模板 |
| `yarn test:asset-still-runner` | 否 | StillRunner / generateVideo heal 接线 |
| `yarn test:self-heal-orchestrator` | 否 | 见 [02](./02-selfheal-integration.md) |
| `yarn test:fe-integration-contract` | 否 | `data/web` + ShotSpecDrawer / selfHeal |
| `yarn test:import-runtime-journey` | **是** | 真实 import 旅程（可选，非默认 CI 轻量） |
| `yarn test:closure-suite` | 混合 | 总闸；含上表大部分本包测项 |

本包相关已挂入 suite 的片段：`import-fidelity-normalize` → `shot-vendor-bridge` → `deepseek-20260716-closure` → `import-asset-quality` → `identity-asset-gate` → `polish-assets-text` → `batch-video-parity` → `agnes-result-url` → `self-heal-orchestrator` → `image-mode-template-wire` → `asset-still-runner`。

## 3. 导入主路径

```text
golden JSON
  → normalizePreDesignPack   # SCENE 锁表改写、sref、PROP、speakers
  → seedAssetsFromBundle     # CHAR/SCENE/PROP/speaker；禁 stub for
  → ensureAssetClosure       # 联已有行；禁名=码废卡
  → assetQuality             # stubCount；导入 BLOCK
  → hydratePackageFromPreDesign
  → 金样 / 工作台
```

关键实现：

- `src/ruleEngine/bundle/normalizePreDesignPack.ts`
- `src/ruleEngine/bundle/assetSeedFromBundle.ts`
- `src/ruleEngine/bundle/assetClosureGate.ts`
- `src/ruleEngine/bundle/importAdapter.ts`（抛 `ASSET_STUB_QUALITY_BLOCK`）

## 4. 分层断言表

| 层 | 必须成立 |
|----|----------|
| normalize | `sceneColorLock` key 为 `SCENE-*`；值含中文 `name`；shot 有 `sceneCode` + image `--sref` |
| seed | SCENE `name` 中文且 `name !== code`；prompt 无 `stub for`；G4/debut → `PROP-*`；台词 orphans → CHAR |
| closure | 优先联已有中文场景行；禁止插入「名=码 + stub for」；closure id 进 `allAssetIds` |
| assetQuality | `stubCount === 0` 否则导入失败；摘要含 `propSeeded` / `speakerSeeded` / `derivativeSkipReason` / `speakerWarns`；主 CHAR/SCENE 缺 `codeToId` → `ASSET_MAIN_LINK_BLOCK` |
| 衍生诚实 | 43ce74：`derivatives===0` 且 reason 为 `arcVisual_only_no_stateVariants`（有 arcVisual）或 `no_L6_stateVariants`；**禁止**自愈伪造衍生 |
| describe | 二次导入后场景 `describe` 不得为 `SCENE-00x`（`shouldRefreshDescribe`） |
| polish | `Ai.Text.invoke` 结果取 `text`；空/stub describe → `生成失败` |
| identity | 有图 = `o_image.filePath` 非空且非「生成中」；`stub_quality` → BLOCK |
| batch | 与单镜同用 `gateIdentityImages` + `bridgeShotToVendor` |
| Agnes | 轮询成功 URL 仅 `url` / `video_url` 等 http(s)，不用 `remixed_from_video_id` |

## 5. 金样清单

| 金样 | 用途 |
|------|------|
| `data/fixtures/golden/deepseek-20260716-43ce74.json` | 导入保真 + deepseek closure 主金样 |
| `data/fixtures/golden/deepseek-20260716-*.expect.json`（若有） | 期望侧车 |
| `data/fixtures/mode-prompt-examples.json` | 四视频模式 must/mustNot |
| `data/fixtures/golden/gen-ref-1x1.png` | GenE2E 占位图（**不算**生成质量绿） |

`deepseek-20260716-closure` 绿的是结构层；资产废卡由 `import-asset-quality` + 真实 import 的 `assetQuality` 挡住。

## 6. 如何加新测（防假绿）

1. 新脚本放 `scripts/test-<topic>.ts`，`package.json` 加 `test:<topic>`。  
2. **必须**追加到 `scripts/test-closure-suite.ts` 的 `cmds`。  
3. 断言要碰：DB 资产质量 / 闸行为 / vendor payload 形状 / 编排步骤之一。  
4. **禁止**仅用 GenE2E stub `imageRunner` 返回 `/oss/stub.jpg` 就宣称「可生图质量」。  
5. LIVE Agnes：`RUNTIME_MATRIX_LIVE_GEN=1` 等 opt-in，不进默认 suite 作为质量证明。

## 7. 常见失败对照

| 现象 / 错误 | 处理方向 |
|-------------|----------|
| `ASSET_STUB_QUALITY_BLOCK` | 查 lock 是否仍中文 key；seed 是否写出中文名；二次 import 是否未 purge orphan |
| `ASSET_CLOSURE_BLOCK: missing …` | 码未进 `codeToId`；补 CD / lock / speaker seed |
| 工作台 SCENE-00x 废卡 | 旧数据；`replaceAll` 再导入或清 `orphanStub` |
| polish 一直「生成中」 | 确认走 `text` 路径；看 `promptErrorReason` |
| 视频 identity BLOCK | 先 StillRunner / 批量静照；再出视频 |
| FE 合同失败 | `RUN_WEB_INTEGRATE=1 yarn build:integrate`；查 `data/web` 是否含 `promptByMode` |

## 8. 推荐本地子集

```bash
yarn test:import-fidelity-normalize
yarn test:import-asset-quality
yarn test:identity-asset-gate
yarn test:polish-assets-text
yarn test:batch-video-parity
yarn test:agnes-result-url
yarn test:deepseek-20260716-closure
```
