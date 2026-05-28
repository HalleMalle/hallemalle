import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./MyApplications.scss";

const STATUS_CONFIG = {
  pending: { label: "대기 중", className: "pending" },
  approved: { label: "✅ 승인", className: "approved" },
  rejected: { label: "❌ 반려", className: "rejected" },
};

export default function MyApplications() {
  return <></>;
}
