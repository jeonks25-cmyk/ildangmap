import { useJobStore } from "../store/useJobStore";

export function ConsumerRequestProvider({ children }) {
  return children;
}

export function useConsumerRequests() {
  const requests = useJobStore((state) => state.requests);
  const setRequests = useJobStore((state) => state.setRequests);
  const addRequest = useJobStore((state) => state.addRequest);
  const markRequestQuoted = useJobStore((state) => state.markRequestQuoted);
  const supportEstimateRequest = useJobStore((state) => state.supportEstimateRequest);

  return {
    requests,
    setRequests,
    addRequest,
    markRequestQuoted,
    supportEstimateRequest,
  };
}
