import { myProfileMock } from "../utils/myProfileMock";
import { favoriteWorkersMock, oyajiTrustProfileMock } from "../utils/oyajiMock";
import { normalizeActivityRegions } from "../constants/activityRegions";

function createUser(base, overrides = {}) {
  const regions = normalizeActivityRegions(overrides.regions ?? overrides.region ?? base.regions ?? base.region);
  return {
    id: overrides.id || base.id || `user-${Math.random().toString(36).slice(2, 10)}`,
    name: overrides.name || base.name || "현장 사용자",
    userType: overrides.userType || "worker",
    trade: overrides.trade || base.craft || "film",
    role: overrides.role || base.trade || "기공",
    regions,
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
    regions: ["대전"],
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
  createUser({}, { id: "u-kim-92", name: "김기공92", phone: "010-1234-5678", regions: ["대전"], trade: "film", role: "필름 기공" }),
  createUser({}, { id: "u-kim-87", name: "김반장87", phone: "010-1234-9999", regions: ["천안"], trade: "tile", role: "타일 반장" }),
  createUser({}, { id: "u-kim-paint", name: "김페인트95", phone: "010-5678-1234", regions: ["대전"], trade: "paint", role: "페인트" }),
  createUser({}, { id: "u-lee-88", name: "이설비88", phone: "010-8888-1234", regions: ["세종"], trade: "plumbing", role: "설비" }),
  createUser({}, { id: "u-park-90", name: "박도배90", phone: "010-9012-3456", regions: ["청주"], trade: "wallpaper", role: "도배" }),
  createUser({}, { id: "u-choi-93", name: "최전기93", phone: "010-3456-7890", regions: ["대전"], trade: "electric", role: "전기" }),
  createUser({}, { id: "u-jung-91", name: "정타일91", phone: "010-2345-6789", regions: ["아산", "천안"], trade: "tile", role: "타일" }),
  createUser({}, { id: "u-pyung-94", name: "한기공94", phone: "010-4444-5555", regions: ["평택", "천안"], trade: "film", role: "필름" }),
];

export const mockMe = mockUsers[0];
