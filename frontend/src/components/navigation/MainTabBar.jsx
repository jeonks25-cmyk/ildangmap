import React from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/map", end: true, label: "지도", icon: "🗺️" },
  { to: "/calendar", label: "캘린더", icon: "📅" },
  { to: "/community", label: "커뮤니티", icon: "📮" },
  { to: "/chat", label: "채팅", icon: "💬" },
  { to: "/my", label: "내정보", icon: "👤" },
];

export default function MainTabBar() {
  return (
    <nav className="daangn-tabbar" aria-label="하단 메뉴">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `daangn-tabbar__item${isActive ? " daangn-tabbar__item--active" : ""}`
          }
        >
          <span className="daangn-tabbar__icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="daangn-tabbar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
