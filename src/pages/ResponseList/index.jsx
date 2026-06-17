import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
  getMyTogethers,
  approveApplication,
  rejectApplication,
} from "@/api/application";

import { useAuth } from "@/contexts/AuthContext";

import "./ResponseList.scss";

const TAB_OPTIONS = [
  { value: "pending", label: "대기중" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "wait", label: "대기시간순" },
];

const ATTACHMENT_ICONS = {
  github: "⌥",
  behance: "Be",
  portfolio: "🔗",
  cv_pdf: "📄",
  linkedin: "in",
  other: "🔗",
};

function formatAppliedAt(dateValue) {
  if (!dateValue) return "";

  const date = dateValue?.seconds
    ? new Date(dateValue.seconds * 1000)
    : dateValue?.toDate
      ? dateValue.toDate()
      : new Date(dateValue);

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "방금 신청함";
  if (diffHours < 24) return `${diffHours}시간 전에 신청함`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1일 전에 신청함";
  return `${diffDays}일 전에 신청함`;
}

function StatCard({ label, value, badge, sub }) {
  return (
    <div className="responses-page__stat-card">
      <p className="responses-page__stat-label">{label}</p>
      <div className="responses-page__stat-value-row">
        <span className="responses-page__stat-value">{value}</span>
        {badge && (
          <span
            className={`responses-page__stat-badge responses-page__stat-badge--${badge.type}`}
          >
            {badge.text}
          </span>
        )}
        {sub && <span className="responses-page__stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

function ApplicantCard({ applicant, onApprove, onReject, isActionLoading }) {
  const navigate = useNavigate();

  const {
    applicantUser,
    applied_role,
    status,
    wait_time,
    applied_at,
    attachments = [],
    message,
  } = applicant;

  const isNew = wait_time === 0;
  const isWaiting = wait_time > 0;

  const displayName = applicantUser?.display_name || "Unknown";
  const photoUrl = applicantUser?.photo_url;
  const initial = displayName[0]?.toUpperCase() || "?";

  return (
    <div
      className="responses-page__applicant-card"
      style={{ opacity: isActionLoading ? 0.6 : 1 }}
    >
      <div className="responses-page__applicant-avatar">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            className="responses-page__applicant-avatar-image"
          />
        ) : (
          <span className="responses-page__applicant-avatar-initial">
            {initial}
          </span>
        )}
      </div>

      <div className="responses-page__applicant-body">
        <div className="responses-page__applicant-name-row">
          <span className="responses-page__applicant-name">{displayName}</span>
          {isWaiting && status === "pending" && (
            <span className="responses-page__applicant-wait-badge">
              ⏱ {wait_time}h 대기중
            </span>
          )}
          {isNew && status === "pending" && (
            <span className="responses-page__applicant-new-badge">NEW</span>
          )}
        </div>

        <p className="responses-page__applicant-role-time">
          {applied_role} • {formatAppliedAt(applied_at)}
        </p>

        {message && (
          <p className="responses-page__applicant-message">{message}</p>
        )}

        {attachments.length > 0 && (
          <div className="responses-page__applicant-attachments">
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="responses-page__attachment-tag"
              >
                <span className="responses-page__attachment-icon">
                  {ATTACHMENT_ICONS[attachment.type] || "🔗"}
                </span>
                {attachment.type.toUpperCase()}
              </a>
            ))}
          </div>
        )}

        <button
          className="responses-page__applicant-detail-link"
          onClick={() => navigate(`/togethers/${applicant.post_id}`)}
        >
          ← 프로젝트 상세 보기
        </button>
      </div>

      {status === "pending" && (
        <div className="responses-page__applicant-actions">
          <button
            className="responses-page__action-button responses-page__action-button--approve"
            onClick={() => onApprove(applicant.id)}
            disabled={isActionLoading}
          >
            {isActionLoading ? "..." : "승인"}
          </button>
          <button
            className="responses-page__action-button responses-page__action-button--reject"
            onClick={() => onReject(applicant.id)}
            disabled={isActionLoading}
          >
            {isActionLoading ? "..." : "반려"}
          </button>
        </div>
      )}

      {status === "approved" && (
        <div className="responses-page__applicant-actions">
          <span className="responses-page__status-label responses-page__status-label--approved">
            ✓ 승인됨
          </span>
        </div>
      )}

      {status === "rejected" && (
        <div className="responses-page__applicant-actions">
          <span className="responses-page__status-label responses-page__status-label--rejected">
            ✕ 반려
          </span>
        </div>
      )}
    </div>
  );
}

