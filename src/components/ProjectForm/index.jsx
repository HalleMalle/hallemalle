import { useState, useRef } from "react";

import CalendarIcon from "@/assets/icons/calendar.svg";
import TrashIcon from "@/assets/icons/trash.svg";
import PeopleIcon from "@/assets/icons/people.svg";

import "./ProjectForm.scss";

// constants
const ROLE_OPTIONS = [
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
  { value: "BE", label: "Backend" },
  { value: "FE", label: "Frontend" },
  { value: "Design", label: "Design" },
  { value: "PM", label: "PM/PO" },
  { value: "QA", label: "QA" },
  { value: "AI", label: "AI/ML" },
];

const STAGE_OPTIONS = [
  { value: "planning", label: "기획부터" },
  { value: "development", label: "개발부터" },
  { value: "maintenance", label: "유지보수" },
];

const STATUS_OPTIONS = [
  { value: "recruiting", label: "모집중 (Recruiting)" },
  { value: "paused", label: "모집 일시중지" },
  { value: "closed", label: "모집 완료" },
];

const CONTACT_TYPES = [
  { value: "email", label: "Email" },
  { value: "kakao", label: "KakaoTalk" },
  { value: "discord", label: "Discord" },
  { value: "slack", label: "Slack" },
  { value: "other", label: "Other" },
];

// helper
function buildInitialRoleCounts(initialPositions) {
  const map = {};
  (initialPositions || []).forEach((p) => {
    map[p.role] = p.total || 0;
  });
  return map;
}

