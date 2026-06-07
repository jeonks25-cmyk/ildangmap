import { useEffect, useMemo } from "react";
import { useFieldScheduleStore } from "../store/useFieldScheduleStore";
import { buildAvailabilityOutlook } from "../utils/fieldScheduleModel";

/**
 * 작업자 한 명(ownerId=연락처 id)의 "언제부터 가능한지" 전망.
 * useFieldScheduleStore 시드 데이터를 그대로 사용 — 새 데이터 모델 없음.
 */
export function useOwnerAvailabilityOutlook(ownerId) {
  const ensureSeeded = useFieldScheduleStore((s) => s.ensureSeeded);
  const seeded = useFieldScheduleStore((s) => s.seeded);
  const availMap = useFieldScheduleStore((s) => s.availabilityByOwner[ownerId]);
  const personalEvents = useFieldScheduleStore((s) => s.personalEventsByOwner[ownerId]);

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded, seeded]);

  return useMemo(
    () => buildAvailabilityOutlook({ availMap, personalEvents, today: new Date() }),
    [availMap, personalEvents]
  );
}

/**
 * 팀 전체의 가용 전망 집계(요약 바용) + 연락처별 outlook 맵.
 * 행(ContactCard)과 동일한 스케줄 소스를 써서 색/숫자가 일치하도록 한다.
 * @returns {{ total:number, available:number, busy:number, none:number, byId:Record<string, object> }}
 */
export function useTeamAvailabilityOutlook(contacts) {
  const ensureSeeded = useFieldScheduleStore((s) => s.ensureSeeded);
  const seeded = useFieldScheduleStore((s) => s.seeded);
  const availabilityByOwner = useFieldScheduleStore((s) => s.availabilityByOwner);
  const personalEventsByOwner = useFieldScheduleStore((s) => s.personalEventsByOwner);

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded, seeded]);

  return useMemo(() => {
    const today = new Date();
    const list = Array.isArray(contacts) ? contacts : [];
    const byId = {};
    let available = 0;
    let busy = 0;
    let none = 0;
    list.forEach((c) => {
      if (!c) return;
      const ownerId = String(c.id);
      const outlook = buildAvailabilityOutlook({
        availMap: availabilityByOwner[ownerId],
        personalEvents: personalEventsByOwner[ownerId],
        today,
      });
      byId[c.id] = outlook;
      if (outlook.state === "available") available += 1;
      else if (outlook.state === "busy") busy += 1;
      else none += 1;
    });
    return { total: list.length, available, busy, none, byId };
  }, [contacts, availabilityByOwner, personalEventsByOwner]);
}
