---
name: corridor_EN
description: EN 分镜面板走廊 — Y 映射 compile，锚点保护
stageId: EN
outputTag: storyboard
rulePackVersion: "2.0.1"
---

# 走廊 EN · Y 映射编译

质量走廊第三阶段（T2）：shots[] → storyboard[] EN 面板，执行 **Y 映射 compile**。保护 G/BP 锚点不漂移。

## 入口条件

- T1 preDesignPack.shots[] 已通过
- T2 档位：CD/AS/BP 已完成，visualLockTable 可用

## Y 映射五域

| 域 | 输入 | 输出字段 | 锚点保护 |
|----|------|----------|----------|
| subject | shot + CHAR-CODE | compiled.image.part1 | G1 + L0-L6 |
| spatial | shotSize + scene | spatialRelation | SCENE-CODE |
| performance | emotionIntensity | performance | QF-EXPR-01 |
| lighting | GB 情绪（非光影细节） | lightQuality | sceneColorLock |
| refs | BP visualLockTable | refs[] | anchorProps |

## 锚点保护规则

1. CHAR-CODE 必须存在于 visualLockTable.characterAssets
2. SCENE-CODE 必须存在于 sceneColorLock
3. PROP-CODE 必须存在于 anchorProps（V5）
4. compile 不得改写 narrative.dialogue.lines（R2 只读）
5. compiledHash 含 rulePackVersion + modelId + artStyle

## 执行步骤

1. 逐 shot 读取 narrative + visualLockTable
2. 按 Y 映射生成 generation 字段
3. 校验 refs 全部 resolve 到 BP CODE
4. 计算 compiledHash per shot
5. 写入 **ScriptBundle** `preDesignPack.shots[].generation` 与/或 `flowData.storyboard[]`

## BLOCK 闸门

| ruleId | 条件 |
|--------|------|
| V4-V6 | CODE 引用合法 |
| V12-V15 | 锚点未漂移 |
| R2 | lines 字段未被 compile 修改 |
| B11 | 首位帧模式 Agnes 链完整 |

## 严禁

直接调用生成 API；绕过 visualLockTable 用 sceneName 代替 CODE。

## 下游

通过 → MD_modality_overview（T3）；锚点漂移 → rePush BP 或 EN。
