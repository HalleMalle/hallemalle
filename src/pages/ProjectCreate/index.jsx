import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { createProject } from "@/api/project";

import ProjectForm from "@/components/ProjectForm";

import "./ProjectCreate.scss";

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [error, setError] = useState(null);

  const handleSubmit = async (data) => {
    if (!user) return;
    setError(null);

    try {
      const projectData = {
        ...data,
        creatorId: user.uid,
      };

      const result = await createProject(projectData);

      if (result?.id) {
        navigate(`/togethers/${result.id}`);
      }
    } catch (err) {
      console.error("ProjectCreate submit error:", err);
      setError("프로젝트 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="project-create-page">
      <div className="project-create-page-layout">
        {/* 좌측 사이드바 */}
        <aside className="project-create-page-sidebar">
          <div className="project-create-page-sidebar__header">
            <h1 className="project-create-page-sidebar__title">새 프로젝트</h1>
            <p className="project-create-page-sidebar__subtitle">
              프로젝트 생성 페이지
            </p>
          </div>

          <div className="project-create-page-sidebar__draft">
            <p className="project-create-page-sidebar__draft-label">생성</p>
            <p className="project-create-page-sidebar__draft-desc">
              {new Date().toLocaleDateString()} 기준으로 프로젝트 작성을
              시작하셨습니다.
            </p>
          </div>
        </aside>

        {/* 메인 폼 영역 */}
        <main className="project-create-page-main">
          {error && <div className="project-create-page-error">{error}</div>}
          <ProjectForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="프로젝트 등록"
          />
        </main>
      </div>
    </div>
  );
}