// 컴포넌트
export default function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Next Step",
}) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [headcount, setHeadcount] = useState(initialData?.headcount || 1);
  const [status, setStatus] = useState(initialData?.status || "recruiting");
  const [stage, setStage] = useState(
    initialData?.participationStage || "planning"
  );
  const [selectedRoles, setSelectedRoles] = useState(
    () => new Set((initialData?.positions || []).map((p) => p.role))
  );
  const [roleCounts, setRoleCounts] = useState(() =>
    buildInitialRoleCounts(initialData?.positions)
  );
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [planningDocs, setPlanningDocs] = useState([]);
  const [docVisibility, setDocVisibility] = useState({});
  const [contactType, setContactType] = useState(
    initialData?.contactType || "email"
  );
  const [contactValue, setContactValue] = useState(
    initialData?.contactValue || ""
  );
  const [submitting, setSubmitting] = useState(false);

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const docInputRef = useRef(null);

  const hasAttachmentStage = stage === "development" || stage === "maintenance";
  const totalSlots = [...selectedRoles].reduce(
    (sum, role) => sum + (roleCounts[role] || 0),
    0
  );
  const isValid =
    title.trim() &&
    description.trim() &&
    selectedRoles.size > 0 &&
    totalSlots >= 2;

  const handleDatePickerOpen = (ref) => {
    ref.current?.showPicker();
  };

  const handleRoleToggle = (role) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const handleRoleCountChange = (role, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setRoleCounts((prev) => ({ ...prev, [role]: num }));
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleThumbnailDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleThumbnailRemove = (e) => {
    e.preventDefault();
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  const handleAddDocs = (e) => {
    const files = Array.from(e.target.files || []);
    setPlanningDocs((prev) => [...prev, ...files]);
    setDocVisibility((prev) => {
      const next = { ...prev };
      files.forEach((f) => {
        next[f.name] = "public";
      });
      return next;
    });
    e.target.value = "";
  };

  const handleRemoveDoc = (fileName) => {
    setPlanningDocs((prev) => prev.filter(({ name }) => name !== fileName));
    setDocVisibility((prev) => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
  };

  const handleDocVisibility = (fileName, value) => {
    setDocVisibility((prev) => ({ ...prev, [fileName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);

    try {
      const positions = [...selectedRoles].map((role) => ({
        role,
        label: ROLE_OPTIONS.find((r) => r.value === role)?.label || role,
        total: roleCounts[role] || 0,
        current: 0,
      }));

      const data = {
        title: title.trim(),
        description: description.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        headcount,
        status,
        participationStage: stage,
        positions,
        contactType,
        contactValue: contactValue.trim(),
        thumbnail: thumbnail || null,
        attachments: hasAttachmentStage
          ? planningDocs.map((f) => ({
              name: f.name,
              file: f,
              visibility: docVisibility[f.name] || "public",
            }))
          : [],
      };

      await onSubmit(data);
    } catch (err) {
      console.error("ProjectForm submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <div className="field">
        <label className="label">
          프로젝트명 <span className="required-text">*</span>
          <span className="label-count">{title.length} / 60</span>
        </label>
        <input
          className="input"
          type="text"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="프로젝트 이름을 입력하세요."
        />
      </div>

      <div className="row">
        <div className="field">
          <label className="label">모집 기간</label>
          <div className="date-range">
            <span className="date-icon">
              <img src={CalendarIcon} alt="calendar" width={16} height={16} />
            </span>
            <input
              ref={startDateRef}
              className="input input--date"
              type="date"
              value={startDate}
              onClick={() => handleDatePickerOpen(startDateRef)}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="date-sep">-</span>
            <input
              ref={endDateRef}
              className="input input--date"
              type="date"
              value={endDate}
              onClick={() => handleDatePickerOpen(endDateRef)}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="label">희망 인원</label>
          <div className="headcount">
            <span className="headcount-icon">
              <img src={PeopleIcon} alt="people" width={16} height={16} />
            </span>
            <input
              className="input input--num"
              type="number"
              min={1}
              max={100}
              value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
            />
            <span className="headcount-suffix">명</span>
          </div>
        </div>
      </div>

      <div className="field">
        <label className="label">모집 상태</label>
        <div className="select-wrap">
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="label">참여 단계</label>
        <div className="stage-group">
          {STAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`stage-btn${stage === opt.value ? " stage-btn--active" : ""}`}
              onClick={() => setStage(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">모집 희망 파트 및 역할</label>
        <div className="role-tags">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`role-tag${selectedRoles.has(r.value) ? " role-tag--active" : ""}`}
              onClick={() => handleRoleToggle(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {selectedRoles.size > 0 && (
          <div className="role-counts">
            {[...selectedRoles].map((role) => {
              const label =
                ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
              return (
                <div key={role} className="role-count-row">
                  <span className="role-count-label">{label}</span>
                  <div className="select-wrap select-wrap--sm">
                    <select
                      className="select"
                      value={roleCounts[role] || 1}
                      onChange={(e) =>
                        handleRoleCountChange(role, e.target.value)
                      }
                    >
                      {Array.from({ length: 21 }, (_, i) => (
                        <option key={i} value={i}>
                          {i} 명
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="field">
        <label className="label">
          프로젝트 상세 설명 <span className="required-text">*</span>
        </label>
        <textarea
          className="text-box"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="프로젝트에 대한 상세한 설명을 입력하세요. (예: 프로젝트 개요, 주요 기능, 기술 스택, 기대 효과 등)"
          rows={6}
        />
      </div>

      <div className="field">
        <label className="label">프로젝트 썸네일 이미지</label>
        <div
          className={`thumbnail${thumbnailPreview ? " thumbnail--filled" : ""}`}
          onClick={() => thumbnailInputRef.current?.click()}
          onDrop={handleThumbnailDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {thumbnailPreview ? (
            <>
              <img
                src={thumbnailPreview}
                alt="thumbnail preview"
                className="thumbnail__img"
              />
              <button
                type="button"
                className="thumbnail__remove-btn"
                onClick={handleThumbnailRemove}
              >
                ✕
              </button>
            </>
          ) : (
            <div className="thumbnail__placeholder">
              <span className="thumbnail__icon">🖼</span>
              <p className="thumbnail__text">
                클릭해 이미지를 추가하거나, 드래그 앤 드롭으로 이미지를 업로드
                하세요.
              </p>
              <p className="thumbnail__hint">WEBP, PNG, JPG (MAX. 5MB)</p>
            </div>
          )}
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/webp,image/png,image/jpeg"
            className="hidden-input"
            onChange={handleThumbnailChange}
          />
        </div>
      </div>

      <div className="field">
        <label className="label">기획 문서</label>
        {hasAttachmentStage && (
          <p className="label-hint required-text">
            '개발부터' 또는 '유지보수' 단계에서 시작하는 경우 필수입니다.
          </p>
        )}

        {planningDocs.map((file) => (
          <div key={file.name} className="doc-row">
            <span className="doc-icon">📄</span>
            <div className="doc-info">
              <span className="doc-name">{file.name}</span>
              <span className="doc-size">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <div className="select-wrap">
              <select
                className="select"
                value={docVisibility[file.name] || "public"}
                onChange={(e) => handleDocVisibility(file.name, e.target.value)}
              >
                <option value="public">🔓 전체 공개</option>
                <option value="approved">🔒 승인한 사용자만 공개</option>
              </select>
            </div>
            <button
              type="button"
              className="doc-remove"
              onClick={() => handleRemoveDoc(file.name)}
            >
              <img src={TrashIcon} alt="trash" width={16} height={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          className="add-doc-btn"
          onClick={() => docInputRef.current?.click()}
        >
          📎 파일 추가 (PDF)
        </button>
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden-input"
          onChange={handleAddDocs}
        />
      </div>

      <div className="field">
        <label className="label">연락 수단</label>
        <div className="contact">
          <div className="select-wrap select-wrap--contact">
            <select
              className="select"
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
            >
              {CONTACT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>
          <input
            className="input input--contact"
            type="text"
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder="example@hmail.com or Link"
          />
        </div>
      </div>

      <div className="divider" />

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <div className="actions__right">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !isValid}
          >
            {submitting ? "처리 중..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
