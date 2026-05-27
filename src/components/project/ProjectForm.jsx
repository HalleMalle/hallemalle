import { useState } from "react";
import "./ProjectForm.scss";

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
const STAGE_OPTIONS = [
  { value: "planning", label: "기획부터" },
  { value: "development", label: "개발부터" },
  { value: "maintenance", label: "유지보수" },
];

function emptyPositions() {
  return ROLE_OPTIONS.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    total: 0,
    current: 0,
  }));
}

export default function ProjectForm({
  initialData,
  onSubmit,
  submitLabel = "등록하기",
}) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [deadline, setDeadline] = useState(initialData?.deadline || "");
  const [contactMethod, setContactMethod] = useState(
    initialData?.contactMethod || "",
  );
  const [stage, setStage] = useState(
    initialData?.participationStage || "planning",
  );
  const [positions, setPositions] = useState(
    initialData?.positions?.length
      ? ROLE_OPTIONS.map((role) => {
          const existing = initialData.positions.find((p) => p.role === role);
          return (
            existing || { role, label: ROLE_LABELS[role], total: 0, current: 0 }
          );
        })
      : emptyPositions(),
  );
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentVisibility, setAttachmentVisibility] = useState("public");
  const [submitting, setSubmitting] = useState(false);

  const hasAttachmentStage = stage === "development" || stage === "maintenance";
  const hasPositions = positions.some((p) => p.total > 0);
  const totalSlots = positions.reduce((s, p) => s + p.total, 0);

  const handlePositionChange = (role, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setPositions((prev) =>
      prev.map((p) => (p.role === role ? { ...p, total: num } : p)),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (!hasPositions) return;
    if (totalSlots < 2) return;

    setSubmitting(true);
    try {
      const activePositions = positions
        .filter((p) => p.total > 0)
        .map((p) => ({
          role: p.role,
          total: p.total,
          current: p.current || 0,
        }));

      const data = {
        title: title.trim(),
        description: description.trim(),
        deadline: deadline || null,
        contactMethod: contactMethod.trim(),
        participationStage: stage,
        positions: activePositions,
      };

      if (hasAttachmentStage && attachmentFile) {
        data.attachments = [
          {
            name: attachmentFile.name,
            url: attachmentFile.name,
            visibility: attachmentVisibility,
          },
        ];
      }

      await onSubmit(data);
    } catch (error) {
      console.error("Project form submit failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      {/* 기본 정보 */}
      <fieldset className="form-fieldset">
        <legend>기본 정보</legend>

        <label className="form-field">
          <span>프로젝트 제목 *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="프로젝트 제목을 입력하세요"
            required
          />
        </label>

        <label className="form-field">
          <span>프로젝트 설명 *</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="프로젝트에 대한 설명을 작성하세요"
            rows={5}
            required
          />
        </label>

        <div className="form-row">
          <label className="form-field">
            <span>모집 마감일</span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>연락 수단</span>
            <input
              type="text"
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              placeholder="오픈카톡 링크, 이메일 등"
            />
          </label>
        </div>
      </fieldset>

      {/* 참여 단계 */}
      <fieldset className="form-fieldset">
        <legend>참여 단계</legend>
        <div className="stage-selector">
          {STAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`stage-btn ${stage === opt.value ? "active" : ""}`}
              onClick={() => setStage(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasAttachmentStage && (
          <div className="attachment-section">
            <p className="attachment-desc">
              {stage === "development"
                ? "기획서 파일을 첨부해주세요 (선택)"
                : "프로젝트 설명 파일을 첨부해주세요 (선택)"}
            </p>
            <div className="attachment-controls">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
              />
              <label className="form-field visibility-select">
                <span>공개 범위</span>
                <select
                  value={attachmentVisibility}
                  onChange={(e) => setAttachmentVisibility(e.target.value)}
                >
                  <option value="public">전체 공개</option>
                  <option value="approved">승인한 사람만</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </fieldset>

      {/* 희망 인원 */}
      <fieldset className="form-fieldset">
        <legend>희망 인원 (최소 2명)</legend>
        <div className="positions-grid">
          {positions.map((pos) => (
            <div key={pos.role} className="position-row">
              <span className="position-label">{pos.label}</span>
              <input
                type="number"
                min="0"
                max="20"
                value={pos.total || ""}
                onChange={(e) => handlePositionChange(pos.role, e.target.value)}
                placeholder="0"
                className="position-input"
              />
              <span className="position-unit">명</span>
            </div>
          ))}
        </div>
        {!hasPositions && (
          <p className="form-hint">
            최소 1개 이상의 포지션에 인원을 설정해주세요
          </p>
        )}
        {hasPositions && totalSlots < 2 && (
          <p className="form-hint">총 희망인원은 최소 2명 이상이어야 합니다</p>
        )}
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        className="form-submit"
        disabled={
          submitting ||
          !title.trim() ||
          !description.trim() ||
          !hasPositions ||
          totalSlots < 2
        }
      >
        {submitting ? "등록 중..." : submitLabel}
      </button>
    </form>
  );
}
