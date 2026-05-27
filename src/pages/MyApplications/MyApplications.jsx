import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchApplicationsByApplicant } from "../../hooks/useApplications";
import { db, doc, getDoc } from "../../api/firebase";
import "./MyApplications.scss";

const STATUS_CONFIG = {
  pending: { label: "대기 중", className: "pending" },
  approved: { label: "✅ 승인", className: "approved" },
  rejected: { label: "❌ 반려", className: "rejected" },
};

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [projectNames, setProjectNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const apps = await fetchApplicationsByApplicant(user.uid);
        setApplications(apps);

        const names = {};
        await Promise.all(
          apps.map(async (app) => {
            const snap = await getDoc(doc(db, "projects", app.projectId));
            if (snap.exists()) {
              names[app.projectId] = snap.data().title;
            }
          }),
        );
        setProjectNames(names);
      } catch (error) {
        console.error("Failed to load applications:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="ma-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="ma-page">
      <div className="container">
        <h1>내 신청 현황</h1>

        {applications.length === 0 ? (
          <div className="ma-empty">
            <p>아직 신청한 프로젝트가 없습니다.</p>
            <Link to="/project-list" className="btn-primary">
              프로젝트 둘러보기
            </Link>
          </div>
        ) : (
          <div className="ma-list">
            {applications.map((app) => {
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
              return (
                <div key={app.id} className={`ma-card ${cfg.className}`}>
                  <div className="ma-card-top">
                    <Link
                      to={`/project-list/${app.projectId}`}
                      className="ma-project-name"
                    >
                      {projectNames[app.projectId] || "알 수 없음"}
                    </Link>
                    <span className={`ma-status ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {app.message && <p className="ma-message">{app.message}</p>}
                  <div className="ma-card-footer">
                    <Link
                      to={`/project-list/${app.projectId}`}
                      className="ma-view-link"
                    >
                      프로젝트 보기 &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
