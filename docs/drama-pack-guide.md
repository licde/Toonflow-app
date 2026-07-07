# Toonflow 短剧制作整合教程

本文档说明两种短剧制作路径的**开箱步骤**：外部精修导入（路径 B）与内置高质量模式（路径 A），以及导入后的制作接续流程。

---

## 一、两种路径对比

| 维度 | 路径 B：外部导入 | 路径 A：内置高质量模式 |
|------|-----------------|----------------------|
| 剧本精修 | 在 Claude/ChatGPT 等外部大模型完成 17 步流程 | 在 Toonflow Script Agent 内逐步确认 |
| 质量上限 | 高（128K+ 上下文） | 高（取决于配置的文本模型） |
| 上手成本 | 需整理 drama-pack JSON | UI 内对话即可 |
| 适合 | 精品剧、已有外部剧本产物 | 团队统一在平台内协作 |
| 入库方式 | `importDramaPack` API / CLI | Agent 自动写入 + 可选导出 drama-pack |

**推荐组合（质量优先）**：外部大模型完成步骤 1–5 → 整理为 drama-pack → 导入 Toonflow → 资产图 → 分镜图 → 视频。

---

## 二、路径 B：外部导入（开箱步骤）

### 步骤 1：在外部大模型执行改编流程

1. 复制桌面《小说转剧本流程.txt》全文到 Claude / ChatGPT / DeepSeek（建议 128K 上下文）
2. 粘贴原始小说/文本
3. **全季一次**：步骤 1 → 1.5 → 2 → 2.5 → 2.6 → 2.7 → 5 → 5.5（逐步数字确认）
4. **每批 5–8 集**：步骤 3 → 3.5 → 3.6 → 3.7 → 4 → 4.5 → 4.6 → 6 → 6.5 → 7

### 步骤 2：转换为 drama-pack JSON

**方式 A — LLM 辅助（推荐）**

将 Skill 文件 `data/skills/import/markdown_to_drama_pack.md` 作为 system prompt，粘贴各步 Markdown 产物，要求输出 JSON。

**方式 B — 参考模板手工填写**

复制 [`data/examples/drama-pack.example.json`](../data/examples/drama-pack.example.json)，按字段填入。

**方式 C — CLI 校验**

```bash
yarn drama-pack validate ./my-pack.json
```

### 步骤 3：在 Toonflow 创建项目

1. 新建项目：竖屏 **9:16**，选择与视觉锁定表一致的 **artStyle**
2. 配置 **OSS 公网 URL**（云 vendor 参考图必需）：设置 → OSS 配置
3. （可选）导入原文章节：`POST /api/novel/addNovel`

### 步骤 4：导入 drama-pack

**API 方式：**

```http
POST /api/import/importDramaPack
Content-Type: application/json

{
  "projectId": 1234567890,
  "pack": { ... },
  "merge": false
}
```

**CLI 方式（需本地服务/数据库可用）：**

```bash
yarn drama-pack import 1234567890 ./my-pack.json
yarn drama-pack import 1234567890 ./my-pack.json --merge
```

**校验 API（导入前）：**

```http
POST /api/import/validateDramaPack
{ "pack": { ... } }
```

导入成功后返回：`scriptIds`、`assetCodeMap`、`storyboardCount`、warnings。

### 步骤 5：制作接续（导入后标准 SOP）

> 完整质量门禁与问题排查见 [`short-drama-quality-playbook.md`](./short-drama-quality-playbook.md)。

```
资产中心 → T0 脸型锚点先出图 → T1 衍生对照抽检 → scene/prop ensure prompt
    ↓
Production Agent（可选微调分镜）→ 分镜图 batchGenerateImage（失败时 polling 返回 reason）
    ↓
Workbench → 确认 videoModel + mode → 视频提示词 → batchGenerateVideo
    ↓
选片 selectVideo → 配音 cornerScape/batchBindAudio
```

