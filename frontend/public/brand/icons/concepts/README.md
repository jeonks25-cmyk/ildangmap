# 아이콘 시안 v4 (검토용)

> **프로덕션:** `concepts/app-icon-v4-2-hammer.svg` (2안 망치) — `npm run icons:generate`

## 방향

- **1차:** 흰색 지도핀 (지도 서비스 인 recognition)
- **2차:** 핀 내부 건설/현장 요소 (안전모 · 망치)
- v3 대비 심볼 **~18% 축소** (`scale 0.68`), safe area **128px**

## 시안

| 파일 | 설명 |
|------|------|
| `app-icon-v4-1-helmet.svg` | 1안 — 핀 내부 노란 안전모 |
| `app-icon-v4-2-hammer.svg` | **2안 — 핀 내부 망치 (프로덕션)** |
| `app-icon-v4-3-combo.svg` | 3안 — 핀 내부 안전모 + 망치 |

## 미리보기 생성

```bash
node scripts/generate-icon-v4-previews.mjs
```

출력: `previews/`

- `home-screen-mockup.png` — Android 홈화면 Mockup (카카오톡 · 네이버지도 옆)
- `comparison-sheet.png` — 96px + 48px 나란히 비교
- `v4-*-{48,72,96,1024}.png` — 시안별 크기별 PNG
