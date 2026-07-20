# Asset Code Contract (SSOT)

## Preferred export

`CHAR-<ASCII_SLUG>` / `SCENE-<SLUG>` / `PROP-<SLUG>` — uppercase pinyin/slug, e.g. `CHAR-QINGCI`.

## Dual accept

| Form | Canonical |
|------|-----------|
| `CHAR-005` / `CHAR005` / `CHAR 5` | `CHAR-005` |
| `CHAR-QINGCI` / `CHAR_QINGCI` | `CHAR-QINGCI` |

Rejected as primary: CJK in code, `ROLE-*`, underscore-primary without normalize.

## Closure

Every code in `charCodes` / `--cref` / `--sref` must exist in CD/VLT or import stub + report.

## Implementation

`src/ruleEngine/codes/assetCodeContract.ts` — FE mirrors in `promptRefs.ts`.
