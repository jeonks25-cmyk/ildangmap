import { myProfileMock } from "../utils/myProfileMock";
import { favoriteWorkersMock, oyajiTrustProfileMock } from "../utils/oyajiMock";

function createUser(base, overrides = {}) {
  return {
    id: overrides.id || base.id || `user-${Math.random().toString(36).slice(2, 10)}`,
    name: overrides.name || base.name || "현장 사용자",
    userType: overrides.userType || "worker",
    trade: overrides.trade || base.craft || "film",
    role: overrides.role || base.trade || "기공",
    region: overrides.region || base.region || "대전 서구",
    phone: overrides.phone || "010-0000-0000",
    profileImage: overrides.profileImage ?? base.profileImage ?? "",
    workCount: Number.isFinite(Number(overrides.workCount))
      ? Number(overrides.workCount)
      : Number.isFinite(Number(base.workCount))
        ? Number(base.workCount)
        : 0,
    noShowCount: Number.isFinite(Number(overrides.noShowCount))
      ? Number(overrides.noShowCount)
      : Number.isFinite(Number(base.noShowCount))
        ? Number(base.noShowCount)
        : 0,
  };
}

export const mockUsers = [
  createUser(myProfileMock, {
    id: "worker-me",
    userType: "worker",
    trade: myProfileMock.craft,
    role: myProfileMock.trade,
    workCount: 128,
    noShowCount: 0,
  }),
  createUser(oyajiTrustProfileMock, {
    id: "foreman-me",
    name: "현장 오야지",
    userType: "foreman",
    trade: "film",
    role: "오야지",
    region: "대전 서구",
    workCount: 32,
    noShowCount: 0,
  }),
  ...favoriteWorkersMock.map((worker, index) =>
    createUser(worker, {
      id: worker.id || `favorite-${index + 1}`,
      userType: "worker",
      trade:
        worker.role && worker.role.includes("전기")
          ? "electric"
          : worker.role && worker.role.includes("도배")
            ? "wallpaper"
            : "film",
      role: worker.role || "기공",
      workCount: 12 + index * 6,
      noShowCount: 0,
    })
  ),
];

export const mockMe = mockUsers[0];
