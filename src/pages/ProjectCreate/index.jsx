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
      <div className="pc-layout">
        {/* 좌측 사이드바 */}
        <aside className="pc-sidebar">
          <div className="pc-sidebar__header">
            <h1 className="pc-sidebar__title">새 프로젝트</h1>
            <p className="pc-sidebar__subtitle">단계별 모집</p>
          </div>

          {/* <div className="pc-sidebar__draft">
            <p className="pc-sidebar__draft-label">DRAFT SAVED</p>
            <p className="pc-sidebar__draft-desc">
              Last saved at 14:02 today. You can return to this later.
            </p>
          </div> */}
        </aside>

        {/* 메인 폼 영역 */}
        <main className="pc-main">
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
