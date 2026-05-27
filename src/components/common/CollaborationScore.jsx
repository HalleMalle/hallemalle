import "./CollaborationScore.scss";

const LEVELS = [
  { max: 20, color: "#74b9ff", label: "시작 단계" },
  { max: 40, color: "#00b894", label: "함께 growing" },
  { max: 70, color: "#fdcb6e", label: "신뢰할 수 있는" },
  { max: 90, color: "#e17055", label: "믿음직한" },
  { max: 100, color: "#d63031", label: "최고의 협업자" },
];

function getLevel(score) {
  if (score <= 0) return { color: "#636e72", label: "비활성" };
  for (const level of LEVELS) {
    if (score <= level.max) return level;
  }
  return LEVELS[LEVELS.length - 1];
}

export default function CollaborationScore({ score = 36.5, size = "md" }) {
  const level = getLevel(score);
  const pct = Math.min(Math.max(score, 0), 100);

  return (
    <div className={`collab-score collab-score--${size}`}>
      <div className="score-visual">
        <svg viewBox="0 0 120 60" className="score-arc">
          <path
            d="M10 50 A50 50 0 0 1 110 50"
            fill="none"
            stroke="#e9ecef"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M10 50 A50 50 0 0 1 110 50"
            fill="none"
            stroke={level.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${pct * 1.57} 157`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="score-value" style={{ color: level.color }}>
          {score.toFixed(1)}°
        </div>
      </div>
      <div className="score-label">{level.label}</div>
    </div>
  );
}
