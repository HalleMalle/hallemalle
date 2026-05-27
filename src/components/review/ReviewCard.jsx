import "./ReviewCard.scss";

function formatRelativeTime(date) {
  if (!date) return "";
  const now = Date.now();
  const diff = now - (date?.toMillis?.() || new Date(date).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

function StarRating({ rating }) {
  return (
    <div className="review-card-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`review-card-star ${star <= rating ? "review-card-star--filled" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78L10 1z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewCard({ review, reviewerProfile, projectTitle }) {
  const photoURL = reviewerProfile?.photoURL || "/default-avatar.png";
  const displayName = reviewerProfile?.displayName || "알 수 없음";

  return (
    <div className="review-card">
      <div className="review-card-avatar">
        <img src={photoURL} alt={displayName} />
      </div>
      <div className="review-card-body">
        <div className="review-card-header">
          <span className="review-card-name">{displayName}</span>
          <span className="review-card-date">
            {formatRelativeTime(review.createdAt)}
          </span>
        </div>
        <StarRating rating={review.rating} />
        <p className="review-card-content">{review.content}</p>
        {projectTitle && (
          <div className="review-card-project">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            {projectTitle}
          </div>
        )}
      </div>
    </div>
  );
}
