# quality-loop

> **PACKAGE_ID:** `quality-loop`  
> **HOST:** Toonflow-app  
> **用途:** Chat→Design→Compile→Preflight→PromptGen→Burn→Post 七段统一质量闸  
> **双轨:** Track A 设计作者权 + Track B 制作安全网

## Portable 标识

```text
PACKAGE_ID:      quality-loop
CORE:            src/ruleEngine/qualityGate/
EXPORT_GATE:     src/ruleEngine/exportGate.ts
MATRIX:          data/fixtures/quality_matrix.json
FIELD_REGISTRY:  data/fixtures/design_field_registry.json
CAM_SSOT:        data/fixtures/camera_motion_whitelist.json
SUITE:           yarn test:quality-gate
EXPORT_SUITE:    yarn test:design-export-gate
AUDIT:           yarn audit:quality-matrix-coverage
PRECHECK:        DC-01/DC-13/DC-16/LANG-01/PR-CAM-01/DC-09/FX-GRADE-01
EXPORT_SUITE:    yarn test:design-export-gate && yarn test:dc16-cast
```

## 双轨政策（设计硬闸优先）

| 层级 | 权威 | 行为 |
|------|------|------|
| **主路径（Track A）** | `POST /api/ruleEngine/exportGate` | Chat 写对 JSON 字段 → exportGate PASS → import |
| **补充路径（Track B）** | precheckLoop / soft_patch | 仅声明型自愈（F0/LANG/CAM clamp） |
| **禁止** | — | 靠 import 后修补替代 W3/SB/MD 作者权；禁止自写 `ruleAudit.passed` / `linkageAudit=pass` |

### Chat 修 JSON vs 制作 soft_patch 边界

| 问题类型 | 修复归属 | 示例 |
|----------|----------|------|
| NAR-14/15、splitHint、reactionAction | **Chat 改字段** | 长台词补 splitHint + 反应 △ |
| 中文 sceneColorLock key | **Chat 改字段** | 改为 `SCENE-*` code |
| CD 说话人缺失 | **Chat 改 characterDesign** | 配角入 CD（DC-16 BLOCK；禁仅 stub）+ B6 |
| DC-16 / DG-CD-COVERAGE | **Chat 补 L0.identity** | 见 RH-DC-16；修复后须再预览 |
| modality 假绿 | **Chat 改字段** | 空 FX 声明 F0，勿写 FX=pass |
| LANG 英译回填 | 制作 soft_patch（WARN） | precheckLoop 可回填，但 export 仍 WARN |
| 运镜白名单 clamp | 制作 soft_patch | PR-CAM-01 clamp 到白名单 |
| 空 FX 声明 F0 | 制作 soft_patch | 不发明特效散文，仅声明 level |

```text
主路径：Chat 写对字段 → Export Gate PASS → import（T3 默认 blockOnQualityGate=true）
补充路径：import 后 precheckLoop 仅声明型自愈
禁止：靠 import 后修补替代 W3/SB/MD 作者权
```

## Export Gate

T3 bundle export / import 前**必须**调用 `exportGate`：

- 聚合 `designPhaseGates` + `bundleIntegrityAudit` + `qualityGate` + `implementationPlan→generation` 字段 walk
- 输出 `missingFieldReport` + `chatRepairText`（一次复制全部修复话术）
- `exportAllowed !== true` 时 import 拒收（`EXPORT_GATE_BLOCK`）

## FX

- 空 / F0 = PASS（烧片）
- export 未声明可 WARN（建议声明 F0）
- F4/F5 = BLOCK
- 禁止把空 FX 抬成 burn BLOCK
- 禁止 Chat 自写 `modalityPromptAudit.FX=pass` 而镜级 fxPrompt 全空（`DG-MODALITY-MISMATCH`）

## 导入媒体

- update/upsert 默认 `preserveMedia`（shotIndex 回填 filePath）
- update 导入 `pruneStale` 清理过期 `o_scriptAssets`（防多资产）
- create 可用 replaceAll
- 返回 `mergeReport.mediaPreservedCount` + `assetDiagnostics`

## 自测

```bash
yarn test:design-export-gate      # 43ce74 raw FAIL / healed PASS
yarn test:import-preview-parity   # dryRun 与 import 同 normalize+tier
yarn test:import-update-dedup     # update prune stale scriptAssets
yarn test:export-gate-43ce74      # export gate golden smoke
yarn test:quality-gate
yarn test:precheck-loop
yarn audit:quality-matrix-coverage
```

## 扩展

见 [01-extend.md](./01-extend.md)。
