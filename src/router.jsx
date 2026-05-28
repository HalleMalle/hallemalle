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
import ReferenceList from "./pages/ReferenceList/ReferenceList";
import Notifications from "./pages/Notifications/Notifications";
import MyProjects from "./pages/MyProjects/MyProjects";
import RetrospectiveList from "./pages/RetrospectiveList/RetrospectiveList";
import ReviewWrite from "./pages/ReviewWrite/ReviewWrite";

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
              <Route path="/togethers" element={<ProjectList />} />
              <Route path="/togethers/:id" element={<ProjectDetail />} />
              <Route path="/references" element={<ReferenceList />} />
              <Route path="/memoirs" element={<RetrospectiveList />} />

              {/* 인증 필요 */}
              <Route
                path="/togethers/write"
                element={
                  <ProtectedRoute>
                    <ProjectCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/togethers/:id/edit" 
                element={
                  <ProtectedRoute>
                    <ProjectEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/togethers/:id/review/:targetUserId"
                element={
                  <ProtectedRoute>
                    <ReviewWrite />
                  </ProtectedRoute>
                }
              />
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
                path="/profile/responses"
                element={
                  <ProtectedRoute>
                    {/* <ResponseList /> */}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/requests"
                element={
                  <ProtectedRoute>
                    {/* <RequestList /> */}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/togethers"
                element={
                  <ProtectedRoute>
                    <MyProjects />
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
