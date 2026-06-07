import { useChatStore } from "../store/useChatStore";

export function ChatProvider({ children }) {
  return children;
}

export function useChat() {
  const rooms = useChatStore((state) => state.rooms);
  const getRoomById = useChatStore((state) => state.getRoomById);
  const openRoomForJob = useChatStore((state) => state.openRoomForJob);
  const openRoomForConsumerRequest = useChatStore((state) => state.openRoomForConsumerRequest);
  const markRoomRead = useChatStore((state) => state.markRoomRead);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const approveRoom = useChatStore((state) => state.approveRoom);

  return {
    rooms,
    getRoomById,
    openRoomForJob,
    openRoomForConsumerRequest,
    markRoomRead,
    sendMessage,
    approveRoom,
  };
}
