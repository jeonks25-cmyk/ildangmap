# [1단계] 카카오 로그인 연동 점검 보고서

**점검일:** 2026-06-04  
**범위:** 코드·환경 설정 분석 + localhost 실동작 테스트 (배포 URL 미등록)

---

## 1. 현재 아키텍처 (정상 설계)

일당맵은 **프론트 직접 OAuth가 아니라 Spring Boot OAuth2** 방식입니다.

```
[설정 탭] 카카오 로그인 클릭
  → GET {REACT_APP_API_BASE_URL}/oauth2/authorization/kakao
  → 카카오 로그인 (kauth.kakao.com)
  → Redirect: {백엔드}/login/oauth2/code/kakao
  → Spring 세션 쿠키 (ILDANGMAPSESSION)
  → Redirect: {app.frontend-origin}/map?login=success
  → AppShell이 refreshCurrentUser() → GET /users/me
  → 환영 토스트 + 닉네임 게이트
```

| 구분 | 파일/설정 |
|------|-----------|
| 로그인 시작 | `src/api/authApi.js` → `/oauth2/authorization/kakao` |
| 성공 후 동기화 | `src/components/layout/AppShell.jsx` → `?login=success` |
| 백엔드 성공 핸들러 | `backend/.../OAuth2LoginSuccessHandler.java` |
| OAuth 클라이언트 | `backend/src/main/resources/application.yml` |

---

## 2. 카카오 개발자 콘솔 — 등록해야 할 값

### Redirect URI (로그인용, 백엔드 기준)

| 환경 | Redirect URI |
|------|----------------|
| 로컬 | `http://localhost:8080/login/oauth2/code/kakao` |
| 배포 | `https://{백엔드-도메인}/login/oauth2/code/kakao` |

> **주의:** `http://localhost:3000/oauth/kakao/callback` 은 **레거시 경로**입니다.  
> `OAuthPage.js`는 `/map`으로만 리다이렉트하며 세션을 처리하지 않습니다. 콘솔에 이 URI만 등록하면 로그인이 완료되지 않습니다.

### 플랫폼 Web 사이트 도메인 (지도 SDK용, 로그인과 별도)

| 환경 | 도메인 |
|------|--------|
| 로컬 | `http://localhost:3000`, `http://localhost:3001` |
| 배포 | `https://{프론트-도메인}` |

### 동의 항목 (백엔드 scope와 일치)

- 닉네임 (`profile_nickname`)
- 프로필 사진 (`profile_image`)
- 카카오계정(이메일) (`account_email`)

### REST API 키 / Client Secret

- 백엔드 환경변수 `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`에 등록
- 프론트 `.env`의 `REACT_APP_KAKAO_CLIENT_ID`는 **현재 코드에서 사용되지 않음** (주석만 남아 있음)

---

## 3. localhost 테스트 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| 백엔드 health (`:8080/actuator/health`) | ✅ UP | DB MySQL UP |
| 프론트 dev (`:3001`) | ✅ 응답 | `.env.development.local` 기준 live 모드 |
| OAuth 시작 URL | ✅ 302 → kauth | redirect_uri 정상 |
| 카카오 로그인 페이지 도달 | ✅ | `client_id=sample-kakao-client-id` |
| 실제 카카오 계정 로그인 완료 | ❌ **불가** | placeholder client_id |
| Mock 로그인 (개발용) | ✅ 버튼 노출 | live 모드 + dev shortcut |

**localhost OAuth redirect_uri 확인값:**  
`http://localhost:8080/login/oauth2/code/kakao`

---

## 4. 배포 환경 테스트

| 항목 | 결과 |
|------|------|
| 배포 URL | **미설정** — repo에 production `.env` / CI 배포 URL 없음 |
| 배포 OAuth 테스트 | **미실시** — URL·Kakao 콘솔 등록 선행 필요 |

배포 전 필수 체크:

