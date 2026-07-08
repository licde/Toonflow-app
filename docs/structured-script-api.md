# 结构化剧本导入与生产 API 文档

> 版本：M1 + GCE（导入 → 编译 → 分镜图/视频生成 → 时间轴/可选 ffmpeg 拼接）  
> 后端路径：`src/services/structuredScript/`、`src/services/generationContext/`、`src/routes/structured/`  
> 前端面板：`data/web/structured-production/`（开发/调试页 `/structured-production/`；**生产环境建议嵌入主 web 工作台 Tab**）  
> 前端详细设计（交付开发）：[structured-production-frontend.md](./structured-production-frontend.md)  

---

## 1. 概述

结构化剧本流水线将 **JSON v1.0 生产蓝图** 导入 Toonflow，经 **Generation Context Engine (GCE)** 编译生成可执行的分镜提示词，再按镜逐条生成图片与视频，最终输出 **时间轴 manifest** 或 **ffmpeg 拼接 final.mp4**（本机已安装 ffmpeg 时）。

### 1.1 三阶段流水线

```
导入/同步 JSON  →  编译 Prompt（image + video）  →  生成（图 → 视频）  →  组装 manifest
```

| 阶段 | 说明 | 对应 API |
|------|------|----------|
| L0 预览 | 不落库，仅校验与编译预览 | `previewStructured` |
| M1a 导入 | 写入资产、分镜、轨道 | `importStructured` |
| M1b 同步 | 增量 diff，标记 dirty | `syncStructured` |
| M1c 生成 | 批量/单镜重生图、视频 | `generateShotImage` / `generateShotVideo` / `regenerateShot` |
| M1d 组装 | manifest + 可选 final.mp4 | `assembleEpisode` |
| 编排 | 五阶段后台批量 | `batchGenerateFromStructured` |
| 版本 | 切换激活视频 | `selectStructuredVideo` |

### 1.2 预览层级（前端约定）

| 层级 | 内容 | 数据来源 |
|------|------|----------|
| L0 | 静态 Animatic（分镜图网格 + 时长） | `getStructuredGrid` |
| L1 | 每镜独立视频片段 | `pollStructured` + grid |
| L2 | 整集时间轴 | `assembleEpisode` → manifest |

### 1.3 前端集成（推荐）

**独立面板**（`/structured-production/`）仅用于开发联调，与主 web **同源 + 共用 `localStorage.token`**。401「未提供 token」是因为未登录——先在主站 `/` 登录，或在本页手动粘贴 Bearer token。

**生产形态**：在主 Vue 工作台（生产页）增加 **「结构化生产」Tab**，不要单独部署页面。

| 项 | 做法 |
|----|------|
| 鉴权 | 复用现有 axios 实例（请求拦截器已带 `Authorization: localStorage.token`） |
| 上下文 | 从路由/Store 传入 `projectId`、`scriptId`，无需手填 |
| API | 直接 `POST /api/structured/{action}`，契约见本文 §3 |
| UI 逻辑 | 可参考 `data/web/structured-production/app.js` 的 `api()` 与按钮流程；或 `window.StructuredProduction.api(path, body)` |
| ngrok | 前后端同一隧道域名即可；401 是 token 问题，不是 ngrok 本身 |

**Vue Tab 最小 props 契约：**

```typescript
interface StructuredProductionTabProps {
  projectId: number;
  scriptId?: number | null; // 导入成功后回填
}
```

**嵌入示例（伪代码）：**

```typescript
// 与主站 axios 一致
const structuredApi = (path: string, body: object) =>
  axios.post(`/api/structured/${path}`, body).then((r) => r.data.data);

// 导入 → 刷新网格
const { scriptId, storyboardIds } = await structuredApi("importStructured", {
  projectId,
  json,
  episodeIndex: 0,
});
const grid = await structuredApi("getStructuredGrid", { projectId, scriptId });
```

**已知工程约束（其余问题联调时再补）：**

- 批量生成异步，需 `pollStructured` 或任务中心轮询
- `assembleEpisode` 拼接依赖本机 ffmpeg
- 结构化 API 与主站一样走 JWT，**不要**为调试单独放开白名单
- **Agnes 视频/参考图**：生成视频时需把分镜图转为公网 URL；后端 `uploadReferenceAsset` 写入 OSS。若走 ngrok，请设置 `ossURL=https://你的ngrok域名`（与前端同域），否则报 `uploadReferenceAsset is not defined` 或本地 URL 不可访问
- **道具/纸条镜**：`dialogue.text` / `visualEffect.content` 为中文权威来源；`imagePrompt` 里的英文 text 会被编译器替换

