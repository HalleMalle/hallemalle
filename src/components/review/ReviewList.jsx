import { useState, useEffect } from "react";
import ReviewCard from "./ReviewCard";
import "./ReviewList.scss";

export default function ReviewList({ reviews = [], title = "받은 리뷰" }) {
  if (reviews.length === 0) {
    return <></>
  }

  return <></>
}
