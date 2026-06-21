# 일당맵 앱 아이콘 시안 (E안 — 공구 + 핀)

채택 컨셉: **E안** · 건설 현장 + 위치 정보

| 시안 | 파일 | 특징 |
|------|------|------|
| **1 Classic** | `app-icon-v1-classic-flat.png` | 단색 `#1E8E5A`, 흰 핀 + 노란 원 + 망치. 가장 깔끔하고 스토어 썸네일 대비 좋음 |
| **2 Map Grid** | `app-icon-v2-map-grid.png` | 배경에 옅은 지도 격자 → **지도 앱** 정체성 강화 |
| **3 Bold** | `app-icon-v3-bold-simplified.png` | 핀·망치 실루엣을 더 굵게 → **48px 이하** 식별성 우선 |

## SVG 원본 (1024 viewBox)

`frontend/public/brand/icons/`

- `app-icon-v1-classic.svg`
- `app-icon-v2-map-grid.svg`
- `app-icon-v3-bold.svg`

## Android Adaptive Icon 레이어

`frontend/public/brand/icons/adaptive/`

- `background.svg` — `#1E8E5A` 단색
- `foreground-v1-classic.svg` — 핀+공구만 (안전 영역 66% 기준 축소)

## 색상

| 용도 | HEX |
|------|-----|
| 배경 | `#1E8E5A` |
| 핀 | `#FFFFFF` |
| 원 | `#FACC15` / `#FBBF24` |
| 격자 (시안2) | `#166534` @ 22% |

## 다크모드

- 배경 `#1E8E5A`는 iOS/Android 다크 홈에서도 대비 유지
- 채택 후 `manifest.json` `theme_color`를 `#1E8E5A`로 변경 권장 (현재 `#f97316` 주황)

## 다음 단계 (채택 시)

1. 시안 번호 확정
2. SVG → `logo192.png`, `logo512.png`, `apple-touch-icon.png`, `favicon.ico` 내보내기
3. `manifest.json` theme/background 색상 업데이트
4. 커밋·배포
