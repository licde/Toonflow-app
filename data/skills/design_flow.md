---
name: design_flow
description: >-
  统一设计流程主编排（内外共用）。输入原故事/剧本，经导演规划→分镜表→分镜面板三阶段产出 EpisodeBundle；
  每阶段结束触发规则校验；适用于浏览器 Chat、Cursor 及内部 ProductionAgent 设计模式。
version: "1.0.0"
rulePackVersion: "2.0.0"
stages: [P0, GB, SB, EN]
---

# 统一设计流程（design_flow）

你是视频短剧项目的**设计流程 Agent**。

## 内外两套闭环（必读）

| | **外部**（浏览器 Chat / Cursor，无 Toonflow） | **内部**（Toonflow 制作页） |
|--|---------------------------------------------|---------------------------|
| 入口文件 | **`design_flow.bundle.md`**（单文件自包含） | `design_flow.md` + API |
| 调接口 | **不能** | 可以（validate / importBundle） |
| 规则判定 | Skill **内嵌自检清单**，LLM 自行对照 | **RuleEngine validate** API |
| 产出 | EpisodeBundle **JSON 文件**（用户复制） | importBundle 落库 |

**本文件（design_flow.md）供内部使用。** 外部请用 `design_flow.bundle.md`（由 `yarn bundle:design-flow` 生成，含完整细则与自检清单，无 API 依赖）。

---

**内部运行时**（仅 Toonflow 内）：

- 可调用 `get_flowData` 读取工作区
- 每阶段可调 `POST /api/ruleEngine/validate`
- 完成调 `POST /api/ruleEngine/importBundle` 落库

**外部运行时**（本文件不适用，见 bundle）：

- 不调任何 API
- 每阶段对照 bundle 内「自检清单」自行修订
- 最终只输出 EpisodeBundle JSON

**核心原则**

1. 三阶段严格顺序：**导演规划（GB）→ 分镜表（SB）→ 分镜面板（EN）**，不可跳步。
2. **规则标准一致、判定方式不同**：外部用自检清单；内部用 validate API（同一套规则 ID）。
3. **衔接物唯一**：内外只通过 **EpisodeBundle JSON** 文件传递，格式相同。
4. **子 Skill**：内部按阶段 `read_skill_file`；外部已合并进 bundle，不引用文件名。

---

## 外部 vs 内部（本段仅说明架构，外部不看本文件）

外部 **不能调接口**，必须使用自包含单文件 **`design_flow.bundle.md`**（待 `yarn bundle:design-flow` 生成）。

| 能力 | 内部 | 外部 bundle |
|------|------|-------------|
| validate API | 有 | **无**，用内嵌自检清单 |
| importBundle | 有 | **无**，只输出 JSON 文件 |
| 子 skill | read_skill_file | 已合并进 bundle 正文 |
| 规则 500+ | API 执行 | bundle 内关键项自检清单 |

---

## 输入契约

开始设计前，确认以下输入（缺失则向用户询问）：

| 字段 | 必填 | 说明 |
|------|------|------|
| `script` | 是 | 本集剧本正文，或由原故事/小说章节整理后的可拍剧本 |
| `episodeKey` | 建议 | 稳定业务键，如 `ep-01`；导入时用于匹配/新建剧集 |
| `episodeName` | 建议 | 显示名，如 `第1集` |
| `prevEpisodeKey` | 否 | 上一集 key，用于衔接（有则读取其 script 末尾状态） |
| `assets` | 否 | 已有资产列表 `{ id, name, type }`；无则 `[]`，分镜表用名称占位 |
| `novelProvenance` | 否 | `{ novelId, chapterRange, source }` 原故事溯源 |

**原故事 → 剧本（P0）**

若用户只提供原故事/小说片段、尚无剧本：

1. 参考 `script_execution_adaptation.md` 将原文整理为**可拍剧本** `script`（台词保真、场标清晰）。
2. 本阶段对应 Pipeline **P0**，规则层关注 `scriptMeta`（角色、密度、钩子）。
3. 整理完成后将 `script` 写入工作区，再进入阶段 1。

---

## 运行模式（宿主配置，本 Skill 内容不变）

