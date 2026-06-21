# 일당맵 앱 아이콘 — 채택: v4 Hammer (2안)

| 시안 | 상태 |
|------|------|
| v1 Classic | 보류 |
| v2 Map Grid | 보류 |
| v3 Bold (망치) | 이전 프로덕션 |
| v4 Helmet (1안) | 이전 v4 |
| **v4 Hammer (2안)** | **적용** — PWA / 홈 화면 / favicon / adaptive |

## 프로덕션 파일

- `public/logo192.png`, `logo512.png`, `apple-touch-icon.png`, `favicon.ico`
- `manifest.json` — `theme_color`: `#1E8E5A`
- 재생성: `npm run icons:generate` (소스: `brand/icons/concepts/app-icon-v4-2-hammer.svg`)

## SVG 원본

- `concepts/app-icon-v4-2-hammer.svg` — 흰 핀 + 핀 내부 노란 망치
- Adaptive: `adaptive/background.svg` + hammer foreground

## Android

- `brand/icons/previews/android-{48,72,96}.png`
- `brand/icons/previews/adaptive-432.png` — bg + fg 합성

## 색상

| 용도 | HEX |
|------|-----|
| 배경 | `#1E8E5A` |
| 내부 사각 | `#25966B` |
| 핀 | `#FFFFFF` |
| 망치 | `#FBBF24` |
