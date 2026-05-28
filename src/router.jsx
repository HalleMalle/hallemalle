import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Layout from "./components/layout/Layout";

// Pages (Placeholder → 구현 시 페이지별 파일 생성)
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Profile from "./pages/Profile/Profile";
import Portfolio from "./pages/Portfolio/Portfolio";
import ProjectList from "./pages/ProjectList/ProjectList";
import ProjectDetail from "./pages/ProjectDetail/ProjectDetail";
import ProjectCreate from "./pages/ProjectCreate/ProjectCreate";
import ProjectEdit from "./pages/ProjectEdit/ProjectEdit";
import References from "./pages/References/References";
import Notifications from "./pages/Notifications/Notifications";
import MyProjects from "./pages/MyProjects/MyProjects";
import Retrospectives from "./pages/Retrospectives/Retrospectives";
import WriteReview from "./pages/WriteReview/WriteReview";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route element={<Layout />}>
              {/* 인증 불필요 */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/project-list" element={<ProjectList />} />
              <Route path="/project-list/:id" element={<ProjectDetail />} />
              <Route path="/references" element={<References />} />
              <Route path="/retrospectives" element={<Retrospectives />} />

              {/* 인증 필요 */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/portfolio"
                element={
                  <ProtectedRoute>
                    <Portfolio />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/create"
                element={
                  <ProtectedRoute>
                    <ProjectCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:id/edit"
                element={
                  <ProtectedRoute>
                    <ProjectEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-projects"
                element={
                  <ProtectedRoute>
                    <MyProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/write-review/:projectId/:targetUserId"
                element={
                  <ProtectedRoute>
                    <WriteReview />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              {/* TODO: 에러 풀 페이지로 분리 */}
              <Route
                path="*"
                element={
                  <main className="not-found">
                    <h1>404</h1>
                    <p>페이지를 찾을 수 없습니다.</p>
                    <Link to="/" className="not-found-link">
                      홈으로 가기
                    </Link>
                  </main>
                }
              />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