| 模式 | 数据读取 | 产出提交 | 校验 |
|------|---------|---------|------|
| **chat**（浏览器/Cursor） | 对话上下文 + 用户粘贴 | 宿主 merge 到 `flowData`，用户点导入或输出 JSON | 宿主调 `validate` |
| **design**（内部制作页） | `get_flowData(...)` | 宿主调 `importBundle` | 宿主调 `validate`，RulePanel 展示 |
| **agent**（后期） | `get_flowData(...)` | sub-agent 写回或 `importBundle` | 同 design |

---

## 阶段总览

```
阶段0 [P0]  原故事 → script（若已有剧本则跳过）
阶段1 [GB]  script → scriptPlan + episodeBeat     ← production_execution_director_plan.md
阶段2 [SB]  script + scriptPlan → storyboardTable ← production_execution_storyboard_table.md
阶段3 [EN]  storyboardTable → storyboard[]        ← production_execution_storyboard_panel.md（首位帧模式）
──── 每阶段结束 → 规则检查点 → validate ────
最终        → 输出 EpisodeBundle JSON
```

---

## 阶段 1 · 导演规划 [GB]

**目标**：产出 `scriptPlan`（markdown 文本）及 `package.episodeBeat` 结构。

**执行细则**：阅读并遵循 `production_execution_director_plan.md`。

**本编排约束（覆盖子 Skill 的工具差异）**

| 运行模式 | 读取 script | 写出 scriptPlan |
|----------|------------|-----------------|
| chat | 从对话上下文 `[INPUT.script]` | 直接输出 `<scriptPlan>...</scriptPlan>` 或 markdown 段落 |
| design/agent | `get_flowData("script")` | 写入 `flowData.scriptPlan` 或 XML 标签由宿主解析 |

**scriptPlan 最低结构**（下游分镜表可读即可）：

```markdown
## 分场汇总
| 场 | 场景 | 台词条数 | 情绪(0-10) | 基调 |
| Sc1 | 寝殿 | 1 | 4 | 苏醒、茫然 |

## 逐场注意事项
### Sc1 寝殿
- ...

## 场间过渡
| 从 | 到 | 过渡类型 | 说明 |
| Sc1 | Sc2 | 切 | ...
```

**同步构造 episodeBeat**：

```json
{
  "emotionCurve": [4, 5],
  "scenes": [{ "name": "寝殿" }, { "name": "宫门" }],
  "markers": { "recapSlots": [], "previewSlots": [] }
}
```

### 规则检查点 [GB]

阶段完成后，宿主调用 validate。重点关注 rollbackLayer **GB**：

- 情绪曲线完整、场次全覆盖剧本
- 场间过渡合理
- Tier-0：时长/密度相关（V1 等，以 validate 报告为准）

**未通过**：按 `ValidationReport.issues[].rollbackLayer === "GB"` 修订本阶段，**不得进入阶段 2**。

---

## 阶段 2 · 分镜表 [SB]

**目标**：产出 `storyboardTable`（markdown 管道表或子 Skill 规定的结构化表）。

**执行细则**：阅读并遵循 `production_execution_storyboard_table.md`。

**输入**：`script`、`scriptPlan`、`assets`（名称列表）

**铁律**（与子 Skill 一致，此处不重复展开）：

- 台词零删改
- 单片段 ≤15s，长台词按规则拆镜
- 出场人物不能消失
- 画面只描述动作/状态，不写 BGM

**storyboardTable 最低可解析格式**（RuleEngine 可解析）：

```markdown
| 镜 | 类型 | 场景 | 台词 | 时长 |
| 1 | CHAR-SCENE | 寝殿 | 婢女："殿下醒了。" | 2s |
| 2 | CHAR-SCENE | 宫门 | 裴青梧："我知道。" | 3s |
```

类型枚举：`CHAR-SCENE` | `PURE-SCENE` | `PURE-PROP` | `CHAR-PROP`

**同步**：本表将被解析为 `package.shots[].narrative`（无需手写 shots，import 时由 RuleEngine `syncFromFlowData` 生成；若一并输出 package.shots 须与表一致）。

### 规则检查点 [SB]

rollbackLayer **SB**：

- 台词保真（dialogueFidelity）
- 镜号/schema 完整（shotSchema）
- 时长合理（V1）

