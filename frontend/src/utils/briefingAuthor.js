import { useUserStore } from "../store/useUserStore";
import { getPublicRoleBadgeLabel } from "./profilePersona";

export function buildBriefingAuthorFromViewer() {
  const st = useUserStore.getState();
  const p = st.profile;
  const name = String(p?.realName || p?.name || st.session?.user?.nickname || "나").trim() || "나";
  const image = String(p?.profileImage || st.session?.user?.profileImage || "").trim();
  const uid = Number(p?.applicantUserId);
  const sid = Number(st.session?.user?.id);
  const authorUserId = Number.isFinite(uid) && uid > 0 ? uid : Number.isFinite(sid) && sid > 0 ? sid : 0;
  const authorBirthYear = Number.isFinite(Number(p?.birthYear)) ? Number(p.birthYear) : null;
  return {
    authorName: name,
    authorImageUrl: image,
    authorRoleLabel: getPublicRoleBadgeLabel(p),
    authorUserId,
    authorBirthYear,
  };
}