export default function ResponseList() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const uid = user?.uid;

  const [activePostId, setActivePostId] = useState(null);
  const [togethers, setTogethers] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortBy, setSortBy] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [togethersLoading, setTogethersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const allApplicantsAcrossAllPosts = togethers.flatMap(
    (t) => t.applicants || []
  );

  const overallStats = {
    total: allApplicantsAcrossAllPosts.length,
    pending: allApplicantsAcrossAllPosts.filter((a) => a.status === "pending")
      .length,
    approved: allApplicantsAcrossAllPosts.filter((a) => a.status === "approved")
      .length,
    rejected: allApplicantsAcrossAllPosts.filter((a) => a.status === "rejected")
      .length,
  };

  const targetTogether = togethers.find((t) => t.post_id === activePostId);
  const currentApplicants = activePostId
    ? targetTogether?.applicants || []
    : allApplicantsAcrossAllPosts;

  const targetHeadcount = targetTogether?.total_headcount || 0;

  const pendingList = currentApplicants.filter((a) => a.status === "pending");
  const approvedList = currentApplicants.filter((a) => a.status === "approved");
  const rejectedList = currentApplicants.filter((a) => a.status === "rejected");

  const currentTabCounts = {
    pending: pendingList.length,
    approved: approvedList.length,
    rejected: rejectedList.length,
  };

  const sortedActiveList = (() => {
    const list =
      { pending: pendingList, approved: approvedList, rejected: rejectedList }[
        activeTab
      ] || [];

    return [...list].sort((a, b) => {
      const toSec = (v) =>
        v?.seconds ?? (v?.toDate ? v.toDate().getTime() / 1000 : 0);

      if (sortBy === "oldest") return toSec(a.applied_at) - toSec(b.applied_at);
      if (sortBy === "wait") return (b.wait_time || 0) - (a.wait_time || 0);
      return toSec(b.applied_at) - toSec(a.applied_at);
    });
  })();

  const loadAllData = useCallback(async () => {
    if (!uid) return;
    setTogethersLoading(true);
    setError(null);
    try {
      const list = await getMyTogethers(uid);
      setTogethers(list);
    } catch (err) {
      console.error("loadAllData error:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setTogethersLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const handleApprove = async (applicantId) => {
    setActionLoading(applicantId);
    try {
      await approveApplication(applicantId);
      setTogethers((prev) =>
        prev.map((t) => ({
          ...t,
          applicants: t.applicants.map((a) =>
            a.id === applicantId ? { ...a, status: "approved" } : a
          ),
        }))
      );
    } catch (err) {
      console.error("approveApplication error:", err);
      alert("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicantId) => {
    setActionLoading(applicantId);
    try {
      await rejectApplication(applicantId);
      setTogethers((prev) =>
        prev.map((t) => ({
          ...t,
          applicants: t.applicants.map((a) =>
            a.id === applicantId ? { ...a, status: "rejected" } : a
          ),
        }))
      );
    } catch (err) {
      console.error("rejectApplication error:", err);
      alert("반려 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectPost = (postId) => {
    if (postId === activePostId) return;
    setActivePostId(postId);
  };

  if (togethersLoading && togethers.length === 0) {
    return (
      <div className="responses-page">
        <div className="responses-page__container">
          <aside className="responses-page__sidebar">
            <div className="responses-page__sidebar-header">
              <h1 className="responses-page__sidebar-title">신청 관리</h1>
              <p className="responses-page__sidebar-subtitle">불러오는 중...</p>
            </div>
          </aside>
          <main
            className="responses-page__main"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="responses-page__loading">데이터 로딩 중...</div>
          </main>
        </div>
      </div>
    );
  }

  if (error && togethers.length === 0) {
    return (
      <div className="responses-page">
        <div className="responses-page__container">
          <aside className="responses-page__sidebar">
            <div className="responses-page__sidebar-header">
              <h1 className="responses-page__sidebar-title">신청 관리</h1>
            </div>
          </aside>
          <main className="responses-page__main">
            <div className="responses-page__error">
              <p>{error}</p>
              <button onClick={() => loadAllData()}>다시 시도</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!togethersLoading && togethers.length === 0) {
    return (
      <div className="responses-page">
        <div className="responses-page__container">
          <aside className="responses-page__sidebar">
            <div className="responses-page__sidebar-header">
              <h1 className="responses-page__sidebar-title">신청 관리</h1>
              <p className="responses-page__sidebar-subtitle">
                신청자를 관리해보세요.
              </p>
            </div>
          </aside>
          <main className="responses-page__main">
            <div className="responses-page__page-header">
              아직 생성한 프로젝트가 없습니다.
            </div>
            <button
              className="primary-button"
              onClick={() => navigate("/togethers/write")}
            >
              + Create New Post
            </button>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="responses-page">
      <div className="responses-page__container">
        <aside className="responses-page__sidebar">
          <div className="responses-page__sidebar-header">
            <h1 className="responses-page__sidebar-title">신청 관리</h1>
            <p className="responses-page__sidebar-subtitle">
              신청자를 관리해보세요.
            </p>
          </div>

          <nav className="responses-page__sidebar-nav">
            <button
              className={`responses-page__nav-item${activePostId === null ? " responses-page__nav-item--active" : ""}`}
              onClick={() => setActivePostId(null)}
            >
              <span className="responses-page__nav-icon">📁</span> 전체 신청자
              보기
            </button>
            {togethers.map((t) => {
              const pendingCount =
                t.applicants?.filter((a) => a.status === "pending").length || 0;

              return (
                <button
                  key={t.post_id}
                  className={`responses-page__nav-item${activePostId === t.post_id ? " responses-page__nav-item--active" : ""}`}
                  onClick={() => handleSelectPost(t.post_id)}
                >
                  <span className="responses-page__nav-icon">📄</span> {t.title}
                  {pendingCount > 0 && (
                    <span className="responses-page__stat-badge responses-page__stat-badge--action">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="responses-page__main">
          <div className="responses-page__page-header">
            <p className="responses-page__breadcrumb">
              <span>신청 관리</span>
              {targetTogether?.title && (
                <>
                  <span className="responses-page__breadcrumb-separator">
                    ›
                  </span>
                  <span>{targetTogether.title}</span>
                </>
              )}
            </p>
            <h2 className="responses-page__page-title">
              나에게 신청한 프로젝트 관리
            </h2>
          </div>

          <div className="responses-page__stat-grid">
            <StatCard label="전체 신청자" value={overallStats.total} />
            <StatCard
              label="대기중"
              value={overallStats.pending}
              badge={
                overallStats.pending > 0
                  ? { type: "action", text: "피드백 필요" }
                  : null
              }
            />
            <StatCard label="승인" value={overallStats.approved} />
            <StatCard
              label={
                activePostId ? "선택된 프로젝트 승인" : "전체 프로젝트 승인"
              }
              value={currentTabCounts.approved}
              sub={activePostId ? `목표: ${targetHeadcount}명` : null}
            />
          </div>

          <div className="responses-page__tab-bar">
            <div className="responses-page__tabs">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.value}
                  className={`responses-page__tab${activeTab === tab.value ? " responses-page__tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label} ({currentTabCounts[tab.value]})
                </button>
              ))}
            </div>

            <div className="responses-page__tab-actions">
              <div className="responses-page__sort-wrapper">
                <button
                  className="responses-page__sort-button"
                  onClick={() => setIsSortOpen((prev) => !prev)}
                >
                  ≡{" "}
                  {SORT_OPTIONS.find((s) => s.value === sortBy)?.label ||
                    "최신순"}
                </button>
                {isSortOpen && (
                  <div className="responses-page__sort-dropdown">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`responses-page__sort-option${sortBy === option.value ? " responses-page__sort-option--active" : ""}`}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="responses-page__applicant-list">
            {sortedActiveList.length === 0 ? (
              <div className="responses-page__empty">
                {activeTab === "pending" && "아직 대기 중인 신청자가 없습니다."}
                {activeTab === "approved" && "승인된 신청자가 없습니다."}
                {activeTab === "rejected" && "반려된 신청자가 없습니다."}
              </div>
            ) : (
              sortedActiveList.map((applicant) => (
                <ApplicantCard
                  key={applicant.id}
                  applicant={applicant}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isActionLoading={actionLoading === applicant.id}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
