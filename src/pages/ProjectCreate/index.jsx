import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// import { createProject } from "@/api/project";

import ProjectForm from "@/components/ProjectForm";

import "./ProjectCreate.scss";

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (data) => {
    if (!user) return;

    const projectData = {
      ...data,
      creatorId: user.uid,
      creatorName: user.displayName || user.username,
      creatorPhoto: user.photoURL,
    };

    // const result = await createProject(projectData);

    if (result?.id) {
      navigate(`/project-list/${result.id}`);
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
          <ProjectForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Next Step"
          />
        </main>
      </div>
    </div>
  );
}
