# Railway 배포 가이드 — 일당맵 Backend

## 사전 확인

| 항목 | 값 |
|------|-----|
| Spring Boot | **3.3.5** (`build.gradle` — Gradle 기준) |
| Java | 17 |
| Dockerfile | `backend/Dockerfile` |
| Health Check | `/actuator/health` (Railway), `/api/health` (앱) |
| OAuth | Spring Security OAuth2 Client (Kakao) |

> `pom.xml`(Boot 4.0.6)은 레거시. **Railway/Docker 빌드는 Gradle + Dockerfile** 사용.

## 1. Railway 프로젝트 생성

1. [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo**
2. Repository: `jeonks25-cmyk/ildangmap`
3. **Root Directory**: `backend`
4. Builder: Dockerfile (자동 감지 또는 `railway.toml`)

## 2. MySQL 추가

1. Project → **+ New** → **Database** → **MySQL**
2. Backend 서비스 → **Variables** → **Add Reference** (MySQL 서비스)
3. 아래 변수를 수동 매핑 (Reference 또는 직접 입력):

```env
DB_URL=jdbc:mysql://${{MYSQLHOST}}:${{MYSQLPORT}}/${{MYSQLDATABASE}}?useSSL=true&requireSSL=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8&allowPublicKeyRetrieval=true
DB_USERNAME=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}
```

## 3. Backend 환경변수 (필수)

```env
SPRING_PROFILES_ACTIVE=prod
SESSION_COOKIE_SECURE=true
FRONTEND_BASE_URL=https://ildangmap.vercel.app
APP_CORS_ALLOWED_ORIGINS=https://ildangmap.vercel.app
KAKAO_CLIENT_ID=<카카오 REST API 키>
KAKAO_CLIENT_SECRET=<카카오 Client Secret>
JWT_SECRET=<랜덤 32자 이상>
```

## 4. 공개 URL

1. Backend 서비스 → **Settings** → **Networking** → **Generate Domain**
2. 발급 URL 예: `https://ildangmap-backend-production.up.railway.app`

## 5. 카카오 개발자 콘솔

**Redirect URI** (백엔드 도메인):

```
https://<RAILWAY-DOMAIN>/login/oauth2/code/kakao
```

**Web 도메인**: `https://ildangmap.vercel.app`

## 6. Vercel (Frontend)

```env
REACT_APP_USE_MOCK_API=false
REACT_APP_API_BASE_URL=https://<RAILWAY-DOMAIN>
```

변경 후 **Redeploy** 필수.

## 7. CLI 배포 (선택)

```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway add --database mysql
railway up
railway domain
```

## Health Check

- Railway: `GET https://<RAILWAY-DOMAIN>/actuator/health`
- 앱 API: `GET https://<RAILWAY-DOMAIN>/api/health`
