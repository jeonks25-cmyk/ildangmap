import React from "react";
import { Outlet } from "react-router-dom";
import MainTabBar from "../navigation/MainTabBar";
import MobileWriteFab from "./MobileWriteFab";

export default function AppShell() {
  return (
    <div className="daangn-shell">
      <main className="daangn-shell__main">
        <Outlet />
      </main>
      <MainTabBar />
      <MobileWriteFab />
    </div>
  );
}
