import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { getMyApplications, cancelApplication } from "@/api/application";

import { useAuth } from "@/contexts/AuthContext";

import "./RequestList.scss";

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
    <div className="requests-page__stat-card">
      <p className="requests-page__stat-label">{label}</p>
      <div className="requests-page__stat-value-row">
        <span className="requests-page__stat-value">{value}</span>
        {badge && (
          <span
            className={`requests-page__stat-badge requests-page__stat-badge--${badge.type}`}
          >
            {badge.text}
          </span>
        )}
        {sub && <span className="requests-page__stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

function RequestCard({ application, onCancel, isActionLoading }) {
  const navigate = useNavigate();

  const {
    together,
    applied_role,
    status,
    wait_time,
    applied_at,
    attachments = [],
    message,
  } = application;

  const projectTitle = together?.title || "삭제된 프로젝트";

  return (
    <div
      className="requests-page__applicant-card"
      style={{ opacity: isActionLoading ? 0.6 : 1 }}
    >
      <div className="requests-page__applicant-body">
        <div className="requests-page__applicant-name-row">
          <span className="requests-page__applicant-name">{projectTitle}</span>
          {status === "pending" && wait_time > 0 && (
            <span className="requests-page__applicant-wait-badge">
              {wait_time}h 대기중
            </span>
          )}
        </div>

        <p className="requests-page__applicant-role-time">
          지원 역할: {applied_role} • {formatAppliedAt(applied_at)}
        </p>

        {message && (
          <p className="requests-page__applicant-message">{message}</p>
        )}

        {attachments.length > 0 && (
          <div className="requests-page__applicant-attachments">
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="requests-page__attachment-tag"
              >
                <span className="requests-page__attachment-icon">
                  {ATTACHMENT_ICONS[attachment.type] || "🔗"}
                </span>
                {attachment.type.toUpperCase()}
              </a>
            ))}
          </div>
        )}

        <button
          className="requests-page__applicant-detail-link"
          onClick={() => navigate(`/togethers/${application.post_id}`)}
        >
          프로젝트 상세 보기
        </button>
      </div>

      <div className="requests-page__applicant-actions">
        {status === "pending" && (
          <button
            className="requests-page__action-button requests-page__action-button--cancel"
            onClick={() => onCancel(application.post_id)}
            disabled={isActionLoading}
          >
            {isActionLoading ? "..." : "신청 취소"}
          </button>
        )}
        {status === "approved" && (
          <span className="requests-page__status-label requests-page__status-label--approved">
            승인됨
          </span>
        )}
        {status === "rejected" && (
          <span className="requests-page__status-label requests-page__status-label--rejected">
            반려됨
          </span>
        )}
      </div>
    </div>
  );
}

