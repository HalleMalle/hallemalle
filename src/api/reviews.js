import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "./firebase";
import { calculateCollaborationScore } from "../utils/scoreEngine";

const REVIEWS_COLLECTION = "collaborationReviews";

// ─── Create a review ───
export async function createReview({
  reviewerId,
  targetUserId,
  projectId,
  rating,
  content,
}) {
  // Prevent duplicate reviews (one review per reviewer-target-project)
  const existing = query(
    collection(db, REVIEWS_COLLECTION),
    where("reviewerId", "==", reviewerId),
    where("targetUserId", "==", targetUserId),
    where("projectId", "==", projectId),
  );
  const snap = await getDocs(existing);
  if (!snap.empty) {
    throw new Error("이미 해당 프로젝트에서 이 팀원을 평가했습니다.");
  }

  const ref = doc(collection(db, REVIEWS_COLLECTION));
  const data = {
    reviewerId,
    targetUserId,
    projectId,
    rating,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);

  await updateUserCollaborationScore(targetUserId);

  return { id: ref.id, ...data };
}

// ─── Get all reviews received by a user ───
export async function getReviewsByUser(userId) {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("targetUserId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get all reviews for a specific project ───
export async function getReviewsByProject(projectId) {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get reviews written by a user ───
export async function getReviewsByReviewer(reviewerId) {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("reviewerId", "==", reviewerId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get reviews by a reviewer for a specific project ───
export async function getReviewsByReviewerAndProject(reviewerId, projectId) {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("reviewerId", "==", reviewerId),
    where("projectId", "==", projectId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Recalculate and update a user's collaboration score ───
export async function updateUserCollaborationScore(userId) {
  const reviews = await getReviewsByUser(userId);
  const score = calculateCollaborationScore(reviews);

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { collaborationScore: score });

  return score;
}
