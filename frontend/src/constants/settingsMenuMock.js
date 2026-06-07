/** 설정 탭 메뉴 — 베타 MVP 최소 구성 */

export const SETTINGS_APP_VERSION = "0.1.0";

export const SETTINGS_SUPPORT_EMAIL = "contact@ildangmap.com";

export const SETTINGS_MENU_SECTIONS = [
  {
    id: "privacy-support",
    title: "개인정보 및 지원",
    items: [
      { id: "privacy", label: "개인정보처리방침", icon: "🛡️", action: "mock" },
      { id: "terms", label: "이용약관", icon: "📄", action: "mock" },
      {
        id: "email",
        label: "이메일 문의",
        icon: "✉️",
        action: "email",
        value: SETTINGS_SUPPORT_EMAIL,
      },
    ],
  },
  {
    id: "community",
    title: "커뮤니티",
    items: [
      { id: "blog", label: "공식 블로그", icon: "📝", action: "mock" },
      { id: "instagram", label: "인스타그램", icon: "📷", action: "mock" },
    ],
  },
  {
    id: "app-info",
    title: "앱 정보",
    items: [
      { id: "about-app", label: "일당맵 소개", icon: "🗺️", action: "mock" },
      {
        id: "app-version",
        label: "버전 정보",
        icon: "ℹ️",
        action: "none",
        value: `v${SETTINGS_APP_VERSION}`,
      },
    ],
  },
];