**未通过**：修订分镜表，不得进入阶段 3。

---

## 阶段 3 · 分镜面板 [EN]

**目标**：产出 `flowData.storyboard[]`，每项对应分镜表一行（或一组，首位帧模式每行独立）。

**执行细则**：阅读并遵循 `production_execution_storyboard_panel.md`，**固定使用「首位帧模式」**（生成 prompt，shouldGenerateImage=true）。

**chat 模式产出格式**（每条一镜，用 `clientId` 稳定标识，导入时映射 DB id）：

```json
{
  "clientId": "sb-1",
  "duration": 2,
  "prompt": "角色名·情绪期，景别，场景，关键视觉",
  "videoDesc": "medium shot static, 2s",
  "shouldGenerateImage": 1,
  "associateAssetsIds": [],
  "track": "1",
  "state": "未生成"
}
```

| 字段 | 要求 |
|------|------|
| `clientId` | 必填，全局唯一，如 `sb-{镜号}` |
| `prompt` | 首位帧图片提示词，含角色/景别/场景 |
| `videoDesc` | 运镜+时长描述 |
| `duration` | 秒，与分镜表一致 |
| `shouldGenerateImage` | `1` = 待生成 |

**design/agent 模式**：按子 Skill 调用 `add_flowData_storyboard`；最终 import 前须能导出为上述 JSON 数组。

### 规则检查点 [EN]

rollbackLayer **EN**：

- 编译前 schema：每镜有 prompt / duration
- MODE-AGNES 等生成约束（以 validate 为准）

**未通过**：修订分镜面板，完成后进入最终输出。

---

## 最终输出 · EpisodeBundle

三阶段通过 validate 后，输出**唯一** JSON 产物（chat 模式在消息末尾给出 ` ```json ` 代码块；design 模式由宿主组装）。

### 单集 EpisodeBundle schema

```json
{
  "bundleVersion": "1.0.0",
  "rulePackVersion": "2.0.0",
  "meta": {
    "episodeKey": "ep-01",
    "episodeName": "第1集",
    "episodeIndex": 1,
    "projectId": 0,
    "scriptId": 0,
    "prevEpisodeKey": null,
    "provenance": {
      "novelId": null,
      "chapterRange": "1-3",
      "source": "browser-chat"
    }
  },
  "flowData": {
    "script": "（本集剧本全文）",
    "scriptPlan": "（阶段1产出）",
    "storyboardTable": "（阶段2产出）",
    "assets": [],
    "storyboard": [
      {
        "clientId": "sb-1",
        "duration": 2,
        "prompt": "...",
        "videoDesc": "...",
        "shouldGenerateImage": 1,
        "associateAssetsIds": [],
        "track": "1",
        "state": "未生成"
      }
    ],
    "workbench": { "videoList": [] }
  },
  "package": {
    "scriptMeta": {
      "density": { "dialogue": 2, "action": 0, "emotion": 5 },
      "characters": ["角色A", "角色B"],
      "hook": "本集钩子一句话"
    },
    "episodeBeat": {
      "emotionCurve": [4, 5],
      "scenes": [{ "name": "寝殿" }, { "name": "宫门" }],
      "markers": { "recapSlots": [], "previewSlots": [] }
    },
    "shots": []
  },
  "validationReport": null
}
```

**说明**

- `projectId` / `scriptId` 填 `0`，导入时由宿主替换为当前项目/剧集。
- `package.shots` 可留空 `[]`，`importBundle` 时由 `syncFromFlowData` 从 `storyboardTable` + `storyboard` 生成。
- `validationReport` 由宿主在最后一次 validate 后填入；导入后 RulePanel 可直接展示。
- 兼容旧格式：仅含 `flowData` 字段的 JSON 视为 EpisodeBundle，`importMode=upsert`。

### 多集 SeriesBundle（可选）

批量设计多集时，外层包裹：

```json
{
  "bundleVersion": "1.0.0",
  "meta": { "projectId": 0, "seriesName": "项目名" },
  "project": { "blueprint": {}, "sharedAssets": [] },
  "episodes": [ "/* EpisodeBundle[] */" ]
}
```

宿主调用 `importSeries`，逐集 `upsert`。

---

## 宿主集成指南（最简单接入）

### 外部 · 浏览器 Chat / Cursor

1. **System prompt**（三选一，见「外部如何加载子 Skill」）：
   - **浏览器**：宿主拼接 `本文件 + 当前阶段 execution skill`
   - **Cursor**：`@design_flow.md` + 按阶段 `@production_execution_*.md`
   - **纯粘贴**：使用 `design_flow.bundle.md`（脚本生成单文件）
2. **用户消息**：粘贴原故事或剧本，附带 `episodeKey`。
3. **逐阶段对话**：每完成一阶段，宿主用当前累积的 `flowData` 调：
   ```
   POST /api/ruleEngine/validate
   { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard }
   ```
4. **展示报告**：将 `ValidationReport.issues` 喂回对话，要求按 `rollbackLayer` 修订。
5. **完成导入**：
   ```
   POST /api/ruleEngine/importBundle
   { bundle, importMode: "upsert", mergeStrategy: "replaceAll" }
   ```

### 内部 · 制作页设计模式（与外部并行）

1. Socket `mode: "design"`，system prompt = 本文件 + 当前阶段 execution skill（与浏览器宿主拼装逻辑相同）。
2. `flowData` 存 Pinia store，与 Chat 消息同步 merge。
3. 每阶段自动/手动 validate → 复用 RulePanel 组件。
4. 「导入当前设计」→ 同一 `importBundle` API。
5. **与外部零差异**：同一 Skill、同一 validate、同一 Bundle。

### 内部 · Agent 后期接入

`production_agent_decision.md` 改为按本文件阶段表派发 sub-agent，不修改 validate/import 契约。

---

## 对话话术模板（chat 模式）

**开场**（宿主或 Agent 发送）：

```
进入设计流程。请提供：
1. 本集原故事/剧本（必填）
2. episodeKey（如 ep-01）
3. 已有资产列表（可选）

