import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchProject } from "../../hooks/useProjects";
import {
  fetchApplicationsByProject,
  updateApplicationStatus,
} from "../../hooks/useApplications";
import { db, doc, getDoc } from "../../api/firebase";
import "./ApplicationsManage.scss";

const STATUS_LABELS = {
  pending: "대기 중",
  approved: "승인",
  rejected: "반려",
};

export default function ApplicationsManage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicantProfiles, setApplicantProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const proj = await fetchProject(projectId);
        if (!proj || proj.creatorId !== user?.uid) {
          setProject(null);
          setLoading(false);
          return;
        }
        setProject(proj);

        const apps = await fetchApplicationsByProject(projectId);
        setApplications(apps);

        // Fetch applicant profiles
        const profiles = {};
        await Promise.all(
          apps.map(async (app) => {
            const snap = await getDoc(doc(db, "users", app.applicantId));
            if (snap.exists()) {
              profiles[app.applicantId] = { id: snap.id, ...snap.data() };
            }
          }),
        );
        setApplicantProfiles(profiles);
      } catch (error) {
        console.error("Failed to load applications:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, user]);

  const handleStatus = async (appId, status) => {
    setUpdatingId(appId);
    try {
      await updateApplicationStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a)),
      );
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="am-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="am-page">
        <div className="am-empty">
          <h2>접근 권한이 없습니다</h2>
          <Link to="/project-list" className="btn-primary">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const pendingApps = applications.filter((a) => a.status === "pending");
  const processedApps = applications.filter((a) => a.status !== "pending");

  const ProfileCard = ({ applicantId }) => {
    const profile = applicantProfiles[applicantId];
    if (!profile) return <span className="text-muted">알 수 없음</span>;
    return (
      <div className="am-profile">
        <img
          src={profile.photoURL || "/default-avatar.png"}
          alt=""
          className="am-profile-avatar"
        />
        <div>
          <p className="am-profile-name">
            {profile.displayName || "사용자"}
            <span className="am-profile-username">@{profile.username}</span>
          </p>
          <div className="am-profile-bio">{profile.bio || ""}</div>
          {profile.techStack?.length > 0 && (
            <div className="am-profile-stack">
              {profile.techStack.map((t) => (
                <span key={t} className="tag tag--skill">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="am-page">
      <div className="container">
        <div className="am-header">
          <Link to={`/project-list/${projectId}`} className="pd-back">
            &larr; 프로젝트로
          </Link>
          <h1>신청 관리</h1>
          <p className="am-project-title">{project.title}</p>
        </div>

        {project.status === "completed" && (
          <div className="am-completed-banner">
            ✅ 완료된 프로젝트입니다. 더 이상 신청을 처리할 수 없습니다.
          </div>
        )}

        {/* Pending */}
        <section className="am-section">
          <h2>
            대기 중인 신청{" "}
            <span className="am-count">{pendingApps.length}</span>
          </h2>
          {pendingApps.length === 0 ? (
            <p className="am-none">대기 중인 신청이 없습니다.</p>
          ) : (
            <div className="am-list">
              {pendingApps.map((app) => (
                <div key={app.id} className="am-card pending">
                  <ProfileCard applicantId={app.applicantId} />
                  {app.message && <p className="am-message">{app.message}</p>}
                  <div className="am-actions">
                    <button
                      type="button"
                      className="am-btn approve"
                      onClick={() => handleStatus(app.id, "approved")}
                      disabled={
                        updatingId === app.id || project.status === "completed"
                      }
                    >
                      {updatingId === app.id ? "처리 중..." : "승인"}
                    </button>
                    <button
                      type="button"
                      className="am-btn reject"
                      onClick={() => handleStatus(app.id, "rejected")}
                      disabled={
                        updatingId === app.id || project.status === "completed"
                      }
                    >
                      반려
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Processed */}
        {processedApps.length > 0 && (
          <section className="am-section">
            <h2>처리 완료</h2>
            <div className="am-list">
              {processedApps.map((app) => (
                <div key={app.id} className={`am-card ${app.status}`}>
                  <ProfileCard applicantId={app.applicantId} />
                  {app.message && <p className="am-message">{app.message}</p>}
                  <div className="am-status-badge">
                    {app.status === "approved" ? "✅ 승인" : "❌ 반려"}
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
