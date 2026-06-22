import {
  fetchPendingBoardNotifications,
  markBoardNotificationsDelivered,
} from "../api/scheduleBoardApi";
import {
  emitSiteBoardCommentNotification,
  emitSiteBoardMentionNotification,
  emitSiteBoardNoticeNotification,
} from "../store/useNotificationStore";

let bootstrapInFlight = null;

export async function bootstrapBoardNotifications() {
  if (bootstrapInFlight) return bootstrapInFlight;
  const run = (async () => {
    try {
      const events = await fetchPendingBoardNotifications();
      if (!Array.isArray(events) || !events.length) return;
      const deliveredIds = [];
      for (const event of events) {
        if (!event?.id) continue;
        const target = {
          scheduleId: event.scheduleId,
          briefingId: event.briefingId || "",
          postId: event.postId,
          commentId: event.commentId,
        };
        if (event.eventType === "notice") {
          emitSiteBoardNoticeNotification({
            actorName: event.actorName,
            actorUserId: event.actorUserId,
            preview: event.preview,
            target,
          });
        } else if (event.eventType === "comment") {
          emitSiteBoardCommentNotification({
            actorName: event.actorName,
            actorUserId: event.actorUserId,
            preview: event.preview,
            target,
          });
        } else if (event.eventType === "mention") {
          emitSiteBoardMentionNotification({
            actorName: event.actorName,
            actorUserId: event.actorUserId,
            preview: event.preview,
            target,
          });
        }
        deliveredIds.push(event.id);
      }
      if (deliveredIds.length) {
        await markBoardNotificationsDelivered(deliveredIds).catch(() => {});
      }
    } catch (_) {
      /* offline — skip */
    }
  })();
  bootstrapInFlight = run;
  try {
    await run;
  } finally {
    bootstrapInFlight = null;
  }
}
