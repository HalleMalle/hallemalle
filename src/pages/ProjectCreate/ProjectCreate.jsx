import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ProjectForm from "../../components/project/ProjectForm";
import { createProject } from "../../hooks/useProjects";
import "./ProjectCreate.scss";

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (data) => {
    const projectData = {
      ...data,
      creatorId: user.uid,
      creatorName: user.displayName || user.username,
      creatorPhoto: user.photoURL,
    };

    const result = await createProject(projectData);

    if (result?.id) {
      navigate(`/project-list/${result.id}`);
    }
  };

  return (
    <div className="project-create-page">
      <div className="container">
        <h1 className="pc-title">새 프로젝트</h1>
        <ProjectForm onSubmit={handleSubmit} submitLabel="프로젝트 등록" />
      </div>
    </div>
  );
}
