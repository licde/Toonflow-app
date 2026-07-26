# Language modality policy (SSOT)

| Layer | Language | Notes |
|-------|----------|--------|
| `audioPrompt` / native AUD | **Source language** (usually Chinese lines + voice tags) | Spoken content must match `dialogue.lines` language |
| Video motion / camera / style shell | **Chinese** product egress (`LANGUAGE_POLICY.videoMotionShell=zh`) | EN whitelist tokens may map at vendor adapter only (`静止`↔`static`, `缓慢横移`↔`slow pan`, …) |
| Dialogue text inside `videoPrompt` | Prefer keep source; **forbid translating lines into English** for native-audio vendors |

Gate: `LANG-AUD-01` blocks English spoken clauses in Chinese-dialogue shots. Finalize strips EN boilerplate (`QF-EXPR-06`, `keep face identity`, `continues from`, …).
