import { useSettlementStore } from "../store/useSettlementStore";

export function ScheduleProvider({ children }) {
  return children;
}

export function useSchedules() {
  const schedules = useSettlementStore((state) => state.schedules);
  const setSchedules = useSettlementStore((state) => state.setSchedules);
  const addSchedule = useSettlementStore((state) => state.addSchedule);
  const addScheduleFromJobMatch = useSettlementStore((state) => state.addScheduleFromJobMatch);
  const updateSchedule = useSettlementStore((state) => state.updateSchedule);
  const summary = useSettlementStore((state) => state.summary);
  const briefingData = useSettlementStore((state) => state.briefingData);
  const briefingFilters = useSettlementStore((state) => state.briefingFilters);
  const loading = useSettlementStore((state) => state.loading);
  const error = useSettlementStore((state) => state.error);
  const briefingLoading = useSettlementStore((state) => state.briefingLoading);
  const briefingError = useSettlementStore((state) => state.briefingError);
  const refreshSettlementData = useSettlementStore((state) => state.refreshSettlementData);
  const refreshSettlementSummary = useSettlementStore((state) => state.refreshSettlementSummary);
  const refreshBriefings = useSettlementStore((state) => state.refreshBriefings);
  const createSharedFieldSchedule = useSettlementStore((state) => state.createSharedFieldSchedule);
  const acceptScheduleInvite = useSettlementStore((state) => state.acceptScheduleInvite);

  // Bootstrap is centralized in useAppBootstrap -> AppShell.
  // This hook now exposes settlement/briefing state without triggering implicit fetches.

  return {
    schedules,
    setSchedules,
    addSchedule,
    addScheduleFromJobMatch,
    updateSchedule,
    createSharedFieldSchedule,
    acceptScheduleInvite,
    summary,
    briefingData,
    briefingFilters,
    loading,
    error,
    briefingLoading,
    briefingError,
    refreshSettlementData,
    refreshSettlementSummary,
    refreshBriefings,
  };
}
