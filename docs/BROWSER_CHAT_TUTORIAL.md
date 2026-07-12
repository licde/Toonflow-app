# Browser Chat 分步实施教程 v2.0.1

面向**人类操作者**的分步指南。LLM 用 `data/skills/browser_full_flow.bundle.md`；本教程说明如何配置、对话、导出与反推。

## 1. 准备

### 1.1 选择载体

| 方式 | 路径 | 适用 |
|------|------|------|
| 单文件 bundle | `data/skills/browser_full_flow.bundle.md` | 复制全文为 System Prompt |
| 多文件套件 | `data/skills/browser_chat/` + `manifest.json` | 按需挂载 stage skill |

### 1.2 版本

- `rulePackVersion`: **2.0.1**
- 重新生成 bundle：`yarn bundle:browser-full-flow`

### 1.3 样例

- T1 出口：`data/fixtures/script-bundle-template-v2.json`
- 黄金反例：`data/fixtures/golden/`

---

## 2. 路径与档位

### 2.1 路径

- **改编**：P0 → P03 → P06 → P08 → [P09] → G → W1 → W2 → W3
- **原创**：G → W1 → W2 → W3

### 2.2 档位

| 档位 | 产出 | 禁止 |
|------|------|------|
| T1 | ScriptBundle + preDesignPack | 四模态 prompt |
| T2 | CD/AS/BP + EN 草案 | 跳过 corridor |
| T3 | MD×4 + modalityPromptAudit | 跳过 Touch L0 |

---

## 3. T1 默认流

1. **W3**：产出剧本 + 场结构；自检 R2/H3/W12
2. **designBrief**：情绪曲线、视觉锁、info 链
3. **GB → SB**：导演规划 + 分镜表（duration、lines、type）
4. **T1_quality_gate**：externalHashCheck.match=true
5. **导出** JSON，字段见 `script-bundle-template-v2.json`

对话要点：「按 T1 出口，不要写 image/video/audio prompt」

---

## 4. T2 扩展

1. **CD**：角色设计 L0（gender、voice）
2. **AS**：资产 pipeline
3. **BP**：蓝图 + visualLockTable
4. **corridor_EN**：compile 草案，不写 API

---

## 5. T3 · 四模态

在 EN 通过后，逐镜生成四模态 prompt。

### 5a IMG 图片

- CHAR-SCENE 须 `--cref CHAR-CODE`
- PURE-SCENE 前 10 词：`no people, no characters`
- Agnes：tag-stack-zh，无 negative 通道
- 自检：SD-IMG-01/02 → PC-11

### 5b VID 视频（Agnes 默认）

1. 生成**首位帧**分镜图
2. singleImage 引用首帧，**禁止改面部**（QF-EXPR-06）
3. motion 白名单：slow pan / gentle push
4. duration 1–30s 与 SB 一致
5. 台词镜：`videoAudioPolicy=native`，`generate_audio=true`
6. 自检：SD-VID-01~04 → PC-09

### 5c AUD 音频

- lines 与 SB hash 一致（R2/H3）
- voiceProfile 对齐 BP L6
- **native**：dialogue-native（Agnes 台词镜）
- **post**：TTS-dubbing（kling/wan 等）
- OS/VO 分型（PR-10）
- 自检：SD-AUD-01~04 → PC-10

### 5d FX 特效

- 查 `fx_feasibility_matrix` F0–F5
- F≤3：可写入 VID prompt
- F4：postProductionOnly，仅基底
- F5：必须 degrade 或拆镜，**禁止未降级 export**
- 自检：SD-FX-01~03 → PC-12

### 5e 跨模态

- **identityAudit**：IMG/VID/AUD 性别/音色一致 → PC-14
- **modalityPromptAudit**：四 slot 齐全 → PC-13
- 跑 `MD_prompt_compliance`，passRate ≥ 90%

---

## 6. 导出前 dryRun

T3 export 前对照 `production_closure_checklist.json` PC-01~14：

| PC | 域 |
|----|-----|
| PC-01/14 | identityAudit |
| PC-02/12 | fxFeasibility |
| PC-09 | VID 首帧/时长 |
| PC-10 | AUD native/voice |
| PC-11 | IMG cref |
| PC-13 | 四 slot 齐全 |

本地验证：

```bash
yarn test:production-closure-golden
```

---

## 7. 导入 Toonflow

1. T1：`POST /api/ruleEngine/importScript` 或 UI `#/production?import=1`
2. T3：`importBundle`（含 modalityPromptAudit）
3. `dryRunImport` 运行 PC-01~14（与 Chat export 共用）
4. validate → RulePanel → 生成

---

## 8. 失败反推决策树

**优先级**：VID/IMG (P0) → AUD (P1) → FX (P1) → EN 跨模态 (P2) → SB/W3 (P3)

```
生成失败
├─ 首位帧/运镜/时长？ → 先修 MD-VID / EN，再 SB
├─ cref/PURE/identity？ → 先修 EN-IMG / BP
├─ 语音/lines/native？ → 先修 EN-AUD / BP L6
├─ F5/F4 特效？ → 先修 SB/W3 降级
└─ 叙事/PR/graph？ → presentationFork P1改剧本 / P2改分镜
```

见 `reverse_route_table.json` 与 §15 附录 P。

---

## 9. 黄金样例与测试

```bash
yarn bundle:browser-full-flow
yarn test:bundle-roundtrip
yarn test:production-closure-golden   # G72–G85
```

| Golden | 预期 |
|--------|------|
| identity-mismatch-block | PC-14 BLOCK |
| fx-f5-block | PC-02 BLOCK |
| vid-first-frame-block | PC-09 BLOCK |
| img-cref-block | PC-11 BLOCK |
| aud-voice-block | PC-10 BLOCK |

---

## 10. 设计七维专章（§16–§17）

T1 七维正推：`W3 → designBrief(B12/B13) → GB → SB`；每维挂载 SD-D + LINK 十链审计。

| 维 | 关键自检 | 反推 |
|----|----------|------|
| 台词 | R2/H3 hash | SB → W3 |
| 场景 | B6 ↔ sceneName | SB |
| 故事 | B5 ↔ markers | W1/W3 |
| 运镜 | PR-CAM-01 白名单 | EN |
| 视听 | B4 ↔ emotionCurve | GB |
| 改编 | P03→W2→W3 | P/W |
| 编译(T3) | PC-09~14 | EN/MD |

统一 dryRun：`yarn test:unified-closure-golden`（G86–G115）

四级合流：**DC**（设计 T1）+ **PC**（制作 T3）+ **GC**（生成后）+ **IC**（QP/W93）

---

## 11. 文档对照

| 文档 | 读者 |
|------|------|
| `browser_full_flow.bundle.md` | LLM System Prompt |
| **本教程** | 人类操作者 |
| `DESIGN_FLOW_GUIDE.md` | 架构与 yarn 命令 |
| `EXTERNAL_REVISION_GUIDE.md` | 导入 API 与往返 |