### 1.4 推荐使用流程（Web 工作台）

1. 在 **Toonflow-web** 开发：`yarn dev`，或 `yarn build` 后将产物同步到 `Toonflow-app/data/web`
2. 生产页 → 选择集 → 打开 **工作台** → 左侧 **结构化生产** Tab（文档图标）
3. 选择 `新版第一集.json` → **预览编译** → **导入**
4. **出分镜图** → 检查镜 4 等道具镜中文 → **出视频**
5. ngrok 调试时启动后端：`ossURL=https://xxx.ngrok-free.dev yarn start`

独立页 `/structured-production/` 仅作后端联调备用，正式体验以 Web Tab 为准。

---

## 2. JSON v1.0 结构

最小必填：

```json
{
  "version": "1.0",
  "episodes": [
    {
      "name": "第一集",
      "storyboard": [
        { "镜号": 1, "imagePrompt": "...", "videoPrompt": "..." }
      ]
    }
  ]
}
```

完整字段见 `新版第一集.json`，核心块：

| 块 | 用途 |
|----|------|
| `meta` | 项目标题、基调、画风 |
| `productionSpec` | 色温映射、镜头类型规则、剪辑规范 |
| `characterAssets` | CHAR-* 角色资产与四视图 prompt |
| `episodes[].storyboard` | 分镜数组（1 镜 = 1 条 `o_storyboard`） |
| `continuityTracking` | 连续性追踪（存入 `o_agentWorkData`） |

### 2.1 分镜字段与编译映射

| JSON 字段 | 编译用途 |
|-----------|----------|
| `imagePrompt` / `videoPrompt` | 主 prompt 来源 |
| `assetCodes` | 关联 `o_assets`（remark = CODE） |
| `dialogue` | 视频 prompt 追加台词；`EffectStack.voice = video_native` |
| `performance` | 追加微表情/肢体描述 |
| `colorTone` | 经 `productionSpec.colorToneMapping` 追加色温 |
| `type` | PURE-SCENE / PURE-PROP / CHAR-SCENE 规则 |
| `effectStack` | 覆盖 voice / motion / sfx 默认策略 |
| `time` / `dialogue.推荐分镜时长` | 解析为秒数（1–30，Agnes 限制） |

---

## 3. 数据库映射

### 3.1 表关系

```
o_project
  └── o_script (一集)
        ├── o_storyboard (1 镜 1 行, shotMeta = 完整 JSON)
        │     └── o_assets2Storyboard → o_assets (remark = CHAR-/SCENE-/PROP-)
        └── o_videoTrack (1 镜 1 轨道)
              └── o_video (多版本，selectVideoId 指向当前)

o_agentWorkData
  ├── key=structuredSource   完整 JSON 快照
  ├── key=productionSpec     制作规范
  ├── key=structuredEpisode  导演备注 / keyPrompts
  ├── key=continuity         连续性
  └── key=assembleManifest   组装结果路径
```

### 3.2 新增/使用字段（`fixDB` 迁移）

| 表 | 字段 | 说明 |
|----|------|------|
| `o_storyboard` | `shotMeta` | 原始分镜 JSON |
| `o_storyboard` | `videoPrompt` | 编译后视频 prompt |
| `o_storyboard` | `promptSource` | 固定 `"structuredImport"` |
| `o_storyboard` | `promptSourceHash` | 编译哈希，用于 sync diff |
| `o_storyboard` | `imageId` | 当前激活分镜图 |
| `o_image` | `storyboardId` | 多版本分镜图归属 |

**重要约定**

- 重新生成时 **INSERT 新 `o_image` / `o_video`**，不覆盖 OSS 文件。
- `syncStructured` **不删除** OSS 资源，仅更新元数据并设 `state: dirty`。
- 导入同名集数会 **清空** 该 `scriptId` 下旧分镜与轨道后重建。

---

## 4. Prompt 编译器（GCE 精简版）

源码：`src/services/structuredScript/compiler.ts`

### 4.1 EffectStack

| 维度 | 可选值 | 默认逻辑 |
|------|--------|----------|
| `voice` | auto / video_native / tts / off | 有台词 → `video_native` |
| `motion` | auto / basic / enhanced / static | VFX、记忆点、导演批注 → `enhanced` |
| `sfx` | auto / prompt_only / post_layer / off | 有 visualEffect → `post_layer` |

### 4.2 图片编译 `compileImage`

