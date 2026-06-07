import { createFieldJobFromDraft } from "./fieldJobDraftAdapter";
import { getScheduleEndDateKey } from "./scheduleModel";

/**
 * 참석 불가 등으로 대체 인력이 필요할 때 긴급헬프 공고 초안 생성
 */
export function buildUrgentHelpJobFromSchedule(schedule, { shortageCount = 1 } = {}) {
  if (!schedule) return null;
  const workDate = String(schedule.workDate || "").slice(0, 10);
  const workDateEnd = getScheduleEndDateKey(schedule) || workDate;
  const payDigits = String(schedule.pay || schedule.basePayAmount || "140000").replace(/[^0-9]/g, "");
  return createFieldJobFromDraft({
    draft: {
      mode: "help",
      title: `${String(schedule.title || "현장").trim()} 대체 인력`,
      workDate,
      workDateEnd,
      workTime: schedule.workTime || "08:00~17:00",
      craft: schedule.craft || "film",
      payAmount: Number(payDigits) || 140000,
      details: {
        crewCount: Math.max(1, Number(shortageCount) || 1),
        accessPassword: schedule.accessPassword || "",
      },
      location: {
        fullAddress: schedule.fullAddress || schedule.shortRegion || "",
        shortRegion: schedule.shortRegion || "",
        lat: schedule.lat,
        lng: schedule.lng,
      },
      memo: `현장 일정 변경 후 대체 인력 ${shortageCount}명 모집`,
    },
    selectedDateKey: workDate,
  });
}
