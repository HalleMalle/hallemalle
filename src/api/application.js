// applicants, applicant_attachments 컬렉션을 다룹니다.

import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

const APPLICANTS_COL = "applicants";
const ATTACHMENTS_COL = "applicant_attachments";

function createApplicantError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * applicants 도큐먼트 하나에 첨부 링크를 합쳐 반환합니다.
 */
async function hydrateApplicant(applicantDoc) {
  const data = { id: applicantDoc.id, ...applicantDoc.data() };

  const attachmentsSnap = await getDocs(
    query(
      collection(db, ATTACHMENTS_COL),
      where("applicant_id", "==", applicantDoc.id)
    )
  );
  data.attachments = attachmentsSnap.docs.map((d) => d.data());

  return data;
}

/**
 * 1. 내 신청 단건 조회
 *    - 해당 포스트에 이미 신청했는지 확인하는 용도로도 사용합니다.
 *    - 없으면 null 반환
 */
export async function getMyApplication(postId, uid) {
  if (!postId || !uid) return null;

  const snap = await getDocs(
    query(
      collection(db, APPLICANTS_COL),
      where("post_id", "==", postId),
      where("uid", "==", uid)
    )
  );

  if (snap.empty) return null;
  return hydrateApplicant(snap.docs[0]);
}

/**
 * 2. 팀원 신청
 *
 * formData 형태:
 * {
 *   appliedRole : string,          // 'Frontend' | 'Backend' | ...
 *   message     : string,          // 자기소개 / 신청 메시지
 *   attachments : [                // 포트폴리오 링크 목록 (최대 5개)
 *     { type: 'github' | 'behance' | 'portfolio' | 'cv_pdf' | 'linkedin' | 'other', url: string }
 *   ]
 * }
 */
export async function applyToProject(postId, uid, formData) {
  if (!postId || !uid) {
    throw createApplicantError(
      "APPLY-001-UNAUTHENTICATED",
      "로그인이 필요합니다."
    );
  }

  // 중복 신청 방지 (DB 인덱스 (post_id, uid) unique 이지만 클라이언트에서도 방어)
  const existing = await getMyApplication(postId, uid);
  if (existing) {
    throw createApplicantError(
      "APPLY-002-DUPLICATE",
      "이미 신청한 프로젝트입니다."
    );
  }

  if (!formData.appliedRole) {
    throw createApplicantError(
      "APPLY-003-NO-ROLE",
      "신청할 역할을 선택해주세요."
    );
  }

  // applicants 도큐먼트 생성
  const applicantRef = doc(collection(db, APPLICANTS_COL));

  await setDoc(applicantRef, {
    post_id: postId,
    uid,
    applied_role: formData.appliedRole,
    status: "pending",
    wait_time: 0,
    message: formData.message?.trim() || "",
    applied_at: serverTimestamp(),
    reviewed_at: null,
  });

  // 첨부 링크 저장 (applicant_attachments)
  const validAttachments = (formData.attachments || []).filter(
    (a) => a.url && a.url.trim() !== ""
  );

  for (const attachment of validAttachments) {
    const aRef = doc(collection(db, ATTACHMENTS_COL));
    await setDoc(aRef, {
      applicant_id: applicantRef.id,
      type: attachment.type || "other",
      url: attachment.url.trim(),
    });
  }

  return applicantRef.id;
}

/**
 * 3. 신청 취소 (pending 상태인 경우만)
 */
export async function cancelApplication(postId, uid) {
  const application = await getMyApplication(postId, uid);

  if (!application) {
    throw createApplicantError("APPLY-004-NOT-FOUND", "신청 내역이 없습니다.");
  }
  if (application.status !== "pending") {
    throw createApplicantError(
      "APPLY-005-NOT-CANCELLABLE",
      "이미 처리된 신청은 취소할 수 없습니다."
    );
  }

  // 첨부파일 먼저 삭제
  const attachmentsSnap = await getDocs(
    query(
      collection(db, ATTACHMENTS_COL),
      where("applicant_id", "==", application.id)
    )
  );
  for (const attachmentDoc of attachmentsSnap.docs) {
    await deleteDoc(attachmentDoc.ref);
  }

  await deleteDoc(doc(db, APPLICANTS_COL, application.id));
}

/**
 * 4. 신청 승인 (프로젝트 오너 전용)
 */
export async function approveApplication(applicantId) {
  await updateDoc(doc(db, APPLICANTS_COL, applicantId), {
    status: "approved",
    reviewed_at: serverTimestamp(),
  });
}

/**
 * 5. 신청 반려 (프로젝트 오너 전용)
 */
export async function rejectApplication(applicantId) {
  await updateDoc(doc(db, APPLICANTS_COL, applicantId), {
    status: "rejected",
    reviewed_at: serverTimestamp(),
  });
}

/**
 * 6. 프로젝트 신청자 목록 조회 (프로젝트 오너 전용)
 *    status 필터 없으면 전체 반환
 */
export async function getApplicantsByPost(postId, statusFilter) {
  if (!postId) return [];

  const constraints = [where("post_id", "==", postId)];
  if (statusFilter) {
    constraints.push(where("status", "==", statusFilter));
  }

  const snap = await getDocs(
    query(collection(db, APPLICANTS_COL), ...constraints)
  );

  return Promise.all(snap.docs.map(hydrateApplicant));
}
