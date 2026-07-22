---
name: CD_character_design
description: CD 角色智能设计 L0-L6 与 art_skills
stageId: CD
outputTag: characterDesign
rulePackVersion: "2.0.1"
---

# CD 角色智能设计（L0–L6）

T2 档位：从 G1 + script 提取角色，产出 L0–L6 结构化描述，对齐 art_skills 前缀。

## 入口条件

- T1 已通过或并行 T2 启动
- globalAnchors.G1.characterSoul 可用
- art_skills 前缀已选（如 realpeople_urban_modern）

## 出口 / CAST

- export 前：dialogue speakers ∪ 上镜码 ⊆ characterDesign.assets 且非 stub-only（DC-16）
- **APP / UI / 系统** 不可作 speaker — 改 `type` 或旁白策略（DEX-SPEAKER-BARE）
- **CD.name 裸名**：禁 `沈清漪（OS）`；OS 用 dialogue `type=os`（DEX-STILL-OS-NAME；导入同剥）
- reverseTarget=CD；修后可 `design_split_forward_reentry` 再正推
- 静帧假双脸反推主链在 **SB**（改 visualDescription），非只补定妆册 regen

## L0–L6 层级

| 层 | 字段 | 说明 |
|----|------|------|
| L0 | identity, age, gender | 身份与基础属性 |
| L1 | face, skin, expression | 面部特征 |
| L2 | hair, bodyType | 发型体态 |
| L3 | costume, accessories | 服装配饰 |
| L4 | posture, gesture | 姿态习惯 |
| L5 | voice.speed, timbre, accent | 音色（AUD 用） |
| L6 | arcVisual, stateVariants | 弧光视觉变化 |

**键名规范（权威短键）**：输出 `L0`…`L6`，不要用 `L0_identity` / `L6_arcVisual` 长键。`stateVariants` 用数组 `[{ "name", "visual" }]` 或 record（导入会归一）。

## 执行步骤

1. 从 designBrief.B6 + script 提取角色列表
2. 读取 G1.characterSoul 锁定内核与 voiceStyle
3. 按 art_skills 前缀填 L0–L6
4. 分配 CHAR-CODE（CHAR-001 递增）
5. 写入 visualLockTable.characterAssets（供 BP）

## 输出

写入 bundle 顶层 `characterDesign`（import 落库 blueprint）。详见 `docs/PROMPT_STANDARD.md` §6。

```json
{
  "characterDesign": {
    "rulePackVersion": "2.0.1",
    "assets": [
      {
        "code": "CHAR-001",
        "name": "女主",
        "L0": { "identity": "真千金", "age": "22", "gender": "女" },
        "L1": { "face": "鹅蛋脸", "skin": "白皙" },
        "L2": { "hair": "黑长直及腰" },
        "L3": { "costume": "白色连衣裙" },
        "L4": { "posture": "背挺直" },
        "L5": { "speed": "正常", "timbre": "清冷" },
        "L6": { "arcVisual": "隐忍→锋芒" }
      }
    ]
  }
}
```

## BLOCK 闸门

- 剧本出场主角/反派均有 CHAR-CODE（canonical `CHAR-NNN`，见 `docs/ASSET_CODE_CONTRACT.md`）
- **凡 `preDesignPack.shots[].charCodes` 或 imagePrompt `--cref` 出现的码，必须写入 `characterDesign.assets` 与 `visualLockTable.characterAssets`**（禁止只引用不收录，如 CHAR-005）
- **DC-16 / DG-CD-COVERAGE**：对白 `speaker` ∪ B6.characters ∪ 上镜码必须入 CD；禁止仅 `L0.stub` 过闸；最小骨架为 `code` + `name` + `L0.identity`（一句身份关系）。L1–L3 视觉可后置由资产 AI 补全，但导出前不得缺人设壳
- **反例**：B6 含「侍女」但 `characterDesign.assets` 无对应项 → BLOCK；导入 stub **仍** BLOCK
- **正例**：`{ "code": "CHAR-SHINV", "name": "侍女", "L0": { "identity": "沈府贴身侍女，报信出场" } }`
- 修复话术：按 exportGate `chatRepairText` 中 RH-DC-16 补真实 CD → **再点预览/exportGate** 直至 `exportAllowed`
- 码别名（`CHAR005` / `CHAR 005`）导出前归一为 `CHAR-005`
- L0–L3 必填（设计完整态）；L5 主角必填；键名用短键 `L0`…`L6`（勿只输出 `L0_identity` 长键）
- 与 G1 说话风格/记忆点一致
- 禁止自由文本替代 L 层结构

## 下游

→ AS_asset_pipeline → BP_blueprint。资产层可对弱视觉做 AI 补全出精图；**不得**用 import stub 代替本阶段入册。