**视频提示词前**：确认项目 `videoModel` 与 `mode`；生成后抽检 track.prompt 无模型路由推理文本。

**Electron 开发**：`yarn rebuild:electron` 后再 `yarn dev:gui`（better-sqlite3 ABI 与系统 Node 不同）。

**提示词直通：** 导入后资产/分镜/视频 prompt 已规范化落库（`promptSource=import`），无需重复 polish 或 batchGeneratePrompt。

**分镜失败排查：**
- `POST /api/production/storyboard/pollingImage` — 返回全部状态含 `生成失败` + `reason`
- `POST /api/production/storyboard/getGenerateStatus` — 批量进度汇总

### 步骤 6：双向同步（可选）

导出当前项目为 drama-pack，带回外部精修：

```bash
yarn drama-pack export 1234567890 ./exported.json
```

```http
POST /api/import/exportDramaPack
{ "projectId": 1234567890, "scriptIds": [1, 2] }
```

---

## 三、路径 A：内置高质量模式

### 步骤 1：切换工作流模式

```http
POST /api/project/setWorkflowMode
{ "projectId": 1234567890, "mode": "quality" }
```

查询当前模式：

```http
POST /api/project/getWorkflowMode
{ "projectId": 1234567890 }
```

- `standard`：故事骨架 → 改编策略 → 剧本（默认）
- `quality`：风格定位 → 改版矩阵 → 骨架 → 人物视觉圣经 → 改编策略 → 台词验证 → 剧本

### 步骤 2：导入小说并提取事件

1. `POST /api/novel/addNovel` 导入章节
2. 等待事件提取完成（`eventState: 1`）

### 步骤 3：打开 Script Agent

在 Toonflow 剧本 Agent 对话中：

1. 确认项目参数（集数、单集时长、章节范围、竖屏/横屏）
2. 按 Agent 提示逐步确认：基调 → 12 维矩阵 → … → 台词验证
3. 每步回复数字或「确认」继续

### 步骤 4：资产与制作

1. `POST /api/script/extractAssets`（若未通过 drama-pack 导入 visualLock）
2. 资产中心批量出图
3. 进入 Production Agent，按六阶段：导演规划 → 衍生资产 → 分镜表 → 分镜面板 → 分镜图
4. Workbench 视频生成

切回标准模式：

```http
POST /api/project/setWorkflowMode
{ "projectId": 1234567890, "mode": "standard" }
```

---

## 四、drama-pack 字段速查

| 字段 | 来源步骤 | 写入 Toonflow |
|------|---------|---------------|
| `plan.stylePosition` | 步骤 1 | `o_agentWorkData` scriptAgent |
| `plan.adaptationMatrix` | 步骤 1.5 | 同上 |
| `plan.storySkeleton` | 步骤 2 | 同上 |
| `plan.characterBible` | 步骤 2.5–2.7 | 同上 |
| `plan.dialogueStyleAnchor` | 步骤 3.6 | 同上 |
| `plan.visualLock.*` | 步骤 5 | `o_assets`（remark=`lockCode:CHAR-1`） |
| `episodes[].script` | 步骤 3/7.6 | `o_script` |
| `episodes[].storyboard` | 步骤 4 | `o_storyboard` + `o_videoTrack` |
| `episodes[].directorNotes` | 步骤 4.5 | productionAgent flowData |
| `episodes[].keyPrompts` | 步骤 7 | 预填分镜/视频 prompt |
| `productionSpec` | 生产规格书 | `scriptAgent.productionSpec` + 导入时规则合并 |

Schema 定义：[`data/drama-pack.schema.json`](../data/drama-pack.schema.json)

**全字段智能应用详解**（含动画/表演/音效/转场逐字段说明、my-pack 示例与局限）：[`productionSpec-tutorial.md`](./productionSpec-tutorial.md)

### productionSpec 智能合并（v1.2）

