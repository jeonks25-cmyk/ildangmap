/** 설정 탭 메뉴 — 베타 MVP 최소 구성 */

export const SETTINGS_APP_VERSION = "0.1.0";

export const SETTINGS_SUPPORT_EMAIL = "contact@ildangmap.com";

/**
 * 베타 기간 설정 탭 간소화
 * 정식 출시 시 REACT_APP_SETTINGS_BETA_SIMPLIFIED=false 로 전체 메뉴 복원
 */
export const SETTINGS_BETA_SIMPLIFIED =
  String(process.env.REACT_APP_SETTINGS_BETA_SIMPLIFIED ?? "true").trim() !== "false";

export const PROFILE_MENU_ITEM = {
  id: "my-profile",
  label: "내 정보 관리",
  icon: "👤",
  action: "route",
  path: "/settings/profile",
};

export const BETA_FEEDBACK_MENU_ITEM = {
  id: "beta-feedback",
  label: "버그·의견 보내기",
  icon: "💬",
  action: "route",
  path: "/settings/beta-feedback",
};

export const ILDANG_NEWS_MENU_ITEM = {
  id: "ildang-news",
  label: "일당맵 소식",
  icon: "📢",
  action: "route",
  path: "/settings/news",
};

export const PLACE_REPORT_ADMIN_MENU_ITEM = {
  id: "place-report-admin",
  label: "장소 신고 검수",
  icon: "🚨",
  action: "route",
  path: "/settings/place-reports/admin",
};

export const BETA_FEEDBACK_ADMIN_MENU_ITEM = {
  id: "beta-feedback-admin",
  label: "베타 피드백 관리",
  icon: "📋",
  action: "route",
  path: "/settings/beta-feedback/admin",
};

export const SETTINGS_MENU_SECTIONS = [
  {
    id: "account",
    title: "계정",
    items: [PROFILE_MENU_ITEM],
  },
  {
    id: "beta",
    title: "베타 테스트",
    items: [ILDANG_NEWS_MENU_ITEM, BETA_FEEDBACK_MENU_ITEM],
  },
  {
    id: "privacy-support",
    title: "개인정보 및 지원",
    items: [
      { id: "privacy", label: "개인정보처리방침", icon: "🛡️", action: "mock", hiddenDuringBeta: true },
      { id: "terms", label: "이용약관", icon: "📄", action: "mock", hiddenDuringBeta: true },
      {
        id: "email",
        label: "이메일 문의",
        icon: "✉️",
        action: "email",
        value: SETTINGS_SUPPORT_EMAIL,
        hiddenDuringBeta: true,
      },
    ],
  },
  {
    id: "community",
    title: "커뮤니티",
    items: [
      { id: "blog", label: "공식 블로그", icon: "📝", action: "mock", hiddenDuringBeta: true },
      { id: "instagram", label: "인스타그램", icon: "📷", action: "mock", hiddenDuringBeta: true },
    ],
  },
  {
    id: "app-info",
    title: "앱 정보",
    items: [
      { id: "about-app", label: "일당맵 소개", icon: "🗺️", action: "mock", hiddenDuringBeta: true },
      {
        id: "app-version",
        label: "버전 정보",
        icon: "ℹ️",
        action: "none",
        value: `v${SETTINGS_APP_VERSION}`,
        hiddenDuringBeta: true,
      },
    ],
  },
];

/** 베타 간소화 플래그에 따라 노출할 섹션·항목만 반환 */
export function getVisibleSettingsMenuSections(
  sections = SETTINGS_MENU_SECTIONS,
  { betaSimplified = SETTINGS_BETA_SIMPLIFIED } = {}
) {
  if (!betaSimplified) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.hiddenDuringBeta),
    }))
    .filter((section) => section.items.length > 0);
}
