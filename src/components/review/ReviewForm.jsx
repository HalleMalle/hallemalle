import { useState } from "react";
import { createReview } from "../../api/reviews";
import { useAuth } from "../../contexts/AuthContext";
import "./ReviewForm.scss";

const STAR_LABELS = {
  0: "평점을 선택해주세요",
  1: "매우 아쉬워요",
  2: "조금 아쉬워요",
  3: "보통이에요",
  4: "잘했어요",
  5: "최고예요!",
};

export default function ReviewForm({
  targetUser,
  projectTitle,
  projectId,
  onSuccess,
  onCancel,
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    if (rating === 0) {
      setError("평점을 선택해주세요.");
      return;
    }
    if (!content.trim()) {
      setError("리뷰 내용을 작성해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createReview({
        reviewerId: user.uid,
        targetUserId: targetUser.uid || targetUser.id,
        projectId,
        rating,
        content: content.trim(),
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message || "리뷰 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="review-form-target">
        <div className="review-form-target-avatar">
          <img
            src={targetUser.photoURL || "/default-avatar.png"}
            alt={targetUser.displayName || "사용자"}
          />
        </div>
        <div className="review-form-target-info">
          <span className="review-form-target-name">
            {targetUser.displayName || "알 수 없음"}
          </span>
          {projectTitle && (
            <span className="review-form-target-project">{projectTitle}</span>
          )}
        </div>
      </div>

      <div className="review-form-stars">
        <span className="review-form-stars-label">협업 평가</span>
        <div className="review-form-stars-input">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`review-form-star-btn ${star <= displayRating ? "review-form-star-btn--active" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star}점`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78L10 1z" />
              </svg>
            </button>
          ))}
          <span className="review-form-star-label">
            {STAR_LABELS[displayRating] || STAR_LABELS[0]}
          </span>
        </div>
      </div>

      <div className="review-form-field">
        <label className="review-form-label" htmlFor="review-content">
          리뷰 내용
        </label>
        <textarea
          id="review-content"
          className="review-form-textarea"
          placeholder="함께한 프로젝트에서 상대방의 협업 태도, 기여도, 의사소통 등에 대한 솔직한 평가를 남겨주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
        />
      </div>

      {error && <div className="review-form-error">{error}</div>}

      <div className="review-form-actions">
        {onCancel && (
          <button
            type="button"
            className="review-form-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            취소
          </button>
        )}
        <button
          type="submit"
          className="review-form-submit"
          disabled={submitting || rating === 0 || !content.trim()}
        >
          {submitting ? "제출 중..." : "리뷰 제출"}
        </button>
      </div>
    </form>
  );
}
