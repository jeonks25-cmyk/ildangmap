import { buildFieldJobTitle, CRAFT_LABEL, JOB_STATUS, migrateJob } from "./jobModel";

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTimeRangeDurationMinutes(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
  if (!match) return 180;
  const [, sh, sm, eh, em] = match;
  const start = Number(sh) * 60 + Number(sm);
  const end = Number(eh) * 60 + Number(em);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 180;
  return end - start;
}

export function createFieldJobFromDraft({ draft, selectedDateKey, fallbackLocation = {}, id } = {}) {
  const nextDraft = draft || {};
  const picked =
    nextDraft.location && (nextDraft.location.fullAddress || nextDraft.location.shortRegion)
      ? nextDraft.location
      : fallbackLocation;
  const lat = Number.isFinite(Number(picked?.lat)) ? Number(picked.lat) : 36.3504;
  const lng = Number.isFinite(Number(picked?.lng)) ? Number(picked.lng) : 127.3845;
  const modeKey = nextDraft.mode || "post";
  const isHelp = modeKey === "help";
  const isUrgent = modeKey === "urgent" || isHelp;
  const shortRegion = picked?.shortRegion || "대전 현장";
  const fullAddress = picked?.fullAddress || shortRegion;
  const contactPhone = nextDraft.details?.contactPhone || "";
  const accessPassword = nextDraft.details?.accessPassword || "";
  const siteKind = String(picked?.siteKind || "").trim() || "현장";
  const workDate = nextDraft.workDate || selectedDateKey || toDateKey(new Date());
  const workDateEnd = nextDraft.workDateEnd || workDate;
  const durationDays =
    Number.isFinite(Number(nextDraft.durationDays)) && Number(nextDraft.durationDays) > 0
      ? Math.round(Number(nextDraft.durationDays))
      : (() => {
          if (!workDateEnd || workDateEnd === workDate) return 1;
          const start = new Date(`${workDate}T00:00:00`);
          const end = new Date(`${workDateEnd}T00:00:00`);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
          return Math.max(1, Math.round((end - start) / 86400000) + 1);
        })();
  const workType = isHelp ? "shortHelp" : "fullDay";
  const workTime =
    nextDraft.workTime || (isHelp ? "13:00~17:00" : isUrgent ? "07:00~17:00" : "08:00~17:00");
  const payTerms = nextDraft.details?.payTerms || (isHelp || isUrgent ? "당일지급" : "협의");
  const craft = nextDraft.craft || "wallpaper";
  const trade = nextDraft.trade || "조공";
  const crewCount = Number(nextDraft.details?.crewCount);
  const helpDurationMinutes = getTimeRangeDurationMinutes(workTime);
  const craftLabel = CRAFT_LABEL[craft] || "현장";
  const title =
    nextDraft.title ||
    buildFieldJobTitle({
      shortRegion,
      shortAddress: shortRegion,
      address: fullAddress,
      siteKind,
      craft,
      trade,
    });
  const helpTitle = `${shortRegion.split(" ").slice(-1)[0] || shortRegion} ${siteKind} ${craftLabel} 보조 급구`;

  return migrateJob({
    id: id || Date.now(),
    title,
    trade,
    craft,
    siteKind,
    date: workDate,
    workDate,
    workDateEnd,
    endDate: workDateEnd,
    durationDays,
    lat,
    lng,
    pay: `${Number(nextDraft.payAmount || 0).toLocaleString()}원`,
    status: JOB_STATUS.RECRUITING,
    isUrgent,
    workType,
    workTime,
    distanceKm: 0.1,
    address: shortRegion,
    addressDetail: shortRegion,
    shortRegion,
    shortAddress: shortRegion,
    fullAddress,
    privateFields: {
      contactPhone,
      fullAddress,
      accessPassword,
      navigationLink: "",
      lat,
      lng,
    },
    visibility: {
      phone: "approved_only",
      addressDetail: "approved_only",
      accessInfo: "approved_only",
      exactLocation: "approved_only",
    },
    payTerms,
    postedAt: new Date().toISOString(),
    beginnerOk: trade === "조공" || trade === "준기공",
    longTerm: false,
    memo: nextDraft.details?.description || (isHelp ? "근처에서 바로 와주실 분 찾습니다." : undefined),
    description:
      nextDraft.details?.description ||
      (isUrgent
        ? "오늘 바로 투입 가능한 기사님 우선 연락 부탁드립니다."
        : isHelp
          ? "짧은 헬프 요청으로 빠르게 등록했습니다."
          : "일정에서 빠르게 등록한 현장입니다."),
    accessPassword: "",
    parkingNote: nextDraft.details?.parkingNote || "",
    requiredItems: nextDraft.details?.requiredItems || "",
    mealNote: nextDraft.details?.mealNote || "",
    specialNote: nextDraft.details?.specialNote || "",
    materialNote: nextDraft.details?.materialNote || "",
    contactPhone: contactPhone ? contactPhone.replace(/\d(?=\d{4})/g, "*") : "",
    ocrSourceKind: nextDraft.source?.kind || "manual",
    ocrStatus: nextDraft.source?.ocrStatus || "idle",
    ocrAttachmentName: nextDraft.source?.attachmentName || "",
    extractedFields: nextDraft.extracted || null,
    liveHelp: isHelp,
    helpTime: isHelp ? workTime : "",
    helpTitle: isHelp ? helpTitle : "",
    helpDescription: isHelp ? nextDraft.details?.description || "2~3시간 보조 가능하신분" : "",
    helpDurationMinutes: isHelp ? helpDurationMinutes : 0,
    helpExpiresAt: isHelp ? new Date(Date.now() + 60 * 60000).toISOString() : "",
    helpAtmosphere: isHelp ? `${siteKind} 현장에서 지금 바로 손이 부족한 상태입니다.` : "",
    crewCount: Number.isFinite(crewCount) && crewCount > 0 ? Math.round(crewCount) : 1,
    participants: [],
    briefing: [],
    alerts: [],
  });
}