1. 取 `keyPrompts` 场景覆盖（若有）
2. `stripCrefSref` 去除 `--cref` / `--sref`（改由资产参考图注入）
3. `productionSpec.imagePromptRules` 类型规则
4. `colorToneMapping` 色温追加
5. `performance` 表演层
6. `characterAssets` 角色分层 prompt（白天/夜晚/日常）

### 4.3 视频编译 `compileVideo`

1. 台词：`character says: "..."`；情绪爆发类型加 `action before dialogue 0.3s`
2. `transitionType === "慢放"` → slow motion
3. `personalitySwitch` 未完成 → `mode: startEndRequired`
4. `audio: true` 当 `voice` 为 video_native 且有台词

### 4.4 编译哈希 `compileHash`

对 `{ shot, img, vid }` 做 SHA256 前 16 位，存入 `promptSourceHash`。`syncStructured` 比较哈希判断是否需要标记 dirty。

---

## 5. API 参考

统一响应格式：`{ code, message, data }`（`success` / `error` 来自 `@/lib/responseFormat`）。

基础路径：`/api/structured/<action>`

### 5.1 POST `/api/structured/previewStructured`

**不落库**，校验 JSON 并返回编译预览。

**请求体**

```json
{
  "json": { "...": "完整 v1.0 JSON" },
  "episodeIndex": 0
}
```

**响应 `data`**

```json
{
  "episodeName": "第一集",
  "shotCount": 44,
  "characterCount": 5,
  "sceneCount": 6,
  "propCount": 3,
  "fieldCoverage": { "G0": 44, "G1": 38, "G4": 40 },
  "warnings": [],
  "shots": [
    {
      "镜号": 1,
      "visualId": "办公室_白天",
      "duration": 1.2,
      "imagePromptPreview": "..."
    }
  ]
}
```

---

### 5.2 POST `/api/structured/importStructured`

导入一集，创建/更新资产、分镜、视频轨道。

**请求体**

```json
{
  "projectId": 1,
  "episodeIndex": 0,
  "json": { "...": "完整 JSON" }
}
```

**响应 `data`**

```json
{
  "scriptId": 12,
  "storyboardIds": [101, 102],
  "shotCount": 44,
  "preview": { "...": "同 previewStructured" }
}
```

**副作用**

- 更新 `o_project` 名称/简介/画风（若 `meta` 存在）
- 写入 `structuredSource`、`productionSpec`
- CHAR/SCENE/PROP 资产 upsert（`o_assets.remark` = CODE）
- 每镜创建 `o_videoTrack` + `o_storyboard`

---

### 5.3 POST `/api/structured/syncStructured`

JSON 修订后同步元数据，**不自动重新生成**。

**请求体**

```json
{
  "projectId": 1,
  "scriptId": 12,
  "episodeIndex": 0,
  "json": { "...": "修订后 JSON" }
}
```

**响应 `data`（SyncDiffResult）**

```json
{
  "changedShots": [3, 7],
  "newShots": [45],
  "archivedShots": [],
  "dirtyShots": [3, 7, 45],
  "suggestions": [
    { "storyboardId": 103, "镜号": 3, "targets": ["image", "video"] },
    { "镜号": 45, "targets": ["image", "video"] }
  ]
}
```

- `changedShots`：哈希变化，已更新 prompt 并设 `state: dirty`
- `archivedShots`：JSON 中已删除的镜号，`state: archived`
- `newShots`：新增镜号（需前端引导单独插入或重新导入）

---

### 5.4 POST `/api/structured/getStructuredGrid`

生产工作台网格数据。

**请求体**

```json
{ "projectId": 1, "scriptId": 12 }
```

**响应 `data`**

```json
{
  "shots": [
    {
      "id": 101,
      "镜号": 1,
      "track": "镜01",
      "duration": "1.2",
      "state": "已完成",
      "promptSource": "structuredImport",
      "promptSourceHash": "a1b2c3...",
      "imageSrc": "https://...",
      "videoPrompt": "...",
      "associateAssetsIds": [5, 8],
      "videoVersions": [
        { "id": 20, "state": "生成成功", "src": "https://...", "active": true }
      ]
    }
  ],
  "assembleManifest": { "manifestPath": "/1/episodes/12/timeline-manifest.json", "shotCount": 44 }
}
```

---

### 5.5 POST `/api/structured/generateShotImage`

批量生成分镜图（顺序执行）。

**请求体**

```json
{
  "projectId": 1,
  "storyboardIds": [101, 102],
  "tier": "2K"
}
```

**响应**：每项 `{ storyboardId, imageId, filePath }` 或 `{ storyboardId, error }`

**流程**

