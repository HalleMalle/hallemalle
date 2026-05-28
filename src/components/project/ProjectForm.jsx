import { useState } from "react";
import "./ProjectForm.scss";

const ROLE_OPTIONS = ["FE", "BE", "Design", "Android", "iOS", "PM", "QA", "AI"];
const ROLE_LABELS = {
  FE: "프론트엔드",
  BE: "백엔드",
  Design: "디자인",
  Android: "안드로이드",
  iOS: "iOS",
  PM: "기획/PM",
  QA: "QA",
  AI: "AI/ML",
};
const STAGE_OPTIONS = [
  { value: "planning", label: "기획부터" },
  { value: "development", label: "개발부터" },
  { value: "maintenance", label: "유지보수" },
];

function emptyPositions() {
  return ROLE_OPTIONS.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    total: 0,
    current: 0,
  }));
}

export default function ProjectForm({
  initialData,
  onSubmit,
  submitLabel = "등록하기",
}) {
  return <></>
}