1. Kakao 콘솔에 **배포 백엔드 Redirect URI** 등록
2. 서버 `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` 실키 주입
3. `app.frontend-origin` → 배포 프론트 URL (예: `https://app.ildangmap.com`)
4. `SecurityConfig` CORS에 배포 프론트 origin 추가
5. HTTPS 배포 시 세션 쿠키 `secure: true` 검토 (`application.yml` 현재 `secure: false`)
6. 프론트 빌드 `REACT_APP_API_BASE_URL` → 배포 백엔드 URL
7. 프로덕션 빌드 Mock OFF (기본값) 확인

---

## 5. 발견된 문제 (출시 전 조치)

### P0 — 실카카오 로그인 불가

- **원인:** 백엔드가 `sample-kakao-client-id` / `sample-kakao-client-secret` 폴백 사용
- **조치:** 배포·로컬 Spring 실행 시 실제 Kakao REST API 키 환경변수 설정

### P0 — frontend-origin 포트 불일치

- **현재:** `application.yml` → `app.frontend-origin: http://localhost:3001`
- **CRA 기본:** `http://localhost:3000`
- **영향:** OAuth 성공 후 3001로 리다이렉트. 3000에서 dev하면 로그인 후 엉뚱한 포트로 이동
- **조치:** 사용 포트에 맞게 통일하거나 `PORT=3001 npm start` 고정

### P1 — 로그아웃 UI 없음

- `useUserStore.logout()` / `logoutSession()` 구현됨
- 설정 탭에 **로그아웃 버튼 없음** → QA 체크리스트 "로그아웃" 항목 현재 불가
- **조치:** 출시 전 UI 추가 필요 (별도 작업 — 이번 범위에서는 QA에 "미구현"으로 기록)

### P2 — 문서/코드 불일치

- `.env.development` 주석: 프론트 직접 OAuth (`REACT_APP_KAKAO_CLIENT_ID`)
- `authApi.js`: Spring OAuth만 지원, `completeKakaoOAuth()` deprecated throw
- **조치:** 베타 전 `.env.development` 주석 정리 권장 (코드 변경 없이 문서만)

### P2 — 카카오 지도 SDK

- 미등록 도메인에서 SDK 로드 실패 (자동화·일부 포트에서 재현)
- 로그인과 별개 — Kakao Maps JavaScript 키 + Web 도메인 등록 필요

---

## 6. 베타 테스트용 임시 우회

실카카오 키 세팅 전 UI 검증:

| 방법 | 조건 |
|------|------|
| Mock API | `REACT_APP_USE_MOCK_API=true` (기본 dev) → 카카오 버튼이 Mock 로그인 |
| Dev shortcut | live 모드 + `REACT_APP_DEV_LOGIN_SHORTCUT` ≠ false → "개발용 로그인 (Mock)" |

**5명 오야지 베타 권장:**

- **A안 (UI·기능 QA):** Mock 로그인으로 4탭 전 기능 검증
- **B안 (실로그인 QA):** P0 해결 후 카카오 실계정 5명 테스트

---

## 7. 점검 체크리스트 (운영자용)

```
[ ] Kakao Developers → 앱 → 카카오 로그인 활성화
[ ] Redirect URI: http://localhost:8080/login/oauth2/code/kakao
[ ] Redirect URI: https://{prod-api}/login/oauth2/code/kakao
[ ] Web 도메인: localhost:3000, localhost:3001, {prod-front}
[ ] 동의항목: 닉네임·프로필·이메일
[ ] 서버 KAKAO_CLIENT_ID / KAKAO_CLIENT_SECRET 설정
[ ] app.frontend-origin = 실제 프론트 URL
[ ] CORS allowedOrigins에 프론트 URL
[ ] REACT_APP_API_BASE_URL 빌드 시 주입
[ ] 로그인 → /map?login=success → 프로필 표시 E2E
[ ] 로그아웃 UI (현재 미구현 — 추가 후 재검)
```
