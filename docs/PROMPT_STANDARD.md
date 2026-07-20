# PROMPT_STANDARD · Browser Chat v2.0.1

> **同一份标准**：Chat 按此生成；外部 `inspectBundle` / `dryRun` 按此验收。  
> 参考：`data/skills/browser_chat/production/MD_modality_*.md`、`data/fixtures/agnes_vendor_gates.json`、`data/fixtures/video_audio_policy.json`

## 1. 每镜四槽（T3 必填）

| 槽位 | JSON 路径 | 必填条件 |
|------|-----------|----------|
| IMG | `preDesignPack.shots[].generation.imagePrompt` 或 `flowData.storyboard[].prompt` | 每镜 |
| VID | `generation.videoPrompt` 或 `flowData.storyboard[].videoDesc` | 每镜 |
| AUD | `generation.audioPrompt` | 有台词/OS/VO 的镜 |
| FX | `generation.fxPrompt` | 有 visualEffect 或特效标记的镜 |

## 2. 图像 prompt（IMG）

**结构（tag-stack-zh）**：`主体, 场景, 构图, 光线, 风格, negative, --cref CHAR-CODE`

**示例（CHAR-SCENE）**：
```
温之明, 寝殿内景烛火暖光, 中景半身, 侧光4500K, 古言写实电影感, no text watermark, --cref CHAR-WZM --ar 16:9
```

**PURE-SCENE**：前 10 词含 `no people, no characters`。

**BLOCK**：缺 `--cref`（CHAR 镜）、cref 无法在 `visualLockTable` 解析。

## 3. 视频 prompt（VID）

**结构（motion-from-frame）**：`景别 + motion + duration + lipSync 策略`

**示例**：
```
中景 static, slow push 2s, duration 3s, lipSync off, motion-from-frame
```

**Agnes**：`generate_audio` 按 `video_audio_policy.json`；duration 1–30s。

## 4. 音频 prompt（AUD）

有 `narrative.dialogue.lines` 的镜须含：
```
角色名, 音色描述, 语速, 情绪强度, dialogue:true
```

系统音/旁白标注 `type: system|vo|os`。

## 5. 特效 prompt（FX）

```
effect: 轻微粒子光晕 | level: F1 | degrade: static overlay
```

须与 `fxFeasibilityAudit` 等级一致（F0–F5）。

## 6. T2 前置（生成 prompt 前）

| 字段 | 说明 |
|------|------|
| `characterDesign.assets[]` | 每角色 L0–L3 + CHAR-CODE |
| `visualLockTable.characterAssets` | 与 CD 同步 |
| `visualLockTable.sceneColorLock` | SCENE-CODE + 色温 |
| `assetPipeline` | 场景/道具缺口 |

## 7. T1 前置（SB）

- 剧本台词 **100% 覆盖**（可合并多句入一镜，不可丢句）
- 每镜 `visualDescription` 非空
- **禁止**在 bundle 中填 `ruleAudit.pass` / `linkageAudit` / `externalHashCheck.match` 假数据

## 8. 外部校验 checklist

```
[ ] 台词覆盖率 = 100%
[ ] 每镜 visualDescription 非空
[ ] characterDesign.assets.length ≥ 剧本主要角色数
[ ] visualLockTable 可解析全部 charCodes
[ ] 每镜 imagePrompt 非空
[ ] 每镜 videoPrompt 非空 + duration
[ ] 台词镜 audioPrompt 非空
[ ] 特效镜 fxPrompt 非空（如有 visualEffect）
```

报告格式：`{ "id": "CHAT-IMG-01", "shotIndex": 3, "message": "缺 imagePrompt" }`

## 9. shotDesign → prompt roundtrip（GEN）

T2+ 每镜可选 `shotDesign`（composition/blocking/performance/cameraAnchor/lipSyncPolicy）。

| shotDesign | imagePrompt | videoPrompt |
|------------|-------------|-------------|
| composition.foreground + blocking.bodyAction | subject 动作 | motion 参考 |
| performance.microExpression | 首帧 eyes/mouth 词 | **不写**（QF-EXPR-06） |
| cameraAnchor.bgBlur | bokeh/blur | static/slow push |
| lipSyncPolicy=subtle_natural | — | `subtle lip sync, natural mouth movement` |

验收：`inspectBundle.generationApplyGaps`（GEN-01~07）；参考 `compileFromShotDesign`。

## 10. Tier 分级（inspectBundle / closureReport）

| Tier | 模态四槽 missing | chatPromptGaps BLOCK |
|------|------------------|----------------------|
| T1 | 跳过 MD×4 / MOD 域 | 仅台词/SB |
| T2 | 跳过 video/audio/fx missing | + CD/BP |
| T3 | 全检 IMG/VID/AUD/FX | 全检 |

`auditAllBundleGaps(bundle, tier)` 与 `auditChatPromptGaps(bundle, tier)` 须传入正确 tier，避免 T1/T2 误报 T3 模态 missing。

## 视频质量链（摘要）

完整契约见 [video-quality-chain.md](./video-quality-chain.md)。要点：

1. **意图优先**：`implementationPlan` → `buildPromptIR` 写回四槽；Chat stub（如 `中景 static, duration 2s`）不得阻断。
2. **语言**：`[Audio]` / `audioPrompt` 写源语言台词；运镜壳英文。
3. **时长**：`max(shot, lipMin)` 后厂商桶 snap；超预算拆镜。
4. **消毒**：`sanitizeVideoPrompt` 消解 No dialogue∩台词、多 duration/景别、重复 motion-from-frame。
5. **FX**：`fxLevel≠F0` 必须可执行散文，禁止 `fxPrompt:"F2"` 洗绿。
