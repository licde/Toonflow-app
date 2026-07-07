# Drama Pack 字段清单（Manifest）

> **自动生成**：`yarn drama-pack manifest`。勿手改 Registry 段；可追加说明段落于文末。

## Registry Rules（imagePrompt / postProduction）

| Rule ID | Channel | Spec Block | Status |
|---------|---------|------------|--------|
| `shotTypeRecommend` | imagePrompt | `shotTypeRules` | applied |
| `imagePromptRules` | imagePrompt | `imagePromptRules` | applied |
| `colorToneMapping` | imagePrompt | `colorToneMapping` | applied |
| `colorToneContrast` | imagePrompt | `colorToneMapping` | applied |
| `sceneColorLock` | imagePrompt | `sceneColorLock` | applied |
| `sceneNightRouting` | imagePrompt | `sceneColorLock` | applied |
| `L0-baseModel` | imagePrompt | `L0-baseModel` | applied |
| `cameraAnchor` | imagePrompt | `cameraAnchor` | applied |
| `constraints` | imagePrompt | `constraints` | applied |
| `postProductionHints` | postProduction | `postProductionHints` | applied |

## productionRuleEngine 内建规则（非 Registry 文件）

| Rule ID | Channel | Status |
|---------|---------|--------|
| `transitionRules` | videoDesc | applied |
| `dialogueActionSync` | videoDesc | applied |
| `soundDesign` | videoDesc | applied |
| `systemUIAppearance` | videoDesc | applied |
| `emotionPerformanceMapping` | videoDesc | applied-fallback |
| `personalitySwitch` | associate | applied |
| `L6-personality` | videoDesc | applied-partial |
| `L6-trigger` | videoDesc | applied-partial |

## productionSpec 已知块

| Block | Registry 状态 |
|-------|---------------|
| `aiFailover` | archived |
| `bgmRules` | archived |
| `cameraAnchor` | applied (rule) |
| `characterAssetRules` | validate-only |
| `colorToneMapping` | applied (rule) |
| `constraints` | applied (rule) |
| `continuityLock` | archived |
| `costTiers` | archived |
| `dialogueActionSync` | applied (engine) |
| `editingRules` | validate-only |
| `emotionCurveDimensions` | validate-only |
| `emotionPerformanceMapping` | applied (engine) |
| `episodeOpenRules` | validate-only |
| `imagePromptRules` | applied (rule) |
| `imagePromptTemplates` | applied (engine) |
| `outputFormatRules` | validate-only |
| `performanceBaseline` | applied (engine) |
| `platformAdaption` | archived |
| `productLayer` | partial |
| `propDesign` | archived |
| `sceneColorLock` | applied (rule) |
| `sceneDesign` | archived |
| `sceneGenerationRules` | validate-only |
| `shotTypeRules` | applied (rule) |
| `soundDesign` | applied (engine) |
| `subtitleRules` | archived |
| `systemUIAppearance` | applied (engine) |
| `transitionRules` | applied (engine) |
| `validation` | validate-only |

## CLI

```bash
yarn drama-pack validate ./my-pack.json
yarn drama-pack coverage ./my-pack.json
yarn drama-pack sync <projectId> ./my-pack.json
yarn drama-pack manifest   # 重新生成本文件
```