1. 从 `shotMeta` 重编译 prompt
2. `resolveReferenceImages` 注入关联资产参考图
3. 调用 `u.Ai.Image`，默认模型 `agnesai:agnes-image-2.1-flash`
4. 写入 `o_image`（`storyboardId` 关联）

---

### 5.6 POST `/api/structured/generateShotVideo`

批量生成视频（需已有分镜图）。

**请求体**

```json
{
  "projectId": 1,
  "storyboardIds": [101, 102],
  "audio": true,
  "resolution": "720p"
}
```

- `audio` 省略时由编译器根据台词决定
- 使用当前 `o_storyboard.filePath` 作为首帧参考

---

### 5.7 POST `/api/structured/regenerateShot`

单镜定向重生。

**请求体**

```json
{
  "projectId": 1,
  "storyboardId": 101,
  "targets": ["image", "video"],
  "tier": "2K",
  "audio": true
}
```

---

### 5.8 POST `/api/structured/selectStoryboardImage`

切换分镜图版本（多版本 `o_image`）。

**请求体**

```json
{ "storyboardId": 101, "imageId": 55 }
```

---

### 5.9 POST `/api/structured/pollStructured`

轮询生成状态（对标 `pollingImageAssets`）。

**请求体**

```json
{ "storyboardIds": [101, 102, 103] }
```

**响应**：每镜 `state`、`images[]`、`videos[]` 及 `active` 标记。

---

### 5.10 POST `/api/structured/assembleEpisode`

生成时间轴 manifest（**M1 不写 final.mp4**，仅 JSON 清单）。

**请求体**

```json
{ "projectId": 1, "scriptId": 12 }
```

**响应 `data`**

```json
{
  "manifestPath": "/1/episodes/12/timeline-manifest.json",
  "shots": [
    {
      "镜号": 1,
      "storyboardId": 101,
      "duration": "1.2",
      "imageUrl": "https://...",
      "videoUrl": "https://...",
      "trackId": 9001
    }
  ]
}
```

---

### 5.11 POST `/api/structured/getStructuredRules`

