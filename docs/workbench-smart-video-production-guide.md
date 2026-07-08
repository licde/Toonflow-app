# 视频工作台智能高质量制作链路（实操版）

本文档面向实际制作，覆盖 **import/sync 单集预设 → 工作台只读展示 → 生成** 端到端闭环。

## 0. 端到端架构（单一真源）

| 阶段 | 行为 |
|------|------|
| import / sync | 每轨 `autoPersistTrackMedias`；`presetEpisodeVideo` 按项目模型预写 1~2 条 route 提示词缓存 |
| 进入工作台 | `getGenerateData` 返回权威 `medias` / `refSlots` / `promptStale`；前端**禁止**用本地 cache 覆盖 |
| 切换模态 | `switchTrackRoute` 秒切缓存；无缓存才提示重新生成 |
| 生成视频 | 后端只读 `o_videoTrack.medias`；前端 `promptStale` 或 orphan 时禁用按钮 |

数据块：`productionAgent.videoWorkbench`（按 scriptId）含 `trackPlans[trackId].prompts[routeKey]`。

## 1. 推荐默认链路

1. 资产与分镜图先齐备（至少每个 track 有可用参考图）
2. 进入视频工作台，先确认项目 `videoModel` 与 `mode`
3. 批量生成提示词（确保 `@图N` 与当前参考条带一致）
4. 通过前置预检后再生成视频
5. 失败按 reason code 修复后重试

默认建议：
- 人脸一致性优先：`singleImage`（单图首帧）
- 复杂动作/参考多图：`text` 或多参模式

## 2. 400 报错快速定位

`POST /api/production/workbench/generateVideo` 现有关键 400：

- `PROMPT_REF_MISMATCH`
  - 含义：提示词里的 `@图N` 或 `@资产:LOCK_CODE` 与当前参考条带不一致
  - 处理：先“重新生成提示词”，再发起视频生成

- `REFERENCE_MISSING`
  - 含义：参考图为空、分镜图未生成且无 fallback 资产图、或资产图不存在
  - 处理：补图 / 重建条带 / 重新关联后重试

- `VIDEO_DURATION_OUT_OF_RANGE`
  - 含义：时长超出契约范围（当前统一 1~30 秒）
  - 处理：调整时长到有效区间

- `VIDEO_RESOLUTION_UNSUPPORTED`
  - 含义：分辨率不在白名单（当前 720p / 1080p）
  - 处理：切换到支持分辨率

## 3. 参考条带与提示词一致性规则（契约）

1. **资产图**：`src || fallbackAssetSrc` 可进 slot
2. **分镜图**：仅 `src` 可进 slot；无分镜图时 UI 不得用资产 fallback 冒充（避免 `@图4~6` 漂移）
3. `@图N` 编号以 DB `o_videoTrack.medias` 经 `refSlotBuilder` 排序后为准
4. 参考条带变化后，旧提示词可能失效（`promptStale=true`），必须重生
5. 视频生成前统一 orphan/missing 预检，不通过即拦截（前端禁用 + 后端 400）

建议操作顺序：
1. 调整参考条带
2. 立即批量生成提示词
3. 预检通过后再批量生成视频

## 4. 模式切换与“固化”策略

系统会在 `o_videoTrack.promptSource` 记录提示词生成元信息（route/mode/refs/prompt length）用于判断是否过期。

当以下任一变化发生时，提示词视为“建议重生”：
- 项目 mode 变化
- 路由模式变化（例如从单图首帧切到多参）
- 参考条带数量变化

前端可根据 `promptStale` 显示“建议批量重新生成提示词”。

## 5. 模型规范：通用与特化

通用层（所有模型遵守）：
- 参考图引用一致性校验
- orphan/missing 预检
- 时长/分辨率基础契约

模型特化层（按 vendor adapter）：
- mode 支持矩阵
- 音频支持策略
- 特定模型的推荐链路

以 `agnesai:agnes-video-v2.0` 为例：
- 可走 `singleImage` / `text` / 首尾帧 / 多参考
- 建议优先单图首帧做人脸稳定，再按需求切多参

## 6. 字段智能应用建议（高质量）

为保证“表情、嘴型、动作、运镜”可感知：
- 情绪峰值镜头（`emotionIntensity >= 4`）优先近景/特写
- 嘴型与微表情至少保留一条可见描述
- 运镜描述与情绪变化联动（低强度平稳，高强度推近或加压）

建议在分镜和 productionSpec 中统一填写：
- `emotionIntensity`
- `performance.mouth / gaze / microExpression`
- `cameraAngle / transitionRules`

## 7. 生产排查 SOP（可直接执行）

1. 获取轨道数据：`getGenerateData`
2. 检查 `promptStale`
3. 若 stale=true：先批量生成提示词
4. 发起 `generateVideo` / `batchGenerateVideo`
5. 若失败：
   - `PROMPT_REF_MISMATCH`：重生提示词
   - `REFERENCE_MISSING`：补图/修复引用
   - 参数类错误：按契约修正时长/分辨率/mode

## 8. 验收用例

| # | 操作 | 期望 |
|---|------|------|
| 1 | import/sync 后进入工作台 | 各 track 已有提示词；参考条带已落库；无首镜自动清空 |
| 2 | 分镜无图仅有资产兜底 | UI 显示不可引用；`@图N` 不含该分镜 slot |
| 3 | 切换 singleImage ↔ text | 有缓存则秒切提示词；无缓存提示生成 |
| 4 | `promptStale=true` 时点生成视频 | 按钮禁用，不发 400 请求 |
| 5 | 批量生成视频 | 响应 `{ accepted, rejected }`；跳过的轨道有提示 |
| 6 | 修改参考条带后 | `promptStale` 变黄条；重生提示词后可生成 |

## 9. API 速查

- `POST /api/production/workbench/presetEpisodeVideo` — `{ projectId, scriptId }`
- `POST /api/production/workbench/switchTrackRoute` — `{ trackId, routeKey }`
- `POST /api/production/workbench/generateVideoPrompt` — 仅需 `trackId, projectId, model, mode`
- `POST /api/production/workbench/batchGeneratePrompt` — `trackIds[]`（`info/refSlots` 已废弃）

## 10. 最佳实践总结

- 不要在参考条带变更后直接复用旧提示词
- 批量任务前先做前置预检，避免重复失败
- 统一先“提示词正确”，再“视频生成”
- 失败信息必须回传 reason code，便于自动化修复与统计

