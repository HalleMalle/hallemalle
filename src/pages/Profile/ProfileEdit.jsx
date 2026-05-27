import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import "./ProfileEdit.scss";

const ROLE_OPTIONS = ["FE", "BE", "Design", "Android", "iOS", "PM", "QA", "AI"];

const ROLE_LABELS = {
  FE: "프론트엔드",
  BE: "백엔드",
  Design: "디자인",
  Android: "안드로이드",
  iOS: "iOS",
  PM: "기획/PM",
  QA: "QA",
  AI: "AI/ML",
};

const STAGE_OPTIONS = ["planning", "development", "maintenance"];
const STAGE_LABELS = {
  planning: "기획부터",
  development: "개발부터",
  maintenance: "유지보수",
};

export default function ProfileEdit({ user, onClose }) {
  const { updateProfile } = useAuth();

  const [form, setForm] = useState({
    displayName: user.displayName || "",
    username: user.username || "",
    bio: user.bio || "",
    githubUsername: user.githubUsername || "",
    role: user.role || "individual",
    availableRoles: user.availableRoles || [],
    techStack: user.techStack || [],
    availablePeriod: user.availablePeriod || "",
    availableHours: user.availableHours || "",
  });

  const [techInput, setTechInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRole = (role) => {
    setForm((prev) => ({
      ...prev,
      availableRoles: prev.availableRoles.includes(role)
        ? prev.availableRoles.filter((r) => r !== role)
        : [...prev.availableRoles, role],
    }));
  };

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.techStack.includes(t)) {
      setForm((prev) => ({ ...prev, techStack: [...prev.techStack, t] }));
      setTechInput("");
    }
  };

  const removeTech = (tech) => {
    setForm((prev) => ({
      ...prev,
      techStack: prev.techStack.filter((t) => t !== tech),
    }));
  };

  const handleTechKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTech();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>프로필 수정</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* 기본 정보 */}
          <fieldset className="edit-fieldset">
            <legend>기본 정보</legend>

            <label className="edit-field">
              <span>표시 이름</span>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                placeholder="프로필에 표시될 이름"
              />
            </label>

            <label className="edit-field">
              <span>사용자명</span>
              <input
                type="text"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                placeholder="고유 사용자명"
              />
            </label>

            <label className="edit-field">
              <span>소개</span>
              <textarea
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                placeholder="자기소개를 작성해주세요"
                rows={3}
              />
            </label>
          </fieldset>

          {/* 협업 설정 */}
          <fieldset className="edit-fieldset">
            <legend>협업 설정</legend>

            <label className="edit-field">
              <span>상태</span>
              <select
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
              >
                <option value="individual">팀을 찾는 중</option>
                <option value="team">팀원을 모집 중</option>
              </select>
            </label>

            <div className="edit-field">
              <span>희망 직무</span>
              <div className="chip-group">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={`chip ${form.availableRoles.includes(role) ? "active" : ""}`}
                    onClick={() => toggleRole(role)}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>

            <label className="edit-field">
              <span>참여 가능 기간</span>
              <input
                type="text"
                value={form.availablePeriod}
                onChange={(e) =>
                  handleChange("availablePeriod", e.target.value)
                }
                placeholder="예: 2026.06 ~ 2026.08"
              />
            </label>

            <label className="edit-field">
              <span>협업 가능 시간대</span>
              <input
                type="text"
                value={form.availableHours}
                onChange={(e) => handleChange("availableHours", e.target.value)}
                placeholder="예: 평일 저녁, 주말"
              />
            </label>
          </fieldset>

          {/* 기술 스택 */}
          <fieldset className="edit-fieldset">
            <legend>기술 스택</legend>

            <div className="tech-input-row">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleTechKeyDown}
                placeholder="기술명 입력 후 Enter"
              />
              <button type="button" className="tech-add-btn" onClick={addTech}>
                추가
              </button>
            </div>

            {form.techStack.length > 0 && (
              <div className="chip-group">
                {form.techStack.map((tech) => (
                  <span key={tech} className="chip active chip-removable">
                    {tech}
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeTech(tech)}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </fieldset>

          {/* GitHub */}
          <fieldset className="edit-fieldset">
            <legend>GitHub</legend>
            <label className="edit-field">
              <span>GitHub 사용자명</span>
              <input
                type="text"
                value={form.githubUsername}
                onChange={(e) => handleChange("githubUsername", e.target.value)}
                placeholder="GitHub username"
              />
            </label>
          </fieldset>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