规则与质量档位下发，避免前端硬编码镜头类型分支。详见 [structured-production-frontend.md §5.1](./structured-production-frontend.md#51-规则与策略)。

### 5.12 POST `/api/structured/validateStructuredShot`

单镜校验与编译预览。详见 [structured-production-frontend.md §5.3](./structured-production-frontend.md#53-校验与历史)。

### 5.13 POST `/api/structured/setStructuredAutoApplyPolicy`

保存可配置自动重生成策略（`enabled`、`autoApplyOnSync`、`scope`、`phases`、`qualityProfileId`）。

### 5.14 POST `/api/structured/applyStructuredPlan`

执行生成计划：支持 `scope: dirty | all | storyboardIds[]`，用于「一键更新 dirty」与「全局重生成」。

### 5.15 POST `/api/structured/getStructuredShotHistory`

单镜历史：原始 prompt/shotMeta、syncRevisions、overrideRevisions。

### 5.16 扩展：`syncStructured` 响应

在原有字段基础上增加 `diffByShot[]` 与可选 `autoApplyResult`（policy 开启且 sync 后自动触发时）。

### 5.17 扩展：`getStructuredGrid` 响应

每镜增加 `reference`、`original`、`lastSyncRevision`、`explain`、`prompt`、`videoDesc`。

---

前端消费字段总表见 [structured-production-frontend.md §5](./structured-production-frontend.md#5-api-契约前端必接)。

---

## 6. 推荐工作流

### 6.1 首次导入

```
previewStructured → importStructured
  → generateShotImage (全部 storyboardIds)
  → pollStructured 直到完成
  → generateShotVideo
  → pollStructured
  → assembleEpisode
  → getStructuredGrid 展示 L2
```

### 6.2 JSON 修订

```
syncStructured → 根据 suggestions 对 dirty 镜 regenerateShot
  → assembleEpisode（若有视频变更）
```

### 6.3 单镜精修

```
regenerateShot(targets: ["image"]) → selectStoryboardImage（若需切版本）
  → regenerateShot(targets: ["video"])
```

---

## 7. AgnesAI 集成

配置：`data/vendor/agnesai.ts`

| 能力 | 模型 | 说明 |
|------|------|------|
| 图片 | `agnes-image-2.1-flash` | 参考图列表 `referenceList` |
| 视频 | `agnes-video-v2.0` | 时长 1–30s；`audio: optional` |

视频生成时 `config.audio === true` 会设置 `extra_body.generate_audio = true`（原生对白音轨）。

**M1 音频策略**：有台词的镜头默认 `video_native`，不走 TTS。TTS 需 M2 接入其他 vendor。

---

## 8. 前端集成（「结构化生产」Tab）

后端仅提供 API；前端需在现有生产工作台新增 Tab **「结构化生产」**。

### 8.1 页面模块建议

| 模块 | API |
|------|-----|
| JSON 上传 / 预览 | `previewStructured` |
| 导入按钮 | `importStructured` |
| 分镜网格 | `getStructuredGrid` |
| 批量生成 | `generateShotImage` / `generateShotVideo` |
| 进度轮询 | `pollStructured`（建议 2–3s 间隔） |
| 同步 JSON | `syncStructured` + dirty 高亮 |
| 时间轴预览 | `assembleEpisode` manifest |

### 8.2 状态展示

| `o_storyboard.state` | UI |
|----------------------|-----|
| `未生成` | 灰 |
| `生成中` | 加载 |
| `已完成` | 绿 |
| `dirty` | 橙（需重新生成） |
| `archived` | 隐藏或折叠 |

### 8.3 前端面板

独立面板已内置：`data/web/structured-production/`  
启动服务后访问：`http://localhost:<PORT>/structured-production/`

主 Vue 工作台 Tab 需在前端仓库集成；本仓库提供完整 API 契约与上述独立面板。

```bash
yarn build    # 编译后端 → data/serve/app.js
yarn start
```

---

## 9. 文件索引

```
src/services/generationContext/     # GCE 核心
  PromptCompiler.ts               compileImage / compileVideo / buildPreview
  VariantSelector.ts              visualId 变体
  CharacterDesignMatcher.ts       L0-L6 分层
  EmotionMotionLinker.ts          情绪×表演联动
  CreativeIntentMatcher.ts        directorNotes / 记忆点
  ReferenceResolver.ts            assetCodes → 参考图顺序
  DurationAdapter.ts              时长适配 1-30s
  ModelCapabilityRegistry.ts      vendor 能力
  ModelRouter.ts                  按镜路由模型/T 档位
  AudioRouter.ts                  video_native / TTS 路由
  PostProductionRouter.ts         后期任务队列
  QualityGate.ts                  分镜图预检
  TimelineAssembler.ts            manifest + ffmpeg concat
  Executor.ts                     五阶段编排
  fieldRegistry.yaml              FieldHandler 声明
  fieldHandlers/registry.ts       插件实现

src/services/structuredScript/
  types.ts schema.ts utils.ts
  validator.ts                      Zod + GCE 预检
  mapper.ts                         JSON → DB 行
  deriveVariant.ts                  懒加载变体元数据
  importPipeline.ts syncPipeline.ts
  assetResolver.ts generation.ts

src/routes/structured/              # 12 个 API
  previewStructured importStructured syncStructured
  getStructuredGrid generateShotImage generateShotVideo
  regenerateShot selectStoryboardImage selectStructuredVideo
  pollStructured assembleEpisode batchGenerateFromStructured

data/web/structured-production/   # 开发面板（auth 与主站共享）；Vue Tab 集成见 §1.3
docs/structured-script-api.md
```

---

## 10. 限制与后续

| 项目 | 当前状态 | 后续 |
|------|----------|------|
| ffmpeg final.mp4 | 已支持（需本机 ffmpeg） | 转场/变速/字幕轨 |
| TTS 对白 | AudioRouter 路由 + 后期队列 | 接入 MiniMax 等 vendor |
| FieldHandler | yaml + registry 已建 | 更多 handler 插件 |
| sync 新增镜 | diff 报告 | 自动 insert 分镜行 |
| 主工作台 Tab | 见 §1.3 集成契约 | 在前端仓加 Tab，复用 axios |

---

## 11. 本地验证

```bash
# 类型检查
yarn lint

# 编译
yarn build

# 启动（需已配置 vendor）
yarn start
```

使用 curl 或 Postman 对 `previewStructured` 传入 `新版第一集.json` 内容即可验证编译链路，无需落库。

---

## 12. 错误处理

| 场景 | HTTP | 说明 |
|------|------|------|
| JSON 校验失败 | 400 | Zod 错误信息 |
| 未登录 / token 无效 | 401 | `未提供token`；先主站登录 |
| 分镜不存在 | 400 | 生成类 API |
| 无分镜图生成视频 | 400 | `请先生成分镜图` |
| 单镜失败（批量） | 200 | 该项含 `error` 字段，不中断其他镜 |

任务记录：导入走 `taskRecord(projectId, "结构化导入", ...)`，可在任务中心查看。
