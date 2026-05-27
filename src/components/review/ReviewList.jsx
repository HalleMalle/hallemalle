import { useState, useEffect } from "react";
import { getDocument } from "../../api/firestore";
import ReviewCard from "./ReviewCard";
import "./ReviewList.scss";

export default function ReviewList({ reviews = [], title = "받은 리뷰" }) {
  const [profiles, setProfiles] = useState({});
  const [projectTitles, setProjectTitles] = useState({});

  useEffect(() => {
    if (reviews.length === 0) return;

    const reviewerIds = [...new Set(reviews.map((r) => r.reviewerId))];
    const projectIds = [...new Set(reviews.map((r) => r.projectId))];

    Promise.all([
      ...reviewerIds.map((id) =>
        getDocument("users", id).then((doc) => {
          if (doc) setProfiles((prev) => ({ ...prev, [id]: doc }));
        }),
      ),
      ...projectIds.map((id) =>
        getDocument("projects", id).then((doc) => {
          if (doc) setProjectTitles((prev) => ({ ...prev, [id]: doc.title }));
        }),
      ),
    ]);
  }, [reviews]);

  if (reviews.length === 0) {
    return (
      <div className="review-list">
        <h3 className="review-list-header">{title}</h3>
        <div className="review-list-empty">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
          </svg>
          <p>아직 받은 리뷰가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-list">
      <h3 className="review-list-header">
        {title} ({reviews.length})
      </h3>
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          reviewerProfile={profiles[review.reviewerId]}
          projectTitle={projectTitles[review.projectId]}
        />
      ))}
    </div>
  );
}
