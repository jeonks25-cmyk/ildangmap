import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import MapPage from "./pages/MapPage";
import MyTabPage from "./pages/MyTabPage";
import ContactsTabPage from "./pages/ContactsTabPage";
import ScheduleTabPage from "./pages/ScheduleTabPage";
import OAuthPage from "./OAuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import "./styles/auth-callback.css";
import { PersonCardProvider } from "./context/PersonCardContext";

const FieldScheduleDetailPage = lazy(() => import("./pages/FieldScheduleDetailPage"));
const BriefingRoomPage = lazy(() => import("./pages/BriefingRoomPage"));
const ScheduleBriefingRoomPage = lazy(() => import("./pages/ScheduleBriefingRoomPage"));
const TodayFieldWorkPage = lazy(() => import("./pages/TodayFieldWorkPage"));
const VisitEstimateRequestPage = lazy(() => import("./pages/VisitEstimateRequestPage"));
const FieldNotificationsTabPage = lazy(() => import("./pages/FieldNotificationsTabPage"));
const FieldNotificationDetailPage = lazy(() => import("./pages/FieldNotificationDetailPage"));
const ChatTabPage = lazy(() => import("./pages/ChatTabPage"));
const ChatRoomPage = lazy(() => import("./pages/ChatRoomPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));

const BetaFeedbackPage = lazy(() => import("./pages/BetaFeedbackPage"));
const BetaFeedbackAdminPage = lazy(() => import("./pages/BetaFeedbackAdminPage"));
const PlaceReportAdminPage = lazy(() => import("./pages/PlaceReportAdminPage"));
const ProfileEditPage = lazy(() => import("./pages/ProfileEditPage"));
const InviteLandingPage = lazy(() => import("./pages/InviteLandingPage"));
const NewsFeedPage = lazy(() => import("./pages/NewsFeedPage"));
const NewsDetailPage = lazy(() => import("./pages/NewsDetailPage"));

function LazyRoute({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function HomeRoute() {
  return <Navigate to="/map" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <PersonCardProvider>
        <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="map" replace />} />
          <Route path="home" element={<HomeRoute />} />
          <Route path="map" element={<MapPage />} />
          <Route
            path="invite"
            element={
              <LazyRoute>
                <InviteLandingPage />
              </LazyRoute>
            }
          />
          <Route path="schedule/*" element={<ScheduleTabPage />} />
          <Route path="contacts" element={<ContactsTabPage />} />
          <Route
            path="notifications/:threadId"
            element={
              <LazyRoute>
                <FieldNotificationDetailPage />
              </LazyRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <LazyRoute>
                <FieldNotificationsTabPage />
              </LazyRoute>
            }
          />
          <Route path="settings" element={<MyTabPage />} />
          <Route
            path="settings/profile"
            element={
              <LazyRoute>
                <ProfileEditPage />
              </LazyRoute>
            }
          />
          <Route
            path="settings/news"
            element={
              <LazyRoute>
                <NewsFeedPage />
              </LazyRoute>
            }
          />
          <Route
            path="settings/news/:newsId"
            element={
              <LazyRoute>
                <NewsDetailPage />
              </LazyRoute>
            }
          />
          <Route
            path="settings/beta-feedback"
            element={
              <LazyRoute>
                <BetaFeedbackPage />
              </LazyRoute>
            }
          />
          <Route
            path="settings/place-reports/admin"
            element={
              <LazyRoute>
                <PlaceReportAdminPage />
              </LazyRoute>
            }
          />
          <Route
            path="settings/beta-feedback/admin"
            element={
              <LazyRoute>
                <BetaFeedbackAdminPage />
              </LazyRoute>
            }
          />
          <Route
            path="visit-estimate"
            element={
              <LazyRoute>
                <VisitEstimateRequestPage />
              </LazyRoute>
            }
          />
          <Route path="my-work" element={<Navigate to="/schedule" replace />} />
          <Route path="ops-feed" element={<Navigate to="/notifications" replace />} />
          <Route path="my" element={<Navigate to="/settings" replace />} />
          <Route path="favorites" element={<Navigate to="/contacts" replace />} />
          <Route path="calendar" element={<Navigate to="/schedule" replace />} />
          <Route path="settlement" element={<Navigate to="/schedule" replace />} />
          <Route path="briefing" element={<Navigate to="/schedule" replace state={{ focusMarketBriefing: true }} />} />
          <Route path="community" element={<Navigate to="/notifications" replace />} />
          <Route
            path="chat"
            element={
              <LazyRoute>
                <ChatTabPage />
              </LazyRoute>
            }
          />
          <Route
            path="chat/:roomId"
            element={
              <LazyRoute>
                <ChatRoomPage />
              </LazyRoute>
            }
          />
        </Route>
        <Route
          path="/jobs/:id"
          element={
            <LazyRoute>
              <JobDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="/jobs/:id/briefing"
          element={
            <LazyRoute>
              <BriefingRoomPage />
            </LazyRoute>
          }
        />
        <Route
          path="/briefing-room/:briefingId"
          element={
            <LazyRoute>
              <ScheduleBriefingRoomPage />
            </LazyRoute>
          }
        />
        <Route
          path="/today-field/:scheduleId"
          element={
            <LazyRoute>
              <TodayFieldWorkPage />
            </LazyRoute>
          }
        />
        <Route
          path="/schedule/field/:scheduleId"
          element={
            <LazyRoute>
              <FieldScheduleDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="/job/:id"
          element={
            <LazyRoute>
              <JobDetailPage />
            </LazyRoute>
          }
        />
        <Route path="/oauth/kakao/callback" element={<OAuthPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
      </PersonCardProvider>
    </BrowserRouter>
  );
}
