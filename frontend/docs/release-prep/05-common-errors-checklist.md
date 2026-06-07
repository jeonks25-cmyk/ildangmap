# 자주 발생할 오류 체크리스트

베타·운영 중 **증상 → 원인 → 확인 방법 → 임시 조치** 빠른 참조.

---

## 로그인 / 인증

| 증상 | 가능 원인 | 확인 | 임시 조치 |
|------|-----------|------|-----------|
| "카카오 로그인 주소를 만들 수 없어요" | `REACT_APP_API_BASE_URL` 미설정 | `.env` / 빌드 env | API URL 설정 후 재빌드 |
| "로그인 서버에 연결할 수 없어요" | Spring 8080 미기동 | `GET /actuator/health` | `backend` bootRun |
| 카카오 페이지 "invalid client" / 앱 없음 | `KAKAO_CLIENT_ID` placeholder | OAuth URL의 client_id | 서버 env 실키 설정 |
| Redirect URI mismatch | 콘솔 URI ≠ `.../login/oauth2/code/kakao` | Kakao Developers | URI 정확히 등록 |
| 로그인 후 다시 게스트 | 쿠키 미전달 / CORS | DevTools Network `/users/me` | credentials:include, CORS origin |
| 로그인 후 **다른 포트**로 이동 | `app.frontend-origin` 불일치 | `application.yml` | 3000↔3001 통일 |
| `/oauth/kakao/callback`만 등록 | 레거시 경로 | `OAuthPage.js` | **백엔드 URI**로 변경 |
| 로그인 성공인데 닉네임 없음 | nicknameSetupRequired | 닉네임 게이트 | 활동명 1회 설정 |
| **로그아웃 불가** | UI 미구현 | 설정 탭 | localStorage 클리어(임시) |

---

## 지도 (Kakao Maps SDK)

| 증상 | 가능 원인 | 확인 | 임시 조치 |
|------|-----------|------|-----------|
| 지도 빈 화면 | SDK 로드 실패 | Console `[useKakaoMap]` | Web 도메인 등록 |
| "check app key & registered domain" | JS 키·도메인 | Kakao Maps 플랫폼 | localhost/배포 URL 등록 |
| 지도 터치 안 됨 | overlay pointer-events | 요소 검사 | 패널 닫기, 새로고침 |
| 내 위치 안 됨 | GPS 권한 거부 | 브라우저 권한 | 설정에서 위치 허용 |
| 검색 결과 없음 | SDK 미로드·쿼리 | kakao 객체 존재 | SDK 문제 먼저 해결 |

---

## API / 데이터

| 증상 | 가능 원인 | 확인 | 임시 조치 |
|------|-----------|------|-----------|
| 저장했는데 사라짐 | Mock vs Live 혼용 | `REACT_APP_USE_MOCK_API` | 환경 통일 |
| 401 / users/me 실패 | 세션 만료 | Application 쿠키 | 재로그인 |
| MySQL connection fail | DB 미기동 | actuator health db | MySQL 시작 |
| CORS error | origin 미허용 | Console CORS | SecurityConfig 추가 |

---

## 일정

| 증상 | 가능 원인 | 확인 | 임시 조치 |
|------|-----------|------|-----------|
| OCR "글자 읽는 중" 무한 | tesseract 실패 | Console | 다른 이미지·붙여넣기 |
| OCR 날짜 틀림 | 캡처 품질 | 원본 vs 파싱 | 수동 수정 |
| 기간 일정 하루만 보임 | endDate 미입력 | composer 필드 | 종료일 재설정 |
| 현장 상세 탭 빈 화면 | scheduleId 불일치 | URL `/schedule/field/` | 목록에서 재진입 |

---

## 인원

| 증상 | 가능 원인 | 확인 | 임시 조치 |
|------|-----------|------|-----------|
| 사람 추가 안 됨 | 비로그인 | LoginPrompt | 로그인 후 재시도 |
| 초대 링크 복사만 됨 | share API 미지원 | 브라우저 | 수동 카톡 붙여넣기 |
| 캘린더 전부 ○ | 일정 미공유 | mock 데이터 | 데모 데이터 한도 인지 |

---

## 환경 / 빌드

| 증상 | 가능 원인 | 확인 | 임시 조치 |
|------|-----------|------|-----------|
| 예전 UI/에러 | stale dev server | 포트 여러 개 | 서버 재시작 1개만 |
| 프로덕션 Mock 동작 | `REACT_APP_USE_MOCK_API=true` | 빌드 env | prod에서 false/미설정 |
| HTTPS mixed content | API http | URL scheme | API도 HTTPS |

---

## 베타 당일 긴급 연락 트리

```
1. 앱 안 열림 → URL·Wi-Fi 확인 → 운영자에게 스크린샷
2. 지도 안 보임 → 새로고침 → Safari/Chrome 교체
3. 로그인 실패 → Mock 로그인 버튼(있으면) → 없으면 UI-only 진행
4. 데이터 날아감 → Mock 모드 여부 확인 → 재등록
```

---

## P0 즉시 중단 기준 (베타 중)

- ☐ 로그인 루프 (무한 리다이렉트)
- ☐ 저장 시 앱 전체 크래시(흰 화면)
- ☐ 개인정보 타인에게 노출
- ☐ 결제·민감 권한 오동작 (해당 시)

위 발생 시 URL 회수·Hotfix 전까지 신규 테스터 중단.
