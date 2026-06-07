import { getExperienceHubKey } from "./fieldExperienceModel";

function toDateKey(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(dateKey) {
  if (!dateKey) return "오늘";
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatRelativeTime(value) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${Math.max(1, diffMin)}분 전`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}시간 전`;
  return `${Math.round(diffMin / (60 * 24))}일 전`;
}

export function createFieldCheckInRecord({
  fieldItem,
  userId = "oyaji-demo",
  craftType = "필름팀",
  quickTags = [],
} = {}) {
  const now = new Date().toISOString();
  const hubKey = getExperienceHubKey({ fieldItem });
  return {
    id: `checkin:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    userId,
    fieldId: fieldItem?.sourceId ?? fieldItem?.id ?? null,
    apartmentKey: hubKey,
    hubKey,
    checkedInAt: now,
    checkedOutAt: null,
    craftType,
    quickTags: Array.isArray(quickTags) ? quickTags : [],
    savedExperienceIds: [],
  };
}

export function buildFieldTimeline({ checkIns = [], experiences = [], fieldItem } = {}) {
  const hubKey = getExperienceHubKey({ fieldItem });
  const events = [];

  checkIns
    .filter((record) => record?.hubKey === hubKey)
    .forEach((record) => {
      events.push({
        id: `${record.id}:in`,
        dateKey: toDateKey(record.checkedInAt),
        at: record.checkedInAt,
        icon: "✓",
        text: `${record.craftType || "작업팀"} 체크인`,
        sub: record.checkedOutAt ? "작업 기록 완료" : "작업 중",
      });
      if (record.checkedOutAt) {
        events.push({
          id: `${record.id}:out`,
          dateKey: toDateKey(record.checkedOutAt),
          at: record.checkedOutAt,
          icon: "↗",
          text: `${record.craftType || "작업팀"} 체크아웃`,
          sub: "현장 종료",
        });
      }
    });

  experiences
    .filter((record) => record?.hubKey === hubKey)
    .forEach((record) => {
      events.push({
        id: record.id,
        dateKey: toDateKey(record.createdAt),
        at: record.createdAt,
        icon: "•",
        text: `${record.label} 저장`,
        sub: record.memo || "현장 경험 기록",
      });
    });

  const grouped = events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .reduce((acc, event) => {
      const key = event.dateKey || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});

  return Object.entries(grouped).map(([dateKey, items]) => ({
    dateKey,
    label: formatDayLabel(dateKey),
    items,
  }));
}

export function summarizeRecentCheckIns({ checkIns = [], fieldItem } = {}) {
  const hubKey = getExperienceHubKey({ fieldItem });
  return checkIns
    .filter((record) => record?.hubKey === hubKey)
    .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime())
    .slice(0, 2)
    .map((record) => `${record.craftType || "작업팀"} ${formatRelativeTime(record.checkedInAt)}`);
}

export function buildExperienceContextSummary({ checkIns = [], experiences = [], fieldItem } = {}) {
  if (!fieldItem) return [];
  const hubKey = getExperienceHubKey({ fieldItem });
  const relatedCheckIns = (checkIns || []).filter((record) => record?.hubKey === hubKey);
  const relatedExperiences = (experiences || []).filter((record) => record?.hubKey === hubKey);
  const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const craftTypes = Array.from(new Set(relatedCheckIns.map((record) => record.craftType).filter(Boolean)));
  const context = [];

  if (craftTypes.length) {
    context.push(`${craftTypes.slice(0, 2).join("·")} 작업 경험 있음`);
  }
  if (relatedCheckIns.some((record) => new Date(record.checkedInAt).getTime() >= recentCutoff)) {
    context.push("최근 2주 내 작업 기록");
  }
  if (relatedExperiences.length) {
    context.push(`${relatedExperiences.length}개 현장 경험 메모`);
  }
  if (fieldItem?.source?.siteKind || fieldItem?.source?.siteType) {
    context.push("같은 구조 경험 확인 가능");
  }
  if (!context.length) {
    context.push("이 현장 경험을 쌓는 중");
  }

  return context.slice(0, 4);
}
