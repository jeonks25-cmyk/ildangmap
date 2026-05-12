import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { JobsProvider } from "./context/JobsContext";
import { UserMapPreferencesProvider } from "./context/UserMapPreferencesContext";
import AppShell from "./components/layout/AppShell";
import MapPage from "./pages/MapPage";
import JobDetailPage from "./pages/JobDetailPage";
import CommunityTabPage from "./pages/CommunityTabPage";
import ChatTabPage from "./pages/ChatTabPage";
import MyTabPage from "./pages/MyTabPage";
import CalendarPage from "./CalendarPage";

export default function App() {
  return (
    <BrowserRouter>
      <JobsProvider>
        <UserMapPreferencesProvider>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="map" replace />} />
            <Route path="map" element={<MapPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="community" element={<CommunityTabPage />} />
            <Route path="chat" element={<ChatTabPage />} />
            <Route path="my" element={<MyTabPage />} />
          </Route>
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/job/:id" element={<JobDetailPage />} />
        </Routes>
        </UserMapPreferencesProvider>
      </JobsProvider>
    </BrowserRouter>
  );
}
