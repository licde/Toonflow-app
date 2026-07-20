# 图片质量链与扩展 cookbook

> 视频侧见 [video-quality-chain.md](./video-quality-chain.md)（设计→IR→模式→厂商→修复）。

## 三层闭环（设计 → 资产 → 生成）

```
Layer A 设计期
  DC-16 / DG-CD（说话人∪上镜码入 CD，禁 stub 洗绿）
  → exportGate + RH-DC-16 chatRepair → 再预览直至 exportAllowed
  → import（stub 安全网仍不能让严闸变绿）

Layer B 资产视觉
  CD / VLT / B6
  → flatten seed（assetVisualBrief + assetSeedFromBundle；已完成/aiCompleted 不覆盖）
  → batchPolishAssetsPrompt（AI 设定补全弱/stub + art_skills；成功清 exclude + aiCompleted）
  → shouldBlockAssetStillGen
  → batchGenerateImageAssets（per-item soft defer；不整批 400）
  → 失败 → nextStep=batch_still / complete_failed→回设计 CD

Layer C 镜头
  → gateIdentityForShot（分镜 IMG / 视频）
  → 失败 → rePushPlan / cd_cast_gap→CD / batch_still→AS
```

- **importHeal / precheckLoop** 只修剧本与设计声明，**不**改 `o_assets.prompt`。
- 定妆失败 `o_image.errorReason` 为 JSON：`{ message, feedback, rePushPlan, nextStep }`。
- 提示词失败看 `o_assets.promptErrorReason`（含 `complete_failed`）。
- Service busy → `vendor_busy` + `nextStep=batch_still`（可批量修复重试，不换脸）。

## 自测门禁

| 脚本 | 覆盖 |
|------|------|
| `test:dc16-cast` | DC-16、stub 洗绿防御、RH-DC-16 |
| `test:design-export-gate` | 43ce74 raw FAIL / real-CD healed PASS |
| `test:asset-visual-brief-ep01` | CD 展平、场景中文 lock、B6 缺口 |
| `test:asset-still-prompt-contract` | 4:1 vs derive 16:9、`vendorPrompt` |
| `test:asset-seed-cardinality` | seed 基数 |
| `test:prompt-touch` | touch / strip tokens |
| `test:import-asset-quality` | SCENE rewrite、PROP |
| `test:identity-asset-gate` | cref 定妆闸 |
| `test:closure-suite` | 上述已纳入 suite |

```bash
yarn test:dc16-cast
yarn test:design-export-gate
yarn test:asset-still-prompt-contract
yarn test:closure-suite   # 全量
```

## FE：修复并重试

资产页与塑角造景均提供 **「修复并重试失败项」**：

1. `promptState=生成失败` / `complete_failed` → `batchPolishAssetsPrompt`（补全+修复）
2. `state=生成失败` 且 `promptState=已完成` → `batchGenerateImageAssets`（不换脸；不用 allowWeakOverride 硬闯）

批量生图：弱项由后端 **deferred** 汇总，不因单项 stub 整批 400。

## 扩展：新画风

1. 复制 `data/skills/art_skills/<existing>/` → `<new_prefix>/`
2. 保证存在：`art_character.md`、`art_scene.md`、`art_prop.md` 及 `_derivative` 变体
3. 项目 `artStyle` 设为该 prefix；polish / still 经 `getArtPrompt` 自动解析

## 扩展：新 still 类型（Hard）

需同步改：

1. `AssetStillType` + `resolveAssetStillAspect` / `assetStillTypeConfig`（`assetStillPrompt.ts`）
2. zod enum：`generateAssets` / `batchGenerateImageAssets` / polish `typeConfig`
3. `art_skills/*/art_<type>.md`
4. FE 资产页 type 与上传枚举
5. DB `o_assets.type` / `o_image.type` 约定

建议优先复用 `role | scene | tool`，避免新增第四类。

## 扩展：新 reverse 触发

1. `data/fixtures/reverse_route_table.json` 增 trigger（如 `cd_cast_gap`→CD）
2. SelfHeal / classify 映射到 `nextStep: batch_still | regen_prompt`
3. 可选：资产页「修复并重试」调 `/api/ruleEngine/selfHeal` 后再批量生图

## FE 同步

资产页改动在 `Toonflow-web`；发布前 build 并同步到 `data/web`（或 `data/web_new` 按仓库惯例）。
