import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JobsProvider } from "./context/JobsContext";
import AppShell from "./components/layout/AppShell";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import JobDetailPage from "./pages/JobDetailPage";
import CommunityTabPage from "./pages/CommunityTabPage";
import ChatTabPage from "./pages/ChatTabPage";
import MyTabPage from "./pages/MyTabPage";

export default function App() {
  return (
    <BrowserRouter>
      <JobsProvider>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="community" element={<CommunityTabPage />} />
            <Route path="chat" element={<ChatTabPage />} />
            <Route path="my" element={<MyTabPage />} />
          </Route>
          <Route path="/job/:id" element={<JobDetailPage />} />
        </Routes>
      </JobsProvider>
    </BrowserRouter>
  );
}
