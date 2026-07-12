# 设计联动 B+H1

rulePackVersion: 2.0.1

## designBrief

- [ ] **B1** B1 — 检测方式：提取dialogue中的关键词，检查与emotionIntensity是否匹配
- [ ] **B2** B2 — 见V90
- [ ] **B3** B3 — 在B3检查中，对每句台词进行'换角色测试'，若换给其他角色后仍然自然成立，则判定为该台词风格化不足（未绑定角色）。检测方式：人工标记或使用角色背景匹配度检查
- [ ] **B4** B4 — 检查performance.hands/bodyWeight是否与dialogue情绪一致
- [ ] **B5** B5 — 见B11
- [ ] **B6** B6 — 见V92
- [ ] **B7** B7 — 检查情绪转折点是否有dialogue变化或performance变化
- [ ] **B8** B8 — 检查信息揭示点的visualFocus层级
- [ ] **B9** B9 — 检测emotion上升段与rhythmZone变化的同步性
- [ ] **B10** B10 — 检查sceneName与emotionIntensity的匹配
- [ ] **B11** B11 — 每镜emotionIntensity必须同时满足：①actStructure中该幕的emotionCap上限；②sceneColorLock中该场景的B10范围。检测方式：逐镜比对两个条件的交集

## validate

- [ ] **H1** H1 — 检测方式：对每层的关键字段，检查上一层是否有对应的设计依据

