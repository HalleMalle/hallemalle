/**
 * 사용자명으로 사용할 난수 문자열 생성
 * 형식: 형용사_명사_숫자4자리
 * 예: "bright_panda_3821"
 */

const adjectives = [
  "bright",
  "calm",
  "cool",
  "swift",
  "keen",
  "bold",
  "wise",
  "kind",
  "safe",
  "fair",
  "nice",
  "rare",
  "neat",
  "pure",
  "vast",
  "warm",
  "soft",
  "deep",
  "wild",
  "free",
  "mild",
  "tall",
  "thin",
  "rich",
  "glad",
];

const nouns = [
  "panda",
  "tiger",
  "eagle",
  "fox",
  "deer",
  "wolf",
  "bear",
  "hawk",
  "owl",
  "swan",
  "koala",
  "sloth",
  "otter",
  "heron",
  "lynx",
  "crane",
  "dove",
  "hare",
  "moose",
  "seal",
  "whale",
  "crow",
  "drake",
  "finch",
  "geese",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDigits(length = 4) {
  return String(Math.floor(Math.random() * 10 ** length)).padStart(length, "0");
}

export function generateUsername() {
  const adj = pickRandom(adjectives);
  const noun = pickRandom(nouns);
  const digits = randomDigits(4);
  return `${adj}_${noun}_${digits}`;
}
