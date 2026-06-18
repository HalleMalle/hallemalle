import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getProjectById, updateProject } from "@/api/project";
import { useAuth } from "@/contexts/AuthContext";

import ProjectForm from "@/components/ProjectForm";

import "./ProjectEdit.scss";

export default function ProjectEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const uid = user?.uid;

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || user === undefined) return;
    if (!user) {
      setError("로그인이 필요한 서비스입니다.");
      navigate("/login");
      return;
    }

    async function loadProject() {
      try {
        setLoading(true);

        const data = await getProjectById(id);

        if (!data) {
          setError("프로젝트를 찾을 수 없습니다.");
          navigate("/togethers");
          return;
        }

        // 작성자 본인이 맞는지 검증
        if (data.created_by !== uid) {
          setError("수정 권한이 없습니다.");
          navigate(`/togethers/${id}`);
          return;
        }

        setProjectData(data);
      } catch (err) {
        console.error("ProjectEdit load error:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [id, uid]);

  const handleSubmit = async (data) => {
    if (!user || !id) return;
    setError(null);

    try {
      const success = await updateProject(id, data, uid);
      if (success) {
        navigate(`/togethers/${id}`);
      }
    } catch (err) {
      console.error("ProjectEdit submit error:", err);
      setError("프로젝트 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="project-edit-page">
        <div className="project-edit-page__loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="project-edit-page">
      <div className="project-edit-page-layout">
        <aside className="project-edit-page-sidebar">
          <div className="project-edit-page-sidebar__header">
            <h1 className="project-edit-page-sidebar__title">프로젝트 수정</h1>
            <p className="project-edit-page-sidebar__subtitle">
              기존 프로젝트 정보 수정
            </p>
          </div>

          <div className="project-edit-page-sidebar__draft">
            <p className="project-edit-page-sidebar__draft-label">수정 상태</p>
            <p className="project-edit-page-sidebar__draft-desc">
              작성자 본인 인증 완료 후 내용을 수정하고 있습니다.
            </p>
          </div>
        </aside>

        <main className="project-edit-page-main">
          {error ? (
            <div className="project-edit-page-error-box">
              <p className="project-edit-page-error-text">{error}</p>
              <button
                className="project-edit-page-back-btn"
                onClick={handleCancel}
              >
                돌아가기
              </button>
            </div>
          ) : (
            projectData && (
              <ProjectForm
                initialData={projectData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                submitLabel="수정 완료"
              />
            )
          )}
        </main>
      </div>
    </div>
  );
}
