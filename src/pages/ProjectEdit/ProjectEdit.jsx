import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ProjectForm from "../../components/project/ProjectForm";
import { fetchProject, updateProject } from "../../hooks/useProjects";
import "./ProjectEdit.scss";

export default function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("recruiting");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [completeConfirm, setCompleteConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProject(id);
        if (!data) {
          navigate("/project-list", { replace: true });
          return;
        }
        if (data.creatorId !== user?.uid) {
          navigate(`/project-list/${id}`, { replace: true });
          return;
        }
        setProject(data);
        setStatus(data.status || "recruiting");
      } catch (error) {
        console.error("Failed to load project:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, navigate]);

  const handleUpdate = async (data) => {
    await updateProject(id, data);
    navigate(`/project-list/${id}`);
  };

  const handleStatusToggle = async () => {
    setStatusUpdating(true);
    try {
      const newStatus = status === "recruiting" ? "closed" : "recruiting";
      await updateProject(id, { status: newStatus });
      setStatus(newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleComplete = async () => {
    setStatusUpdating(true);
    try {
      await updateProject(id, { status: "completed" });
      setStatus("completed");
      setCompleteConfirm(false);
    } catch (error) {
      console.error("Failed to complete project:", error);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="project-edit-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="project-edit-page">
      <div className="container">
        <div className="pe-header">
          <h1>프로젝트 수정</h1>
          <Link to={`/project-list/${id}`} className="pe-view-link">
            미리보기 &rarr;
          </Link>
        </div>

        {status === "completed" ? (
          <div className="pe-status-section pe-status-completed">
            <span className="pe-status-label">프로젝트 상태</span>
            <span className="pe-completed-badge">✅ 완료된 프로젝트</span>
            <span className="pe-status-hint">
              완료된 프로젝트는 팀원 평가를 진행할 수 있습니다.
            </span>
          </div>
        ) : (
          <>
            <div className="pe-status-section">
              <span className="pe-status-label">모집 상태</span>
              <button
                type="button"
                className={`pe-status-toggle ${status}`}
                onClick={handleStatusToggle}
                disabled={statusUpdating}
              >
                {status === "recruiting" ? "🟢 모집중" : "🔴 모집마감"}
              </button>
              <span className="pe-status-hint">
                클릭하여 {status === "recruiting" ? "모집마감" : "모집중"}으로
                변경
              </span>
            </div>

            <div className="pe-status-section">
              <span className="pe-status-label">프로젝트 종료</span>
              {!completeConfirm ? (
                <button
                  type="button"
                  className="pe-complete-btn"
                  onClick={() => setCompleteConfirm(true)}
                  disabled={statusUpdating}
                >
                  프로젝트 완료
                </button>
              ) : (
                <div className="pe-complete-confirm">
                  <span className="pe-complete-warn">
                    완료 처리하면 되돌릴 수 없습니다. 계속하시겠습니까?
                  </span>
                  <div className="pe-complete-actions">
                    <button
                      type="button"
                      className="pe-complete-yes"
                      onClick={handleComplete}
                      disabled={statusUpdating}
                    >
                      {statusUpdating ? "처리 중..." : "완료 처리"}
                    </button>
                    <button
                      type="button"
                      className="pe-complete-no"
                      onClick={() => setCompleteConfirm(false)}
                      disabled={statusUpdating}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              <span className="pe-status-hint">
                프로젝트가 완료되면 팀원 평가를 진행할 수 있습니다.
              </span>
            </div>
          </>
        )}

        <ProjectForm
          initialData={project}
          onSubmit={handleUpdate}
          submitLabel="수정 완료"
        />
      </div>
    </div>
  );
}
