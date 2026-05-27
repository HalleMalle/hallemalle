import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchProjects, fetchProject } from "../../hooks/useProjects";
import {
  fetchApplicationsByCreator,
  fetchApplicationsByApplicant,
} from "../../hooks/useApplications";
import CollaborationScore from "../../components/common/CollaborationScore";
import "./MyProjects.scss";

const STATUS_LABELS = {
  recruiting: "모집중",
  closed: "모집마감",
  completed: "✅ 완료",
};

export default function MyProjects() {
  const { user, loading: authLoading } = useAuth();
  const [myProjects, setMyProjects] = useState([]);
  const [myTeamProjects, setMyTeamProjects] = useState([]);
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      try {
        const [created, myApps] = await Promise.all([
          fetchProjects({ creatorId: user.uid }),
          fetchApplicationsByApplicant(user.uid),
        ]);
        setMyProjects(created);

        const approved = myApps.filter((a) => a.status === "approved");
        if (approved.length > 0) {
          const teamProjs = await Promise.all(
            approved.map((app) => fetchProject(app.projectId)),
          );
          const seen = new Set();
          const unique = [];
          for (const p of teamProjs) {
            if (p && !seen.has(p.id)) {
              seen.add(p.id);
              unique.push(p);
            }
          }
          setMyTeamProjects(unique);
        }

        const appsToMyProjects = await fetchApplicationsByCreator(user.uid);
        setRecentApps(appsToMyProjects.slice(0, 5));
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  if (authLoading || loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) return null;

  const pendingAppsCount = recentApps.filter(
    (a) => a.status === "pending",
  ).length;

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-greeting">
              안녕하세요, {user.displayName || "사용자"}님
            </h1>
            <p className="dashboard-subtitle">
              내 프로젝트 현황을 한눈에 확인하세요
            </p>
          </div>
          <CollaborationScore score={user.collaborationScore} size="md" />
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-number">{myProjects.length}</span>
            <span className="stat-label">생성한 프로젝트</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{myTeamProjects.length}</span>
            <span className="stat-label">참여 중인 팀</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{pendingAppsCount}</span>
            <span className="stat-label">처리 대기 신청</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {myProjects.filter((p) => p.status === "completed").length}
            </span>
            <span className="stat-label">완료한 프로젝트</span>
          </div>
        </div>

        <div className="dashboard-actions">
          <Link
            to="/project/create"
            className="action-card action-card--create"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>새 프로젝트</span>
          </Link>
          {myProjects.length > 0 && (
            <Link
              to={`/applications/manage/${myProjects[0]?.id}`}
              className="action-card action-card--apps"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span>신청 관리</span>
            </Link>
          )}
          <Link to="/profile" className="action-card action-card--profile">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>내 프로필</span>
          </Link>
          <Link
            to="/my-applications"
            className="action-card action-card--apps-sent"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>내 신청</span>
          </Link>
        </div>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>내 프로젝트</h2>
            {myProjects.length > 0 && (
              <Link to="/project-list" className="section-link">
                전체 보기
              </Link>
            )}
          </div>
          {myProjects.length === 0 ? (
            <div className="section-empty">
              <p>아직 생성한 프로젝트가 없습니다.</p>
              <Link to="/project/create" className="btn-primary">
                첫 프로젝트 만들기
              </Link>
            </div>
          ) : (
            <div className="project-list">
              {myProjects.map((project) => {
                const appsForProject = recentApps.filter(
                  (a) => a.projectId === project.id,
                );
                const approvedCount = appsForProject.filter(
                  (a) => a.status === "approved",
                ).length;
                return (
                  <Link
                    key={project.id}
                    to={`/project-list/${project.id}`}
                    className="dashboard-project-card"
                  >
                    <div className="dpc-top">
                      <span className={`dpc-status ${project.status}`}>
                        {STATUS_LABELS[project.status] || project.status}
                      </span>
                      <span className="dpc-stage">
                        {project.participationStage === "planning"
                          ? "기획"
                          : project.participationStage === "development"
                            ? "개발"
                            : "유지보수"}
                      </span>
                    </div>
                    <h3 className="dpc-title">{project.title}</h3>
                    <div className="dpc-meta">
                      <span>
                        신청 {appsForProject.length}건
                        {approvedCount > 0 && ` · ${approvedCount}명 승인`}
                      </span>
                      <span>{project.positions?.length || 0}개 포지션</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>참여 중인 프로젝트</h2>
          </div>
          {myTeamProjects.length === 0 ? (
            <div className="section-empty">
              <p>아직 참여 중인 팀 프로젝트가 없습니다.</p>
              <Link to="/project-list" className="btn-primary">
                프로젝트 둘러보기
              </Link>
            </div>
          ) : (
            <div className="project-list">
              {myTeamProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/project-list/${project.id}`}
                  className="dashboard-project-card team"
                >
                  <div className="dpc-top">
                    <span className={`dpc-status ${project.status}`}>
                      {STATUS_LABELS[project.status] || project.status}
                    </span>
                    <span className="dpc-creator">
                      {project.creatorName || "알 수 없음"}
                    </span>
                  </div>
                  <h3 className="dpc-title">{project.title}</h3>
                  <div className="dpc-meta">
                    <span>팀원으로 참여 중</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {recentApps.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header">
              <h2>최근 신청 현황</h2>
              <Link
                to={`/applications/manage/${myProjects[0]?.id || ""}`}
                className="section-link"
              >
                전체 보기
              </Link>
            </div>
            <div className="recent-apps-list">
              {recentApps.map((app) => (
                <div key={app.id} className="recent-app-item">
                  <div className="recent-app-info">
                    <span className={`recent-app-status ${app.status}`}>
                      {app.status === "pending"
                        ? "⏳ 대기"
                        : app.status === "approved"
                          ? "✅ 승인"
                          : "❌ 반려"}
                    </span>
                    <span className="recent-app-project">
                      프로젝트 ID: {app.projectId.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
