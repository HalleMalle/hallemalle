export function calculateCollaborationScore(reviews = []) {
  if (reviews.length === 0) return 0;

  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  const baseScore = (avgRating / 5) * 100;

  return Math.round(baseScore * 10) / 10;
}
