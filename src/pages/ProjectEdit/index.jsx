import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getProjectById, updateProject, deleteProject } from "@/api/project"; // deleteProject 추가
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

  // 모달 제어를 위한 상태값 추가
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [id, user, uid, navigate]);

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

  // 프로젝트 실제 삭제 처리 핸들러
  const handleDeleteConfirm = async () => {
    if (!id || isDeleting) return;

    try {
      setIsDeleting(true);
      const success = await deleteProject(id);
      if (success) {
        setShowConfirmModal(false);
        setShowCompleteModal(true); // 삭제 완료 모달 오픈
      }
    } catch (err) {
      console.error("Project delete error:", err);
      alert("프로젝트 삭제 중 에러가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 삭제 완료 모달에서 '완료' 클릭 시 '/togethers' 이동
  const handleCompleteClose = () => {
    setShowCompleteModal(false);
    navigate("/togethers");
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

          {/* 사이드바 최하단에 삭제 액션 존 배치 */}
          {!error && projectData && (
            <div className="project-edit-page-sidebar__action-zone">
              <button
                type="button"
                className="project-edit-page-sidebar__delete-btn"
                onClick={() => setShowConfirmModal(true)}
              >
                프로젝트 삭제
              </button>
            </div>
          )}
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

      {/* 1단계: 삭제 확인 모달 */}
      {showConfirmModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h2 className="edit-modal__title">프로젝트 삭제</h2>
            <p className="edit-modal__desc">
              정말로 이 프로젝트를 삭제하시겠습니까?
              <br />
              삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="edit-modal__actions">
              <button
                className="edit-modal__btn edit-modal__btn--cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                className="edit-modal__btn edit-modal__btn--confirm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2단계: 삭제 완료 알림 모달 */}
      {showCompleteModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h2 className="edit-modal__title">삭제 완료</h2>
            <p className="edit-modal__desc">
              프로젝트가 성공적으로 삭제되었습니다.
            </p>
            <div className="edit-modal__actions">
              <button
                className="edit-modal__btn edit-modal__btn--complete"
                onClick={handleCompleteClose}
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
