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
  return <></>
}
