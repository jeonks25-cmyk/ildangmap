import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { OYAJI_MAIN_TABS } from "../../constants/oyajiTabLabels";
import { useUiStore } from "../../store/useUiStore";

function isTabActive(tabKey, pathname) {
  if (tabKey === "home") return pathname === "/home" || pathname === "/";
  if (tabKey === "map") return pathname === "/map";
  if (tabKey === "settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }
  return pathname === `/${tabKey}` || pathname.startsWith(`/${tabKey}/`);
}

/** 단일 홈(지도) — 역할별 탭 분기 없음 */
export default function MainTabBar() {
  const location = useLocation();
  const setCurrentTab = useUiStore((state) => state.setCurrentTab);
  const tabs = OYAJI_MAIN_TABS;
  const tabCountClass = tabs.length === 4 ? "geo-tabbar--four" : tabs.length === 3 ? "geo-tabbar--three" : "geo-tabbar--five";

  useEffect(() => {
    setCurrentTab(location.pathname);
  }, [location.pathname, setCurrentTab]);

  return (
    <div className="geo-tabbar-shell geo-tabbar-shell--oyaji">
      <nav className={`geo-tabbar ${tabCountClass} geo-tabbar--oyaji`} aria-label="현장 운영 메뉴">
        {tabs.map((tab) => {
          const active = isTabActive(tab.key, location.pathname);
          return (
            <NavLink
              key={tab.key}
              to={tab.to}
              end
              className={`geo-tabbar__item${active ? " geo-tabbar__item--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className={`geo-tabbar__icon ${tab.iconClass}`} aria-hidden="true" />
              <span className="geo-tabbar__label">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
