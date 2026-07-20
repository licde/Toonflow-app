# 改编矩阵选择器契约

## API

- `GET /api/scriptAgent/adaptationProfile?projectId=` — 返回 catalog + profiles + 当前 adaptationProfile
- `POST /api/scriptAgent/adaptationProfile` — 保存 lockedChoices / genrePreset
- `POST /api/scriptAgent/confirmMatrixChoices` — 写入 `adaptationMatrixStructured` + `userConfirmed: true`

## UI

- 展示 `adaptation_matrix_catalog.json` 维度卡片（base / deep / viral / retention / causality / dialogue / opening）
- 深度维展开子表单：nameMap / relationMap / substitutions / settingProfile
- 确认后解锁 P06；`getAdaptationSteps` 含 `matrixConfirm` 步

## 验收展示

RulePanel 展示 `inspectBundle` 的 adaptationGaps / retentionGaps / narrativeDriveGaps 等，附 repairHints.chatTemplate。

## 片尾生产

`endCardPack.preview.previewShots` → 生产侧 `previewImage` API 合成片尾图（多镜拼图）。
