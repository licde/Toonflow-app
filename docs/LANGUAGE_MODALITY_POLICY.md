# Language modality policy (SSOT)

| Layer | Language | Notes |
|-------|----------|--------|
| `audioPrompt` / native AUD | **Source language** (usually Chinese lines + voice tags) | Spoken content must match `dialogue.lines` language |
| Video motion / camera / style shell | **English** tags allowed | e.g. `static`, `motion-from-frame`, `subtle push` |
| Dialogue text inside `videoPrompt` | Prefer keep source; **forbid translating lines into English** for native-audio vendors |

Gate: `LANG-AUD-01` blocks English spoken clauses in Chinese-dialogue shots.
