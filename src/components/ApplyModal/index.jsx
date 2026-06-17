import { useState, useEffect, useCallback, useRef } from "react";

import {
  applyToProject,
  getMyApplication,
  cancelApplication,
} from "@/api/application";

import "./ApplyModal.scss";

const ATTACHMENT_TYPES = [
  { value: "github", label: "GitHub" },
  { value: "portfolio", label: "Portfolio" },
  { value: "behance", label: "Behance" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cv_pdf", label: "CV / PDF URL" },
  { value: "other", label: "기타 링크" },
];

const MAX_ATTACHMENTS = 5;
const MAX_MESSAGE_LENGTH = 500;

function createEmptyAttachment() {
  return { type: "github", url: "" };
}

function StatusBadge({ status }) {
  const map = {
    pending: {
      label: "검토 중",
      className: "apply-modal__status-badge--pending",
    },
    approved: {
      label: "승인됨",
      className: "apply-modal__status-badge--approved",
    },
    rejected: {
      label: "반려됨",
      className: "apply-modal__status-badge--rejected",
    },
  };
  const { label, className } = map[status] || {};
  if (!label) return null;

  return (
    <span className={`apply-modal__status-badge ${className}`}>{label}</span>
  );
}

/**
 * ApplyModal
 *
 * Props:
 *   postId       string   — together 포스트 ID
 *   roles        Array    — [{ role, total, current }]  together_roles
 *   uid          string   — 현재 로그인 유저 uid
 *   isOpen       boolean
 *   onClose      () => void
 *   onSuccess    () => void  — 신청/취소 완료 후 부모에서 상태 갱신용
 */
export default function ApplyModal({
  postId,
  roles,
  uid,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [selectedRole, setSelectedRole] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([createEmptyAttachment()]);

  const [existingApplication, setExistingApplication] = useState(null); // null | object
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState("");

  const overlayRef = useRef(null);

  const fetchExistingApplication = useCallback(async () => {
    if (!postId || !uid) return;
    setIsLoadingApplication(true);
    try {
      const application = await getMyApplication(postId, uid);
      setExistingApplication(application);

      // 기존 신청이 있으면 폼을 기존 값으로 채워둠
      if (application) {
        setSelectedRole(application.applied_role || "");
        setMessage(application.message || "");
        setAttachments(
          application.attachments?.length > 0
            ? application.attachments.map((a) => ({ type: a.type, url: a.url }))
            : [createEmptyAttachment()]
        );
      }
    } catch {
      // 조회 실패는 무시 (신규 신청으로 처리)
    } finally {
      setIsLoadingApplication(false);
    }
  }, [postId, uid]);

  useEffect(() => {
    if (isOpen) {
      fetchExistingApplication();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, fetchExistingApplication]);

  const resetForm = () => {
    setSelectedRole("");
    setMessage("");
    setAttachments([createEmptyAttachment()]);
    setFieldErrors({});
    setGlobalError("");
    setExistingApplication(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOverlayClick = (event) => {
    if (event.target === overlayRef.current) handleClose();
  };

  const handleAttachmentChange = (index, field, value) => {
    setAttachments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddAttachment = () => {
    if (attachments.length >= MAX_ATTACHMENTS) return;
    setAttachments((prev) => [...prev, createEmptyAttachment()]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errors = {};
    if (!selectedRole) errors.role = "신청할 역할을 선택해주세요.";
    if (message.length > MAX_MESSAGE_LENGTH) {
      errors.message = `메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 작성해주세요.`;
    }
    for (const attachment of attachments) {
      if (attachment.url && !/^https?:\/\/.+/.test(attachment.url.trim())) {
        errors.attachments = "링크는 http:// 또는 https:// 로 시작해야 합니다.";
        break;
      }
    }
    return errors;
  };

  const handleSubmit = async () => {
    setGlobalError("");
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await applyToProject(postId, uid, {
        appliedRole: selectedRole,
        message,
        attachments: attachments.filter((a) => a.url.trim() !== ""),
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      setGlobalError(
        error.message || "신청 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("신청을 취소하시겠습니까?")) return;
    setIsCancelling(true);
    setGlobalError("");
    try {
      await cancelApplication(postId, uid);
      onSuccess?.();
      handleClose();
    } catch (error) {
      setGlobalError(error.message || "취소 중 오류가 발생했습니다.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isOpen) return null;

  const isAlreadyApplied = !!existingApplication;
  const isPending = existingApplication?.status === "pending";
  const isReadOnly = isAlreadyApplied && !isPending;

  // 모집 마감된 역할 목록
  const availableRoles = roles?.filter((r) => r.current < r.total) ?? [];

  return (
    <div
      className="apply-modal__overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="팀원 신청"
    >
      <div className="apply-modal">
        <div className="apply-modal__header">
          <div className="apply-modal__header-title-row">
            <h2 className="apply-modal__title">팀원 신청하기</h2>
            {isAlreadyApplied && (
              <StatusBadge status={existingApplication.status} />
            )}
          </div>
          <button
            className="apply-modal__close-button"
            onClick={handleClose}
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        </div>

        {isLoadingApplication ? (
          <div className="apply-modal__loading">신청 정보를 불러오는 중...</div>
        ) : (
          <div className="apply-modal__body">
            {/* 이미 처리된 신청 안내 */}
            {isAlreadyApplied && !isPending && (
              <div
                className={[
                  "apply-modal__notice",
                  existingApplication.status === "approved"
                    ? "apply-modal__notice--approved"
                    : "apply-modal__notice--rejected",
                ].join(" ")}
              >
                {existingApplication.status === "approved"
                  ? "🎉 신청 승인되었습니다! 프로젝트 리더의 연락을 기다려주세요."
                  : "신청 반려되었습니다. 다른 프로젝트를 찾아보세요."}
              </div>
            )}

            {/* 검토 중 안내 */}
            {isPending && (
              <div className="apply-modal__notice apply-modal__notice--pending">
                ⏳ 신청서 검토 중입니다. 결과를 기다려주세요.
              </div>
            )}

            <div className="apply-modal__field">
              <label className="apply-modal__label">
                신청 역할 <span className="apply-modal__required">*</span>
              </label>
              <div className="apply-modal__role-grid">
                {(availableRoles.length > 0 ? availableRoles : roles)?.map(
                  (roleItem) => {
                    const isFull = roleItem.current >= roleItem.total;
                    return (
                      <button
                        key={roleItem.role}
                        type="button"
                        disabled={isFull || isAlreadyApplied}
                        className={[
                          "apply-modal__role-chip",
                          selectedRole === roleItem.role
                            ? "apply-modal__role-chip--selected"
                            : "",
                          isFull ? "apply-modal__role-chip--full" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          !isAlreadyApplied && setSelectedRole(roleItem.role)
                        }
                      >
                        <span className="apply-modal__role-chip-name">
                          {roleItem.role}
                        </span>
                        <span className="apply-modal__role-chip-count">
                          {roleItem.current}/{roleItem.total}
                          {isFull && " · 마감"}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
              {fieldErrors.role && (
                <p className="apply-modal__field-error">{fieldErrors.role}</p>
              )}
            </div>

            <div className="apply-modal__field">
              <label className="apply-modal__label">
                포트폴리오 링크
                <span className="apply-modal__label-hint">
                  (최대 {MAX_ATTACHMENTS}개)
                </span>
              </label>

              <div className="apply-modal__attachment-list">
                {attachments.map((attachment, index) => (
                  <div key={index} className="apply-modal__attachment-row">
                    <select
                      className="apply-modal__attachment-type-select"
                      value={attachment.type}
                      disabled={isAlreadyApplied}
                      onChange={(event) =>
                        handleAttachmentChange(
                          index,
                          "type",
                          event.target.value
                        )
                      }
                    >
                      {ATTACHMENT_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="url"
                      className="apply-modal__attachment-url-input"
                      placeholder="https://"
                      value={attachment.url}
                      disabled={isAlreadyApplied}
                      onChange={(event) =>
                        handleAttachmentChange(index, "url", event.target.value)
                      }
                    />

                    {!isAlreadyApplied && attachments.length > 1 && (
                      <button
                        type="button"
                        className="apply-modal__attachment-remove-button"
                        onClick={() => handleRemoveAttachment(index)}
                        aria-label="링크 삭제"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isAlreadyApplied && attachments.length < MAX_ATTACHMENTS && (
                <button
                  type="button"
                  className="apply-modal__add-attachment-button"
                  onClick={handleAddAttachment}
                >
                  <PlusIcon /> 링크 추가
                </button>
              )}

              {fieldErrors.attachments && (
                <p className="apply-modal__field-error">
                  {fieldErrors.attachments}
                </p>
              )}
            </div>

            <div className="apply-modal__field">
              <label className="apply-modal__label">
                신청 메시지
                <span className="apply-modal__label-hint">(선택)</span>
              </label>
              <textarea
                className="apply-modal__textarea"
                placeholder="자기소개, 참여 동기, 기여할 수 있는 부분 등을 자유롭게 작성해주세요."
                rows={5}
                maxLength={MAX_MESSAGE_LENGTH}
                value={message}
                disabled={isAlreadyApplied}
                onChange={(event) => setMessage(event.target.value)}
              />
              <div className="apply-modal__char-count">
                {message.length} / {MAX_MESSAGE_LENGTH}
              </div>
              {fieldErrors.message && (
                <p className="apply-modal__field-error">
                  {fieldErrors.message}
                </p>
              )}
            </div>

            {globalError && (
              <p className="apply-modal__global-error">{globalError}</p>
            )}
          </div>
        )}

        {!isLoadingApplication && (
          <div className="apply-modal__footer">
            {/* 신규 신청 */}
            {!isAlreadyApplied && (
              <>
                <button
                  type="button"
                  className="apply-modal__button apply-modal__button--secondary"
                  onClick={handleClose}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="apply-modal__button apply-modal__button--primary"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "신청 중…" : "신청하기"}
                </button>
              </>
            )}

            {/* 검토 중 → 신청 취소 가능 */}
            {isPending && (
              <>
                <button
                  type="button"
                  className="apply-modal__button apply-modal__button--danger"
                  disabled={isCancelling}
                  onClick={handleCancel}
                >
                  {isCancelling ? "취소 중…" : "신청 취소"}
                </button>
                <button
                  type="button"
                  className="apply-modal__button apply-modal__button--secondary"
                  onClick={handleClose}
                >
                  닫기
                </button>
              </>
            )}

            {/* 승인/반려 완료 → 닫기만 */}
            {isAlreadyApplied && !isPending && (
              <button
                type="button"
                className="apply-modal__button apply-modal__button--secondary"
                onClick={handleClose}
              >
                닫기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 6h12M8 6V4h4v2M9 10v4M11 10v4M5 6l1 10h8l1-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