export default function RequestList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid;

  const [activePostId, setActivePostId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortBy, setSortBy] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const overallStats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  const targetApplication = applications.find(
    (a) => a.post_id === activePostId
  );
  const currentApplicants = targetApplication ? [targetApplication] : [];

  const pendingList = applications.filter((a) => a.status === "pending");
  const approvedList = applications.filter((a) => a.status === "approved");
  const rejectedList = applications.filter((a) => a.status === "rejected");

  const currentTabCounts = {
    pending: pendingList.length,
    approved: approvedList.length,
    rejected: rejectedList.length,
  };

  const sortedActiveList = (() => {
    const baseList = activePostId
      ? currentApplicants.filter((a) => a.status === activeTab)
      : {
          pending: pendingList,
          approved: approvedList,
          rejected: rejectedList,
        }[activeTab] || [];

    return [...baseList].sort((a, b) => {
      const toSec = (v) =>
        v?.seconds ?? (v?.toDate ? v.toDate().getTime() / 1000 : 0);

      if (sortBy === "oldest") return toSec(a.applied_at) - toSec(b.applied_at);
      if (sortBy === "wait") return (b.wait_time || 0) - (a.wait_time || 0);
      return toSec(b.applied_at) - toSec(a.applied_at);
    });
  })();

  const loadAllData = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getMyApplications(uid);
      setApplications(list);
    } catch (err) {
      console.error("loadAllData error:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const handleCancel = async (postId) => {
    if (!window.confirm("신청을 취소하시겠습니까?")) return;
    setActionLoading(postId);
    try {
      await cancelApplication(postId, uid);
      setApplications((prev) => prev.filter((a) => a.post_id !== postId));
      if (activePostId === postId) {
        setActivePostId(null);
      }
    } catch (err) {
      console.error("cancelApplication error:", err);
      alert("신청 취소 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectPost = (postId) => {
    if (postId === activePostId) {
      setActivePostId(null);
      return;
    }
    setActivePostId(postId);
  };

  if (loading && applications.length === 0) {
    return (
      <div className="requests-page">
        <div className="requests-page__container">
          <aside className="requests-page__sidebar">
            <div className="requests-page__sidebar-header">
              <h1 className="requests-page__sidebar-title">신청서 관리</h1>
              <p className="requests-page__sidebar-subtitle">불러오는 중...</p>
            </div>
          </aside>
          <main
            className="requests-page__main"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="requests-page__loading">데이터 로딩 중...</div>
          </main>
        </div>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="requests-page">
        <div className="requests-page__container">
          <aside className="requests-page__sidebar">
            <div className="requests-page__sidebar-header">
              <h1 className="requests-page__sidebar-title">신청서 관리</h1>
            </div>
          </aside>
          <main className="requests-page__main">
            <div className="requests-page__error">
              <p>{error}</p>
              <button onClick={() => loadAllData()}>다시 시도</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!loading && applications.length === 0) {
    return (
      <div className="requests-page">
        <div className="requests-page__container">
          <aside className="requests-page__sidebar">
            <div className="requests-page__sidebar-header">
              <h1 className="requests-page__sidebar-title">신청서 관리</h1>
              <p className="requests-page__sidebar-subtitle">
                신청한 프로젝트 목록
              </p>
            </div>
          </aside>
          <main className="requests-page__main">
            <div className="requests-page__page-header">
              아직 신청한 프로젝트가 없습니다.
            </div>
            <button
              className="primary-button"
              onClick={() => navigate("/togethers")}
            >
              프로젝트 탐색하기
            </button>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="requests-page">
      <div className="requests-page__container">
        <aside className="requests-page__sidebar">
          <div className="requests-page__sidebar-header">
            <h1 className="requests-page__sidebar-title">신청서 관리</h1>
            <p className="requests-page__sidebar-subtitle">
              신청한 프로젝트 목록
            </p>
          </div>

          <nav className="requests-page__sidebar-nav">
            <button
              className={`requests-page__nav-item${activePostId === null ? " requests-page__nav-item--active" : ""}`}
              onClick={() => setActivePostId(null)}
            >
              <span className="requests-page__nav-icon">📁</span> 전체 신청서
              보기
            </button>
            {applications.map((a) => (
              <button
                key={a.post_id}
                className={`requests-page__nav-item${activePostId === a.post_id ? " requests-page__nav-item--active" : ""}`}
                onClick={() => handleSelectPost(a.post_id)}
              >
                <span className="requests-page__nav-icon">📄</span>{" "}
                {a.together?.title || "삭제된 프로젝트"}
              </button>
            ))}
          </nav>
        </aside>

        <main className="requests-page__main">
          <div className="requests-page__page-header">
            <p className="requests-page__breadcrumb">
              <span>신청서 관리</span>
              {targetApplication?.together?.title && (
                <>
                  <span className="requests-page__breadcrumb-separator">›</span>
                  <span>{targetApplication.together.title}</span>
                </>
              )}
            </p>
            <h2 className="requests-page__page-title">
              내가 신청한 프로젝트 관리
            </h2>
          </div>

          <div className="requests-page__stat-grid">
            <StatCard label="총 신청 건수" value={overallStats.total} />
            <StatCard
              label="심사 대기"
              value={overallStats.pending}
              badge={
                overallStats.pending > 0
                  ? { type: "action", text: "대기중" }
                  : null
              }
            />
            <StatCard label="승인 완료" value={overallStats.approved} />
            <StatCard label="반려 내역" value={overallStats.rejected} />
          </div>

          <div className="requests-page__tab-bar">
            <div className="requests-page__tabs">
              {TAB_OPTIONS.map((tab) => {
                const count = activePostId
                  ? targetApplication?.status === tab.value
                    ? 1
                    : 0
                  : currentTabCounts[tab.value];
                return (
                  <button
                    key={tab.value}
                    className={`requests-page__tab${activeTab === tab.value ? " requests-page__tab--active" : ""}`}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="requests-page__tab-actions">
              <div className="requests-page__sort-wrapper">
                <button
                  className="requests-page__sort-button"
                  onClick={() => setIsSortOpen((prev) => !prev)}
                >
                  ≡{" "}
                  {SORT_OPTIONS.find((s) => s.value === sortBy)?.label ||
                    "최신순"}
                </button>
                {isSortOpen && (
                  <div className="requests-page__sort-dropdown">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`requests-page__sort-option${sortBy === option.value ? " requests-page__sort-option--active" : ""}`}
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

          <div className="requests-page__applicant-list">
            {sortedActiveList.length === 0 ? (
              <div className="requests-page__empty">
                {activeTab === "pending" && "대기 중인 신청서가 없습니다."}
                {activeTab === "approved" && "승인된 신청서가 없습니다."}
                {activeTab === "rejected" && "반려된 신청서가 없습니다."}
              </div>
            ) : (
              sortedActiveList.map((application) => (
                <RequestCard
                  key={application.id}
                  application={application}
                  onCancel={handleCancel}
                  isActionLoading={actionLoading === application.post_id}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
