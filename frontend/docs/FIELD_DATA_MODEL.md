# 현장(Field) 데이터 모델 · 저장 전략 (MVP)

일당맵을 **공고앱이 아니라 현장 운영 기록**이 쌓이는 구조로 가져가기 위한 기준입니다.  
지금은 **localStorage + mock**이며, 서버·인덱스 최적화는 나중 단계입니다.

---

## 1. 목표

누적되는 정보:

- 현장 운영 기록
- 작업 히스토리
- 인력 네트워크(참여·상태)
- 일정
- 현장 브리핑
- 운영 메모(현장 알림)

**채팅앱 구조는 지양**하고, **운영 기록·메모** 단위로 남깁니다.

---

## 2. Active vs Archived

| 구분 | 의미 | 예시 |
|------|------|------|
| **Active** | 자주 보는 최신 상태 | 진행 중 현장, 오늘 일정, 최근 알림 |
| **Archived** | 종료된 기록 | 과거 브리핑·참여·메모·일정 스냅 |

현장 종료 시 **삭제하지 않고** `archived: true` 로만 전환합니다.

---

## 3. Site / Job 핵심 필드 (목표 스키마)

Mock/API가 수렴해야 할 형태입니다. 이름은 기존 코드의 `date`, `fieldName` 등과 병행해 점진적으로 맞출 수 있습니다.

```text
id
title (또는 fieldName으로 표시)
address, lat, lng
workDate (현재 mock: date)
startTime, endTime
pay, trade (현재 mock: jobType)
leader (현재 mock: ownerName)
participants[]  — 별도 목(mock) + 현장별 id 매핑
briefing — 폼 필드(meetupTime, parking, 준비물, 자재, 지급방식 등)
notices[] — 운영 메모만
archived: boolean
createdAt, updatedAt
scheduleChangeHistory[] — 일정 변경 로그(append-only)
```

---

## 4. Notice(현장 알림) — 운영 메모

구조는 **최소**만 유지합니다.

```json
{
  "id": "string",
  "author": "string",
  "text": "string",
  "createdAt": "ISO-8601"
}
```

- **수정 없음**, **삭제만** 가능.
- **보관 정책**: active 저장소에서는 **최근 N일(기본 90일)** 만 유지해 길게 쌓이지 않게 합니다.  
  (종료·아카이브 시에는 별도 스냅샷으로 길게 보관할 수 있음 — 서버 단계 과제.)

구현: `src/utils/fieldSiteModel.js` 의 `FIELD_NOTICE_RETENTION_DAYS`, `pruneNoticesByRetention`.

---

## 5. 일정 변경(changeHistory)

일정 패치는 기존처럼 **현재 일정 필드에 반영**하고, 동시에 **append-only 로그**를 남깁니다.

로그 엔트리 예시(확장 가능):

```json
{
  "beforeDate": "2026-05-13",
  "afterDate": "2026-05-14",
  "beforeStartTime": "08:00",
  "afterStartTime": "08:30",
  "changedBy": "owner",
  "changedAt": "ISO-8601"
}
```

구현: `appendFieldScheduleChangeHistory` in `fieldRoomStorage.js`.

---

## 6. Participant(참여자)

목표 형태:

```json
{
  "id": "string",
  "name": "string",
  "birthYear": 1992,
  "gender": "남",
  "role": "string",
  "status": "confirmed | pending | unavailable"
}
```

현장별 **응답 상태**는 참여 mock과 별도로 `field_ops_v1.participationByField` 에 저장됩니다.  
UI용 값(`confirmed`, `declined_after_change` 등)과 목표 `status` enum은 이후 한 번에 정리하면 됩니다.

---

## 7. 저장 위치 (MVP)

| 데이터 | 키 / 모듈 |
|--------|-----------|
| 일정 오버라이드 | `field_ops_v1.scheduleByField` (`fieldOpsStorage.js`) |
| 참여 응답 맵 | `field_ops_v1.participationByField` |
| 브리핑 폼 · 알림 · 일정 변경 히스토리 | `field_room_state_v1` per `fieldId` (`fieldRoomStorage.js`) |
| 목업 현장 목록 | `scheduleBriefingMock.js` + `fieldRoomMock.js` |

---

## 8. 향후 분석(비목표, 구조만 열어둠)

동일 스키마를 서버로 옮기면 다음에 활용하기 쉽습니다.

- 자동 견적, 평균 단가, 공정별 평균 시간, 지역 시세
- 인력 추천, 신뢰도

**지금은** “현장에서 쓰기 편한 흐름”과 **기록이 자연스럽게 남는지**가 최우선입니다.
