import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildFieldJobTitle, getPublicRegionLine } from "../utils/jobModel";
import { loadStoredJobs, mergeJobsWithSeedData } from "../utils/jobsStorage";
import { buildConsumerRequestChatPayload } from "../utils/consumerRequestsStorage";
import { createPrivateJobSnapshot, normalizeParticipantStatus } from "../utils/jobPrivacyPolicy";
import { createSafeJsonStorage } from "./storeUtils";
import {
  emitMessageReceivedNotification,
  emitTeamJoinApprovedNotification,
  emitTeamJoinRequestNotification,
} from "./useNotificationStore";

const STORE_KEY = "ildangmap_chat_store_v1";
const STALE_AUTO_APPROVE_KEY = ["auto", "ApproveOnOpen"].join("");

function nowIso() {
  return new Date().toISOString();
}

function makeMessage({ id, type = "text", sender = "system", text, createdAt = nowIso() }) {
  return { id: id || `${sender}-${Date.now()}-${Math.random()}`, type, sender, text, createdAt };
}

function createSeedRoom(job, { status = "approved", unreadCount = 0, messages = [] } = {}) {
  const normalizedStatus = normalizeParticipantStatus(status);
  const approved = normalizedStatus === "approved" || normalizedStatus === "checked_in" || normalizedStatus === "completed";
  const ownerName = `${getPublicRegionLine(job).split(" ").slice(-1)[0] || "현장"} 오야지`;
  const roomMessages = messages.length
    ? messages
    : [
        makeMessage({
          sender: "system",
          type: "system",
          text: status === "approved" ? "참여가 승인되어 상세주소가 공개되었습니다." : "참여 요청 후 오야지 답변을 기다리는 중입니다.",
          createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
        }),
        makeMessage({
          sender: "owner",
          text: status === "approved" ? "오전 8시까지 오시면 됩니다." : "참여 요청 확인했어요. 경력 알려주세요.",
          createdAt: new Date(Date.now() - 1000 * 60 * 46).toISOString(),
        }),
      ];
  const last = roomMessages[roomMessages.length - 1];
  return {
    id: `room-${job.id}`,
    jobId: job.id,
    ownerName,
    ownerAvatar: ownerName.slice(0, 1),
    jobTitle: buildFieldJobTitle(job),
    pay: job.pay,
    workTime: job.workTime || "08:00~17:00",
    shortRegion: getPublicRegionLine(job),
    status,
    ...(approved ? { privateSnapshot: createPrivateJobSnapshot(job) } : {}),
    unreadCount,
    updatedAt: last.createdAt,
    lastMessage: last.text,
    messages: roomMessages,
  };
}

function findJobById(jobId) {
  const sourceJobs = mergeJobsWithSeedData(loadStoredJobs()).filter(Boolean);
  return sourceJobs.find((job) => String(job?.id) === String(jobId)) || null;
}

function sanitizeJobRoom(room) {
  if (!room || room.jobId == null) return room;
  const rest = { ...room };
  const privateSnapshot = rest.privateSnapshot;
  delete rest.fullAddress;
  delete rest.accessPassword;
  delete rest.contactPhone;
  delete rest.privateSnapshot;
  delete rest[STALE_AUTO_APPROVE_KEY];
  const status = normalizeParticipantStatus(room.status);
  const approved = status === "approved" || status === "checked_in" || status === "completed";
  return {
    ...rest,
    status: approved ? "approved" : status === "rejected" ? "rejected" : "applied",
    ...(approved && privateSnapshot ? { privateSnapshot } : {}),
  };
}

function sanitizeRooms(rooms) {
  return (Array.isArray(rooms) ? rooms : []).map((room) => sanitizeJobRoom(room)).filter(Boolean);
}

