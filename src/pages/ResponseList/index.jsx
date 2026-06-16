import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 💡 API 연동 전이므로 Firebase import 주석 처리
/*
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
*/

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

const MOCK_TOGETHERS = [
  {
    post_id: "project_01",
    title: "React를 활용한 매칭 서비스 사이드 프로젝트",
    total_headcount: 5,
  },
  {
    post_id: "project_02",
    title: "공모전 프로젝트",
    total_headcount: 5,
  },
];

const MOCK_APPLICANTS = [
  {
    id: "app_01",
    post_id: "project_01",
    uid: "user_01",
    applied_role: "Frontend Engineer",
    status: "pending",
    wait_time: 0,
    applied_at: { seconds: Math.floor((Date.now() - 10 * 60 * 1000) / 1000) },
    applicantUser: {
      display_name: "김철수",
      photo_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    },
    attachments: [
      { id: "at_01", type: "github", url: "https://github.com" },
      { id: "at_02", type: "cv_pdf", url: "https://example.com/cv.pdf" },
    ],
  },
  {
    id: "app_02",
    post_id: "project_01",
    uid: "user_02",
    applied_role: "UI/UX Designer",
    status: "pending",
    wait_time: 24,
    applied_at: {
      seconds: Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000),
    },
    applicantUser: {
      display_name: "이영희",
      photo_url: null,
    },
    attachments: [{ id: "at_03", type: "behance", url: "https://behance.net" }],
  },
  {
    id: "app_03",
    post_id: "project_01",
    uid: "user_03",
    applied_role: "Backend Engineer",
    status: "approved",
    wait_time: 5,
    applied_at: {
      seconds: Math.floor((Date.now() - 5 * 24 * 60 * 60 * 1000) / 1000),
    },
    applicantUser: {
      display_name: "박민수",
      photo_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    attachments: [
      { id: "at_04", type: "linkedin", url: "https://linkedin.com" },
    ],
  },
  {
    id: "app_04",
    post_id: "project_01",
    uid: "user_04",
    applied_role: "Product Manager",
    status: "rejected",
    wait_time: 12,
    applied_at: {
      seconds: Math.floor((Date.now() - 3 * 24 * 60 * 60 * 1000) / 1000),
    },
    applicantUser: {
      display_name: "정지원",
      photo_url: null,
    },
    attachments: [],
  },
];

function formatAppliedAt(dateValue) {
  if (!dateValue) return "";

  // 목업 데이터 구조({ seconds }) 혹은 Date 객체에 대응 가능하도록 보완
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
            ✓ 승인
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

  const [activePostId, setActivePostId] = useState("project_01");
  const [togethers, setTogethers] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortBy, setSortBy] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const totalCount = applicants.length;
  const pendingList = applicants.filter((a) => a.status === "pending");
  const approvedList = applicants.filter((a) => a.status === "approved");
  const rejectedList = applicants.filter((a) => a.status === "rejected");

  const tabCounts = {
    pending: pendingList.length,
    approved: approvedList.length,
    rejected: rejectedList.length,
  };

  const sortedActiveList = (() => {
    const list =
      {
        pending: pendingList,
        approved: approvedList,
        rejected: rejectedList,
      }[activeTab] || [];

    return [...list].sort((a, b) => {
      if (sortBy === "oldest") {
        return (a.applied_at?.seconds || 0) - (b.applied_at?.seconds || 0);
      }
      if (sortBy === "wait") {
        return (b.wait_time || 0) - (a.wait_time || 0);
      }
      // newest (default)
      return (b.applied_at?.seconds || 0) - (a.applied_at?.seconds || 0);
    });
  })();

  // TODO: activePostId에 따라 togethers에서 해당 항목을 찾아 title 등 표시할 수 있도록 보완
  const targetTogether = togethers?.find((t) => t.post_id === activePostId);
  const targetHeadcount = targetTogether?.total_headcount || 0;

  useEffect(() => {
    if (!activePostId) return;
    fetchMockData();
  }, [activePostId]);

  const fetchMockData = async () => {
    setLoading(true);
    try {
      // 0.5초 대기 후 목업 주입
      await new Promise((resolve) => setTimeout(resolve, 500));

      setTogethers(MOCK_TOGETHERS);
      setApplicants(MOCK_APPLICANTS);
    } catch (error) {
      console.error("ResponseList fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicantId) => {
    setActionLoading(applicantId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300)); // 딜레이 체감용
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicantId ? { ...a, status: "approved" } : a
        )
      );
    } catch (error) {
      console.error("Approve error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicantId) => {
    setActionLoading(applicantId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300)); // 딜레이 체감용
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicantId ? { ...a, status: "rejected" } : a
        )
      );
    } catch (error) {
      console.error("Reject error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="responses-page">
        <div className="responses-page__loading">불러오는 중(Mock)...</div>
      </div>
    );
  }

  return (
    <div className="responses-page">
      <div className="responses-page__container">
        {/* ── 사이드바 ── */}
        <aside className="responses-page__sidebar">
          <div className="responses-page__sidebar-header">
            <h1 className="responses-page__sidebar-title">신청 관리</h1>
            <p className="responses-page__sidebar-subtitle">
              신청자를 관리해보세요.
            </p>
          </div>

          {/* TODO: togethers의 항목이 nav-item으로 오도록 수정 */}
          <nav className="responses-page__sidebar-nav">
            {togethers?.map((t) => (
              <button
                key={t.post_id}
                className={`responses-page__nav-item${activePostId === t.post_id ? " responses-page__nav-item--active" : ""}`}
                onClick={() => {
                  setActivePostId(t.post_id);
                }}
              >
                <span className="responses-page__nav-icon">👥</span>
                {t.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── 메인 콘텐츠 ── */}
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

          {/* 통계 카드 */}
          <div className="responses-page__stat-grid">
            <StatCard
              label="전체 신청자"
              value={totalCount}
              badge={totalCount > 0 ? { type: "growth", text: "+12%" } : null}
            />
            <StatCard
              label="대기중"
              value={tabCounts.pending}
              badge={
                tabCounts.pending > 0
                  ? { type: "action", text: "피드백 필요" }
                  : null
              }
            />
            <StatCard
              label="승인"
              value={tabCounts.approved}
              sub={`Target: ${targetHeadcount}`}
            />
            <StatCard label="반려" value={tabCounts.rejected} />
          </div>

          {/* 탭 + 필터/정렬 */}
          <div className="responses-page__tab-bar">
            <div className="responses-page__tabs">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.value}
                  className={`responses-page__tab${activeTab === tab.value ? " responses-page__tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label} ({tabCounts[tab.value]})
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
                    "Newest"}
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

          {/* 신청자 카드 목록 */}
          <div className="responses-page__applicant-list">
            {sortedActiveList.length === 0 ? (
              <div className="responses-page__empty">
                {activeTab === "pending" && "아직 신청자가 없습니다."}
                {activeTab === "approved" && "승인된 신청자가 없습니다."}
                {activeTab === "rejected" && "거절된 신청자가 없습니다."}
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

          {/* 더보기 */}
          {sortedActiveList.length > 0 && (
            <div className="responses-page__load-more-wrapper">
              <button className="responses-page__load-more-button">
                Load More Applicants ∨
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
