import { useState, useRef, useMemo } from "react";

import CalendarIcon from "@/assets/icons/calendar.svg";
import TrashIcon from "@/assets/icons/trash.svg";
import PeopleIcon from "@/assets/icons/people.svg";

import "./ProjectForm.scss";

const ROLE_OPTIONS = [
  { value: "Frontend", label: "Frontend" },
  { value: "Backend", label: "Backend" },
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
  { value: "Design", label: "Design" },
  { value: "PM/PO", label: "PM/PO" },
];

const STACK_OPTIONS = [
  // --- Frontend ---
  { value: "JavaScript", label: "JavaScript" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "React.js", label: "React.js" },
  { value: "Next.js", label: "Next.js" },
  { value: "Vue.js", label: "Vue.js" },
  { value: "Nuxt.js", label: "Nuxt.js" },

  // --- Backend ---
  { value: "Node.js", label: "Node.js" },
  { value: "Express", label: "Express" },
  { value: "NestJS", label: "NestJS" },
  { value: "Java", label: "Java" },
  { value: "SpringBoot", label: "SpringBoot" },
  { value: "Python", label: "Python" },
  { value: "Django", label: "Django" },
  { value: "FastAPI", label: "FastAPI" },
  { value: "Go", label: "Go" },

  // --- Mobile ---
  { value: "Swift", label: "Swift" },
  { value: "Kotlin", label: "Kotlin" },
  { value: "Flutter", label: "Flutter" },
  { value: "React Native", label: "React Native" },

  // --- Database & DevOps ---
  { value: "MySQL", label: "MySQL" },
  { value: "PostgreSQL", label: "PostgreSQL" },
  { value: "MongoDB", label: "MongoDB" },
  { value: "Redis", label: "Redis" },
  { value: "AWS", label: "AWS" },
  { value: "Docker", label: "Docker" },
  { value: "Firebase", label: "Firebase" },

  // --- Design & PM ---
  { value: "Figma", label: "Figma" },
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

// 규칙 isValidContactType: 'email' | 'kakao' | 'link' | 'other' 만 허용
const CONTACT_TYPES = [
  { value: "email", label: "Email" },
  { value: "kakao", label: "KakaoTalk" },
  { value: "link", label: "Link (오픈채팅·Discord 등)" },
  { value: "other", label: "Other" },
];

function buildInitialRoleCounts(initialPositions) {
  const map = {};
  (initialPositions || []).forEach((p) => {
    map[p.role] = p.total || 0;
  });
  return map;
}

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
  const [selectedStack, setSelectedStack] = useState(
    () => new Set(initialData?.techStack || [])
  );
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(
    initialData?.thumbnailUrl || null
  );
  const [planningDocs, setPlanningDocs] = useState(
    // 수정 모드 초기값: { name, url, visibility } 형태로 받음
    initialData?.documents?.map((d) => ({
      name: d.file_name,
      url: d.file_url,
      visibility: d.visibility, // "public" | "approved_only"
      file: null, // 기존 파일은 File 없음
    })) || []
  );
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

  // total > 0인 역할만 카운트 (API로 넘길 positions와 동일 기준)
  const totalSlots = useMemo(
    () =>
      [...selectedRoles].reduce(
        (sum, role) => sum + (roleCounts[role] || 0),
        0
      ),
    [selectedRoles, roleCounts]
  );

  const docsValid = planningDocs
    ? planningDocs.filter(
        ({ file }) => (file?.size / 1024 / 1024).toFixed(1) >= 1
      )?.length == 0
    : true;

  const isValid =
    title.trim() !== "" &&
    description.trim() !== "" &&
    selectedRoles.size > 0 &&
    totalSlots >= 2 &&
    docsValid;
  const handleDatePickerOpen = (ref) => {
    ref.current?.showPicker();
  };

  const handleRoleToggle = (role) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        setRoleCounts((rc) => ({ ...rc, [role]: 0 }));
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

  const handleStackToggle = (stack) => {
    setSelectedStack((prev) => {
      const next = new Set(prev);
      if (next.has(stack)) {
        next.delete(stack);
      } else {
        next.add(stack);
      }
      return next;
    });
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
    e.stopPropagation();
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  const handleAddDocs = (e) => {
    const files = Array.from(e.target.files || []);
    const newDocs = files.map((f) => ({
      name: f.name,
      file: f, // File 인스턴스 보존
      url: null,
      visibility: "public",
    }));
    setPlanningDocs((prev) => [...prev, ...newDocs]);
    e.target.value = "";
  };

  // File 객체를 직접 .name으로 접근 (구조분해 제거)
  const handleRemoveDoc = (fileName) => {
    setPlanningDocs((prev) => prev.filter((doc) => doc.name !== fileName));
  };

  const handleDocVisibility = (fileName, value) => {
    setPlanningDocs((prev) =>
      prev.map((doc) =>
        doc.name === fileName ? { ...doc, visibility: value } : doc
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      const positions = [...selectedRoles]
        .filter((role) => (roleCounts[role] || 0) > 0)
        .map((role) => ({
          role,
          label: ROLE_OPTIONS.find((r) => r.value === role)?.label || role,
          total: roleCounts[role],
          current: 0,
        }));

      const data = {
        title: title.trim(),
        description: description.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        headcount: totalSlots,
        status,
        // 수신부(project.js 또는 부모 컴포넌트)에서 'stage'나 'participationStage'
        // 어떤 것을 구조분해하더라도 undefined가 되지 않도록 두 키 모두에 값을 명시합니다.
        stage: stage,
        participationStage: stage,
        positions,
        contactType,
        contactValue: contactValue.trim(),
        thumbnail: thumbnail || null,
        attachments: hasAttachmentStage
          ? planningDocs.map(({ name, file, url, visibility }) => ({
              name,
              file: file || null,
              url: url || null,
              visibility,
            }))
          : [],
        techStack: Array.from(selectedStack),
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
            <span
              className="date-icon"
              onClick={() => handleDatePickerOpen(startDateRef)}
            >
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

        {/* 희망 인원 input 제거 — totalSlots로 자동 계산되어 API에 전달됨 */}
        <div className="field">
          <label className="label">희망 인원 (자동 합산)</label>
          <div className="headcount">
            <span className="headcount-icon">
              <img src={PeopleIcon} alt="people" width={16} height={16} />
            </span>
            <span className="headcount-value">{totalSlots} 명</span>
          </div>
        </div>
      </div>

      {/* 모집 상태 */}
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

      {/* 참여 단계 */}
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

      {/* 모집 희망 파트 및 역할 */}
      <div className="field">
        <label className="label">
          모집 희망 파트 및 역할 <span className="required-text">*</span>
        </label>
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
                <div key={`${role}--${label}`} className="role-count-row">
                  <span className="role-count-label">{label}</span>
                  <div className="select-wrap select-wrap--sm">
                    <select
                      className="select"
                      value={roleCounts[role] || 0}
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
        {totalSlots < 2 && selectedRoles.size > 0 && (
          <span className="label-hint required-text">
            총 희망 인원은 최소 2명 이상이어야 합니다. (현재 {totalSlots}명)
          </span>
        )}
      </div>

      <div className="field">
        <label className="label">희망 기술 선택</label>
        <div className="stack-tags">
          {STACK_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`stack-tag${selectedStack.has(r.value) ? " stack-tag--active" : ""}`}
              onClick={() => handleStackToggle(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
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
          onClick={() =>
            !thumbnailPreview && thumbnailInputRef.current?.click()
          }
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
                className="remove-btn"
                onClick={handleThumbnailRemove}
              >
                🅇
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

        {planningDocs.map((doc) => (
          <div key={doc.name} className="doc-row">
            <span className="doc-icon">📄</span>
            <div className="doc-info">
              <span className="doc-name">{doc.name}</span>
              {doc.file && (
                <span className="doc-size">
                  {(doc.file.size / 1024 / 1024).toFixed(1)} MB{" "}
                  {(doc.file.size / 1024 / 1024).toFixed(1) >= 1 && (
                    <span className="label-hint required-text">
                      1MB 미만이어야 합니다.
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="select-wrap">
              <select
                className="select"
                value={doc.visibility}
                onChange={(e) => handleDocVisibility(doc.name, e.target.value)}
              >
                {/* value를 API 스키마 값과 일치시킴 */}
                <option value="public">🔓 전체 공개</option>
                {/* <option value="approved_only">🔒 승인한 사용자만 공개</option> */}
              </select>
            </div>
            <button
              type="button"
              className="remove-btn"
              onClick={() => handleRemoveDoc(doc.name)}
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
        {hasAttachmentStage && (
          <p className="label-hint required-text">
            '개발부터' 또는 '유지보수' 단계에서 시작하는 경우 필수입니다.
          </p>
        )}
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