function seedRooms() {
  const sourceJobs = mergeJobsWithSeedData(loadStoredJobs()).filter(Boolean);
  const approvedJob = sourceJobs.find((job) => job.id === 4) || sourceJobs[0];
  const pendingJob = sourceJobs.find((job) => job.id === 1) || sourceJobs[1] || sourceJobs[0];
  if (!approvedJob || !pendingJob) return [];
  return [
    createSeedRoom(approvedJob, {
      status: "approved",
      unreadCount: 0,
      messages: [
        makeMessage({
          sender: "system",
          type: "system",
          text: "참여가 승인되어 상세주소가 공개되었습니다.",
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        }),
        makeMessage({
          sender: "me",
          text: "주소 확인했습니다. 8시50분쯤 도착하겠습니다.",
          createdAt: new Date(Date.now() - 1000 * 60 * 114).toISOString(),
        }),
        makeMessage({
          sender: "owner",
          text: "네, 지하 주차장 B2로 들어오시면 됩니다.",
          createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
        }),
      ],
    }),
    createSeedRoom(pendingJob, {
      status: "applied",
      unreadCount: 0,
      messages: [
        makeMessage({
          sender: "system",
          type: "system",
          text: "참여 요청이 접수되었습니다. 승인 후 상세주소가 공개됩니다.",
          createdAt: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
        }),
        makeMessage({
          sender: "owner",
          text: "참여 요청 확인했습니다. 가능하시면 도착 가능 시간 알려주세요.",
          createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
        }),
      ],
    }),
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function appendMessage(room, message, { unreadDelta = 0, resetUnread = false } = {}) {
  const nextMessages = [...(Array.isArray(room.messages) ? room.messages : []), message];
  return {
    ...room,
    messages: nextMessages,
    lastMessage: message.text,
    updatedAt: message.createdAt,
    unreadCount: resetUnread ? 0 : Math.max(0, Number(room.unreadCount || 0) + unreadDelta),
  };
}

export const useChatStore = create(
  persist(
    (set, get) => ({
      rooms: sanitizeRooms(seedRooms()),

      setRooms: (nextRooms) =>
        set((state) => ({
          rooms: sanitizeRooms(typeof nextRooms === "function" ? nextRooms(state.rooms) : nextRooms),
        })),

      getRoomById: (roomId) => get().rooms.find((room) => room && room.id === roomId) || null,

      openRoomForJob: (job, { kind = "chat" } = {}) => {
        if (!job?.id) return null;
        const current = Array.isArray(get().rooms) ? get().rooms : [];
        const idx = current.findIndex((room) => room && room.jobId === job.id);
        const ownerName = `${getPublicRegionLine(job).split(" ").slice(-1)[0] || "현장"} 오야지`;
        let resolvedRoom;
        let nextRooms;

        if (idx >= 0) {
          const next = [...current];
          let room = next[idx];
          if (kind === "apply" && room.status !== "approved") {
            const systemMsg = makeMessage({
              sender: "system",
              type: "system",
              text: "참여 요청이 접수되었습니다. 오야지 확인 후 상세주소가 공개됩니다.",
            });
            const ownerMsg = makeMessage({
              sender: "owner",
              text: "참여 요청 확인했습니다. 간단히 경력과 도착 가능 시간 부탁드립니다.",
            });
            room = appendMessage(room, systemMsg, { resetUnread: true });
            room = appendMessage(room, ownerMsg, { unreadDelta: 1 });
            room = sanitizeJobRoom({ ...room, status: "applied" });
            next[idx] = room;
            emitTeamJoinRequestNotification({ room, applicantName: "기술자" });
          }
          resolvedRoom = room;
          nextRooms = next.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          const baseMessages =
            kind === "apply"
              ? [
                  makeMessage({
                    sender: "system",
                    type: "system",
                    text: "참여 요청이 접수되었습니다. 승인 후 상세주소가 공개됩니다.",
                  }),
                  makeMessage({
                    sender: "owner",
                    text: "참여 요청 감사합니다. 가능하시면 경력과 도착 가능 시간 알려주세요.",
                  }),
                ]
              : [
                  makeMessage({
                    sender: "owner",
                    text: "문의 주셔서 감사합니다. 궁금한 점 편하게 남겨주세요.",
                  }),
                ];

          const last = baseMessages[baseMessages.length - 1];
          resolvedRoom = {
            id: `room-${job.id}`,
            jobId: job.id,
            ownerName,
            ownerAvatar: ownerName.slice(0, 1),
            jobTitle: buildFieldJobTitle(job),
            pay: job.pay,
            workTime: job.workTime || "08:00~17:00",
            shortRegion: getPublicRegionLine(job),
            status: kind === "apply" ? "applied" : "chatting",
            unreadCount: kind === "apply" ? 1 : 0,
            updatedAt: last.createdAt,
            lastMessage: last.text,
            messages: baseMessages,
          };
          resolvedRoom = sanitizeJobRoom(resolvedRoom);
          nextRooms = [resolvedRoom, ...current].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          if (kind === "apply") {
            emitTeamJoinRequestNotification({ room: resolvedRoom, applicantName: "기술자" });
          }
        }

        set({ rooms: nextRooms });
        return resolvedRoom;
      },

      /** 1:1 현장 DM (연락처 탭) */
      openRoomForContact: (contact) => {
        if (!contact?.id) return null;
        const current = Array.isArray(get().rooms) ? get().rooms : [];
        const roomId = `direct-${contact.id}`;
        const idx = current.findIndex((room) => room && room.id === roomId);
        let resolvedRoom;
        let nextRooms;

        if (idx >= 0) {
          resolvedRoom = current[idx];
          nextRooms = [...current].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          const ownerMsg = makeMessage({
            sender: "owner",
            text: "연락 주셔서 감사합니다. 현장 일정 편하게 물어보세요.",
          });
          resolvedRoom = {
            id: roomId,
            jobId: null,
            contactId: contact.id,
            ownerName: contact.name,
            ownerBirthYear: Number.isFinite(Number(contact.birthYear)) ? Number(contact.birthYear) : null,
            ownerResidence: String(contact.homeRegion || contact.region || "").trim(),
            ownerAvatar: contact.name.slice(0, 1),
            jobTitle: "현장 DM",
            pay: "",
            workTime: "",
            shortRegion: (contact.workRegions || contact.regions || []).join(" / "),
            fullAddress: "",
            accessPassword: "",
            contactPhone: contact.phone || "",
            status: "chatting",
            unreadCount: 0,
            updatedAt: ownerMsg.createdAt,
            lastMessage: ownerMsg.text,
            messages: [ownerMsg],
            isDirectContact: true,
          };
          nextRooms = [resolvedRoom, ...current].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }

        set({ rooms: nextRooms });
        return resolvedRoom;
      },

      openRoomForConsumerRequest: (request) => {
        if (!request?.id) return null;
        const current = Array.isArray(get().rooms) ? get().rooms : [];
        const roomId = `consumer-room-${request.id}`;
        const idx = current.findIndex((room) => room && room.id === roomId);
        let resolvedRoom;
        let nextRooms;

        if (idx >= 0) {
          resolvedRoom = current[idx];
          nextRooms = [...current].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          resolvedRoom = buildConsumerRequestChatPayload(request);
          resolvedRoom = { ...resolvedRoom, id: roomId };
          nextRooms = [resolvedRoom, ...current].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }

        set({ rooms: nextRooms });
        return resolvedRoom;
      },

      markRoomRead: (roomId) =>
        set((state) => ({
          rooms: (Array.isArray(state.rooms) ? state.rooms : []).map((room) =>
            room?.id === roomId ? { ...room, unreadCount: 0 } : room
          ),
        })),

      sendMessage: (roomId, text, sender = "me") => {
        const clean = String(text || "").trim();
        if (!clean) return;
        const msg = makeMessage({ sender, text: clean });
        set((state) => ({
          rooms: (Array.isArray(state.rooms) ? state.rooms : [])
            .map((room) => {
              if (room?.id !== roomId) return room;
              const nextRoom = appendMessage(room, msg, {
                resetUnread: sender === "me",
                unreadDelta: sender === "owner" ? 1 : 0,
              });
              if (sender === "owner") {
                emitMessageReceivedNotification({ room: nextRoom, message: msg });
              }
              return nextRoom;
            })
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        }));
      },

      approveRoom: (roomId) =>
        set((state) => ({
          rooms: (Array.isArray(state.rooms) ? state.rooms : [])
            .map((room) => {
              if (room?.id !== roomId || room.status === "approved") return room;
              const systemMsg = makeMessage({
                sender: "system",
                type: "system",
                text: "오야지가 지원을 승인했습니다. 상세주소가 공개되었습니다.",
              });
              const job = findJobById(room.jobId);
              const privateSnapshot = job ? createPrivateJobSnapshot(job) : null;
              const ownerMsg = makeMessage({
                sender: "owner",
                text: `상세주소 확인 부탁드립니다. ${privateSnapshot?.accessPassword ? `비밀번호는 ${privateSnapshot.accessPassword} 입니다.` : "도착 전 연락 주세요."}`,
              });
              let nextRoom = appendMessage(room, systemMsg, { unreadDelta: 1 });
              nextRoom = appendMessage(nextRoom, ownerMsg, { unreadDelta: 1 });
              const approvedRoom = {
                ...nextRoom,
                status: "approved",
                ...(privateSnapshot ? { privateSnapshot } : {}),
              };
              emitTeamJoinApprovedNotification({ room: approvedRoom, ownerName: room.ownerName });
              return approvedRoom;
            })
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        })),
    }),
    {
      name: STORE_KEY,
      version: 2,
      storage: createSafeJsonStorage(),
      partialize: (state) => ({ rooms: sanitizeRooms(state.rooms) }),
      migrate: (state) => ({
        ...(state || {}),
        rooms: sanitizeRooms(state?.rooms),
      }),
    }
  )
);