提供 `productionSpec` 时可省略 `plan.visualLock`，导入时自动转换。规则采用 **merge 模式**：保留已有 `imagePrompt`/`videoPrompt`，仅注入缺失项。

| productionSpec 区块 | 合并目标 |
|---------------------|---------|
| colorToneMapping / sceneDesign | imagePrompt 色温前缀、videoDesc 光影 |
| performanceBaseline + 分镜 performance | videoDesc 动作位 |
| soundDesign | 空 sound 时补环境音/心跳 |
| dialogueActionSync | 台词镜 videoDesc actionLead |
| transitionRules + transitionType | videoDesc 运镜/转场 |
| imagePromptTemplates | 仅 imagePrompt 为空时生成 |
| constraints | 净化 PURE 镜禁止词 |
| continuityLock | productionAgent flowData |

修改规格书后无需全量重导：

```bash
yarn drama-pack recompose <projectId> <scriptId>
```

生图前刷新（可选）：`batchGenerateImage` 传 `recomposeBeforeGenerate: true`。

---

## 五、质量检查清单（制作前必做）

- [ ] 每角色有 `CHAR-X` 锁定码 + 面部锚点 + ≥2 视觉阶段
- [ ] 分镜含「角色-阶段X」视觉标识
- [ ] 台词验证：独白 ≤12 字、对话 ≤15 字
- [ ] visualLock 与项目 artStyle 一致
- [ ] OSS 公网可访问
- [ ] 单镜 duration ≤ 15s
- [ ] 第 1 集 0–3s / 15s / 30s 感官验收已通过

---

## 六、API 索引

| 接口 | 说明 |
|------|------|
| `POST /api/import/importDramaPack` | 导入 drama-pack |
| `POST /api/import/exportDramaPack` | 导出 drama-pack |
| `POST /api/import/validateDramaPack` | 校验 drama-pack |
| `POST /api/import/recomposeDramaPack` | 按 productionSpec 重合成分镜 prompt |
| `POST /api/project/getWorkflowMode` | 获取剧本工作流模式 |
| `POST /api/project/setWorkflowMode` | 设置 standard / quality |
| `POST /api/script/batchAddScript` | 仅导入剧本（不含分镜） |
| `POST /api/production/storyboard/pollingImage` | 轮询分镜图状态（含生成中与失败 reason） |
| `POST /api/production/storyboard/getGenerateStatus` | 批量分镜生成进度汇总 |

---

## 七、常见问题

**Q：导入后资产关联错乱？**  
A：确保 `storyboard[].assetCodes` 与 `visualLock` 中 `code` 一致；运行 `validate` 检查 `UNKNOWN_ASSET_CODE`。

**Q：云 vendor 报参考图无法访问？**  
A：配置 OSS 公网 URL，确保非 localhost。

**Q：高质量模式 Agent 没有新阶段？**  
A：确认 `setWorkflowMode` 为 `quality` 并重启 Script Agent 对话。

**Q：如何只更新某一集？**  
A：导出后编辑单集，`import` 时加 `"merge": true`，集名相同则覆盖。

---

## 八、CLI 速查

```bash
# 校验
yarn drama-pack validate ./pack.json

# 导入
yarn drama-pack import <projectId> ./pack.json
yarn drama-pack import <projectId> ./pack.json --merge

# 修改 productionSpec 后刷新分镜 prompt
yarn drama-pack recompose <projectId> <scriptId>
yarn drama-pack recompose <projectId> <scriptId> --rebuild

# 导出
yarn drama-pack export <projectId> ./out.json
```

---

## 九、延伸阅读

- **高质量短剧端到端 Playbook**：[`short-drama-quality-playbook.md`](./short-drama-quality-playbook.md) — SOP、质量门禁、已知问题登记
- **Pack 引擎架构**：[`pack-architecture-guide.md`](./pack-architecture-guide.md)
- **人格/脸锚策略**：[`pack-persona-asset-guide.md`](./pack-persona-asset-guide.md)
