# Final Phase — 배포·OAuth·베타 실행 가이드

## 1. 카카오 실연동 (localhost)

### Kakao Developers 체크리스트

1. [Kakao Developers](https://developers.kakao.com) → 내 앱 → **카카오 로그인** 활성화
2. **Redirect URI** 등록:
   - `http://localhost:8080/login/oauth2/code/kakao`
   - (배포 후) `https://{API_HOST}/login/oauth2/code/kakao`
3. **Web 플랫폼** 사이트 도메인:
   - `http://localhost:3000` (또는 사용 포트)
   - (배포 후) `https://{FRONT_HOST}`
4. **동의항목:** 닉네임, 프로필 사진, 카카오계정(이메일)
5. **REST API 키** + **Client Secret** 복사

### 로컬 실행

**백엔드** (`backend/.env.example` 참고):

```powershell
cd backend
$env:KAKAO_CLIENT_ID="REST_API_키"
$env:KAKAO_CLIENT_SECRET="클라이언트_시크릿"
$env:APP_FRONTEND_ORIGIN="http://localhost:3000"
./gradlew bootRun
```

**프론트** (`frontend/.env.example` → `.env.development.local`):

```env
REACT_APP_USE_MOCK_API=false
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_BETA_SEED=true
```

```powershell
cd frontend
npm start
```

### 성공 확인

1. 설정 → **카카오 로그인** → kauth 페이지
2. 로그인 완료 → `http://localhost:3000/map?login=success`
3. 환영 토스트 + 프로필 배너
4. **로그아웃** → 게스트 UI 복귀

> **현재 상태:** repo에 실제 `KAKAO_CLIENT_ID` 없음 → 운영자가 위 env 주입 필요

---

## 2. 프론트 배포 (Vercel 권장)

### Vercel

1. GitHub 연결 → Root: `frontend`
2. Build: `npm run build` / Output: `build`
3. Environment Variables:

| Key | Value |
|-----|-------|
| `REACT_APP_API_BASE_URL` | `https://api.your-domain.com` |
| `REACT_APP_USE_MOCK_API` | `false` |
| `REACT_APP_BETA_SEED` | `true` |

4. `vercel.json` SPA rewrite 포함 (이미 추가됨)

### Netlify (대안)

- `netlify.toml` 사용, 동일 env 변수 설정

---

## 3. 백엔드 배포 (Spring Boot)

### Render / Railway / EC2 공통 env

| 변수 | 예시 |
|------|------|
| `KAKAO_CLIENT_ID` | REST API 키 |
| `KAKAO_CLIENT_SECRET` | 시크릿 |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `SESSION_COOKIE_SECURE` | `true` |
| `APP_FRONTEND_ORIGIN` | `https://your-app.vercel.app` |
| `APP_CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| DB URL / credentials | 호스팅 MySQL |

### Kakao 콘솔 (배포 후)

- Redirect URI: `https://{API}/login/oauth2/code/kakao`
- Web 도메인: `https://{FRONT}`

### HTTPS OAuth 검증

1. 프론트 URL → 카카오 로그인
2. API 도메인으로 OAuth callback
3. 프론트 `/map?login=success` 리다이렉트
4. `/users/me` 200 + `ILDANGMAPSESSION` 쿠키 (SameSite=None; Secure)

---

## 4. 베타 시드 데이터

`REACT_APP_BETA_SEED=true` 시:

| 직종 | 인원 | 장소(job) | 일정 |
|------|------|-----------|------|
| 인테리어필름 | 김필름 | 둔산동 상가 | +1일 |
| 도배 | 박도배 | 궁동 아파트 | +2일 |
| 전기 | 이전기 | 봉명동 상가 | +3일 |
| 설비 | 최설비 | 관저동 신축 | +4일 |
| 페인트 | 정페인트 | 월평동 상가 | +5일 |

- 인원 그룹 **「베타 5직종」** 자동 생성
- 소스: `src/utils/betaTestSeed.js`

---

## 5. 사용자 테스트 (5명)

측정 양식: [`07-user-test-timing.md`](07-user-test-timing.md)  
결과 리포트: [`08-test-result-report-template.md`](08-test-result-report-template.md)

테스트 항목 (4개만):

1. 장소 등록
2. 일정 등록
3. 인원 초대
4. 현장 초대

---

## 6. Go/No-Go

| 항목 | 필수 |
|------|------|
| 카카오 localhost E2E | ✅ |
| HTTPS 배포 OAuth | ✅ |
| 로그아웃 동작 | ✅ |
| 5명 4과제 완료율 ≥ 80% | ✅ |
| P0 버그 0건 | ✅ |