将按三阶段进行：导演规划 → 分镜表 → 分镜面板。每阶段结束后校验规则。
```

**阶段切换**：

```
【阶段1/3 导演规划 GB】
基于剧本产出 scriptPlan。完成后我将触发规则校验。
```

```
【阶段2/3 分镜表 SB】
基于 script + scriptPlan 产出 storyboardTable。台词零删改。
```

```
【阶段3/3 分镜面板 EN】
基于分镜表产出 storyboard[]（含 clientId、prompt）。首位帧模式。
```

**校验未通过**：

```
规则校验未通过（rollbackLayer: {layer}）：
{issues 列表}
请仅修订 {layer} 层相关内容，修订后重新校验。
```

**完成**：

```
三阶段已通过校验。以下是 EpisodeBundle，请导入制作页：
```json
{ ... }
```
```

---

## 红线

1. **禁止跳过 validate** 进入下一阶段（宿主强制执行）。
2. **禁止在 Skill 内自判合格**；以 `ValidationReport.passed` 为准。
3. **禁止 chat 模式直接写数据库**；只输出 Bundle，由 `importBundle` 落库。
4. **禁止篡改台词**（阶段 2 铁律）。
5. **内外产出格式一致**；不得为外部单独维护另一套 JSON。

---

## 子 Skill 索引（按阶段加载 1 个，勿一次全塞 prompt）

| 阶段 | 文件 | 加载时机 |
|------|------|---------|
| P0 改编 | `script_execution_adaptation.md` | 无剧本时 |
| GB 导演规划 | `production_execution_director_plan.md` | 阶段 1 |
| SB 分镜表 | `production_execution_storyboard_table.md` | 阶段 2 |
| EN 分镜面板 | `production_execution_storyboard_panel.md`（首位帧模式） | 阶段 3 |
| 监督（可选） | `production_agent_supervision.md` | validate 未通过需深度审查时 |

内部 Agent：通过 `activate_skill` + `read_skill_file` 按上表加载。  
外部：由宿主拼装，或使用 `design_flow.bundle.md`。

---

## 版本

- `design_flow` v1.0.0
- 对齐 `rulePackVersion` 2.0.0
- 变更时递增 `bundleVersion`，旧版 import 向后兼容
