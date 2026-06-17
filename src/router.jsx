import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Layout from "@/components/layout/Layout";

// Pages (Placeholder → 구현 시 페이지별 파일 생성)
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Portfolio from "@/pages/Portfolio";
import ProjectList from "@/pages/ProjectList";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectCreate from "@/pages/ProjectCreate";
import ProjectEdit from "@/pages/ProjectEdit";
import ReferenceList from "@/pages/ReferenceList";
import MyScrappedReferences from "@/pages/MyScrappedReferences";
import Notifications from "@/pages/Notifications";
import RequestList from "@/pages/RequestList";
import ResponseList from "@/pages/ResponseList";
import MyProjects from "@/pages/MyProjects";
import RetrospectiveList from "@/pages/RetrospectiveList";
import RetrospectiveWrite from "@/pages/RetrospectiveWrite";
import RetrospectiveDetail from "@/pages/RetrospectiveDetail";
import RetrospectiveEdit from "@/pages/RetrospectiveEdit";
import MyRetrospectives from "@/pages/MyRetrospectives";
import ReviewWrite from "@/pages/ReviewWrite";

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
              <Route path="/references" element={<ReferenceList />} />
              <Route path="/memoirs" element={<RetrospectiveList />} />

              {/* 인증 필요 */}
              <Route
                path="/togethers"
                element={
                  <ProtectedRoute>
                    <ProjectList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/togethers/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                }
              />
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
                    <ResponseList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/requests"
                element={
                  <ProtectedRoute>
                    <RequestList />
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
              <Route
                path="/profile/references/my-scrap"
                element={
                  <ProtectedRoute>
                    <MyScrappedReferences />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/memoirs/my-article"
                element={
                  <ProtectedRoute>
                    <MyRetrospectives />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/memoirs/write"
                element={
                  <ProtectedRoute>
                    <RetrospectiveWrite />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/memoirs/:memoirId"
                element={
                  <ProtectedRoute>
                    <RetrospectiveDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/memoirs/:memoirId/edit"
                element={
                  <ProtectedRoute>
                    <RetrospectiveEdit />
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
