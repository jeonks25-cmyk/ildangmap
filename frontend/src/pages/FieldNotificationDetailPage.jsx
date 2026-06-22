import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useNotificationStore } from "../store/useNotificationStore";
import { decorateNotification } from "../components/notifications/notificationModel";
import { resolveNotificationRoute } from "../utils/notificationNavigation";

/** 레거시 /notifications/:id 딥링크 → 해당 화면으로 리다이렉트 */
export default function FieldNotificationDetailPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const events = useNotificationStore.getState().listEvents();
    const found = events.find((row) => row.id === threadId);
    const item = found ? decorateNotification(found) : null;
    const route = resolveNotificationRoute(item);
    if (route?.pathname) {
      navigate(route.pathname + (route.search || ""), { replace: true, state: route.state });
      return;
    }
    navigate("/notifications", { replace: true });
  }, [navigate, threadId]);

  return null;
}
