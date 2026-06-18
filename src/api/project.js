// togethers, together_roles, together_tech_stack, planning_documents 컬렉션을 다룹니다.

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { db, storage } from "./firebase";

// 상수
const TOGETHERS_COL = "togethers";
const TOGETHER_ROLES_COL = "together_roles";
const TECH_STACK_COL = "together_tech_stack";
const DOCUMENTS_COL = "planning_documents";

const PAGE_SIZE = 12;

// 내부 유틸 (보안 규칙 isValidParticipationStage, isValidRecruitmentStatus 일치화)
function toDbStage(formStage) {
  const map = { planning: "plan", development: "dev", maintenance: "maintain" };
  return map[formStage] ?? formStage;
}

function toFormStage(dbStage) {
  const map = { plan: "planning", dev: "development", maintain: "maintenance" };
  return map[dbStage] ?? dbStage;
}

function toDbStatus(formStatus) {
  const map = { recruiting: "recruiting", paused: "closed", closed: "closed" };
  return map[formStatus] ?? "recruiting";
}

/**
 * 썸네일 이미지 변환
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // "data:image/png;base64,..."
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

/**
 * 기획 문서 첨부 파일 스토리지 업로드
 */
async function uploadPlanningDocument(file, postId) {
  const storageRef = ref(storage, `togethers/${postId}/documents/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

export async function convertPdfToBase64(file) {
  if (!file) return "";

  // Firestore 용량 제한을 고려해 1MB (1,048,576 bytes) 체크 추가
  const MAX_SIZE = 1 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(
      "스토리지 비용 절감을 위해 1MB 이하의 PDF 파일만 업로드 가능합니다."
    );
  }

  // PDF 확장자 확인 (선택 사항이지만 안전장치로 추가)
  if (file.type !== "application/pdf") {
    throw new Error("PDF 파일 형식만 업로드할 수 있습니다.");
  }

  return await fileToBase64(file); // 범용 변환 함수 호출 ("data:application/pdf;base64,...")
}

/**
 * 1. 프로젝트 생성 (보안 규칙 100% 통과 버전)
 */
export async function createProject(formData, userId) {
  const togetherRef = doc(collection(db, TOGETHERS_COL));
  const postId = togetherRef.id;

  const finalUserId = userId || formData.creatorId || formData.created_by || "";

  // 썸네일 처리
  // ProjectForm은 thumbnail 키 하나로만 File 인스턴스를 전달합니다.
  let thumbnailUrl = "";
  if (formData.thumbnail instanceof File) {
    try {
      thumbnailUrl = await fileToBase64(formData.thumbnail);
    } catch (err) {
      console.warn("썸네일 변환 실패:", err.message);
    }
  } else if (typeof formData.thumbnail === "string") {
    thumbnailUrl = formData.thumbnail;
  }

  // 🛠 [보안규칙 정밀 대응] isValidTogetherCreate 검증 스키마 일치화
  const togetherData = {
    post_id: postId,
    created_by: finalUserId,
    title: formData.title || "",
    description: formData.description || "",
    recruitment_status: toDbStatus(formData.status), // 'recruiting' | 'closed'
    participation_stage: toDbStage(formData.stage), // 'plan' | 'dev' | 'maintain'
    total_headcount: Number(formData.headcount || formData.totalHeadcount || 2), // int (2 ~ 20)
    current_member_count: Number(formData.currentMemberCount || 0), // int (>=0)
    contact_type: formData.contactType || "email", // 'email' | 'kakao' | 'link' | 'other'
    contact_value: formData.contactValue || "",
    view_count: 0, // 규칙 필수: 반드시 정확히 0 이여야 함
    is_private: Boolean(formData.isPrivate || false), // bool
    thumbnail_url: thumbnailUrl,
    recruitment_start:
      formData.recruitmentStart ||
      formData.recruitment_start ||
      formData.startDate ||
      "",
    recruitment_end:
      formData.recruitmentEnd ||
      formData.recruitment_end ||
      formData.endDate ||
      "",
    created_at: serverTimestamp(), // 규칙 필수: request.time과 동치
    updated_at: serverTimestamp(), // 규칙 필수: request.time과 동치
  };

  // 1. 메인 프로젝트 다큐먼트 먼저 생성
  await setDoc(togetherRef, togetherData);

  // 2. 역할군 생성 (together_roles 규칙 통과 보완)
  // ProjectForm은 positions 키로 역할 배열을 전달합니다.
  const rolesData = formData.positions || formData.roles || [];
  if (Array.isArray(rolesData) && rolesData.length > 0) {
    for (const r of rolesData) {
      const rRef = doc(collection(db, TOGETHER_ROLES_COL));
      await setDoc(rRef, {
        post_id: postId,
        role_type: r.role, // 규칙 필수: isValidRole 검증 통과용 키값
        headcount: Number(r.total || 1), // 규칙 필수: int형 >= 1
        filled_count: 0, // 규칙 필수: 무조건 0으로 시작해야 생성 허용됨
      });
    }
  }

  // 3. 기술 스택 생성 (together_tech_stack 규칙 통과 보완)
  if (formData.techStack && Array.isArray(formData.techStack)) {
    for (const tag of formData.techStack) {
      if (!tag || tag.trim() === "") continue;
      const tRef = doc(collection(db, TECH_STACK_COL));
      await setDoc(tRef, {
        post_id: postId,
        tag: tag.trim(), // 규칙 필수: NonEmptyString 검증
      });
    }
  }

  // 4. 첨부 기획 문서 생성 (planning_documents 규칙 통과 보완)
  // ProjectForm은 attachments 배열의 각 항목을 { name, file, url, visibility } 형태로 전달합니다.
  // visibility 값은 항목별로 다를 수 있으므로 formData.attachmentVisibility 대신 file.visibility를 사용합니다.
  if (formData.attachments && Array.isArray(formData.attachments)) {
    for (const attachment of formData.attachments) {
      let fileUrl = "";

      if (attachment.file instanceof File) {
        try {
          fileUrl = await convertPdfToBase64(attachment.file);
        } catch (err) {
          console.warn(
            "[Storage] 문서 업로드 실패:",
            attachment.name,
            err.message
          );
          continue;
        }
      } else if (typeof attachment.url === "string" && attachment.url) {
        fileUrl = attachment.url;
      }

      if (!fileUrl) continue;

      const dRef = doc(collection(db, DOCUMENTS_COL));
      // 규칙 필수: visibility는 'public' 또는 'approved_only' 만 허용
      const dbVisibility =
        attachment.visibility === "approved_only" ? "approved_only" : "public";

      await setDoc(dRef, {
        post_id: postId,
        file_name: attachment.name || "첨부문서",
        file_url: fileUrl,
        visibility: dbVisibility,
      });
    }
  }

  return postId;
}

/**
 * 2. 프로젝트 수정 (기존 데이터 업데이트)
 */
export async function updateProject(postId, data, uid) {
  if (!postId || !uid) return false;

  const docRef = doc(db, TOGETHERS_COL, postId);

  await updateDoc(docRef, {
    title: data.title,
    description: data.description,
    recruitment_status: toDbStatus(data.status),
    participation_stage: toDbStage(data.stage),
    total_headcount: data.headcount,
    contact_type: data.contactType,
    contact_value: data.contactValue,
    updated_at: serverTimestamp(),
  });

  const rolesSnap = await getDocs(
    query(collection(db, TOGETHER_ROLES_COL), where("post_id", "==", postId))
  );
  for (const d of rolesSnap.docs) {
    await deleteDoc(d.ref);
  }
  for (const pos of data.positions) {
    const rRef = doc(collection(db, TOGETHER_ROLES_COL));
    await setDoc(rRef, {
      post_id: postId,
      role_type: pos.role,
      headcount: pos.total,
      filled_count: pos.current || 0,
    });
  }

  const techSnap = await getDocs(
    query(collection(db, TECH_STACK_COL), where("post_id", "==", postId))
  );
  for (const d of techSnap.docs) {
    await deleteDoc(d.ref);
  }
  for (const tag of data.techStack) {
    const tRef = doc(collection(db, TECH_STACK_COL));
    await setDoc(tRef, {
      post_id: postId,
      tag: tag,
    });
  }

  const docsSnap = await getDocs(
    query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
  );
  for (const d of docsSnap.docs) {
    await deleteDoc(d.ref);
  }
  for (const docItem of data.attachments) {
    const dRef = doc(collection(db, DOCUMENTS_COL));
    await setDoc(dRef, {
      post_id: postId,
      file_name: docItem.name,
      file_url: docItem.url || "",
    });
  }

  return true;
}

/**
 * 단일 프로젝트 상세 조회 (Form 채우기용)
 */
export async function getProjectById(postId) {
  if (!postId) {
    return null;
  }

  try {
    const docRef = doc(db, TOGETHERS_COL, postId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const pData = docSnap.data();

    const rolesSnap = await getDocs(
      query(collection(db, TOGETHER_ROLES_COL), where("post_id", "==", postId))
    );

    const techSnap = await getDocs(
      query(collection(db, TECH_STACK_COL), where("post_id", "==", postId))
    );

    const docsSnap = await getDocs(
      query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
    );

    const mappedRoles = rolesSnap.docs.map((r) => {
      const d = r.data();
      return {
        role: d.role_type,
        total: d.headcount,
        current: d.filled_count || 0,
      };
    });

    return {
      ...pData,
      post_id: postId,
      status: pData.recruitment_status,
      stage: pData.participation_stage,
      positions: mappedRoles,
      techStack: techSnap.docs.map((d) => d.data().tag),
      documents: docsSnap.docs.map((d) => d.data()),
    };
  } catch (error) {
    console.error("getProjectById 내부에서 에러 발생:", error);
    return null;
  }
}

/**
 * 3. 프로젝트 상세 조회 (작성자 유저 프로필 정보 포함)
 */
export async function getProjectDetail(postId) {
  const docRef = doc(db, TOGETHERS_COL, postId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const pData = docSnap.data();

  // 작성자 유저 정보(users 컬렉션) 단건 비동기 조회
  let creatorInfo = null;
  if (pData.created_by) {
    try {
      const userSnap = await getDoc(doc(db, "users", pData.created_by));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        creatorInfo = {
          uid: pData.created_by,
          github_login: uData.github_login || "",
          display_name: uData.display_name || "",
          photo_url: uData.photo_url || "",
          tier: uData.tier || "bronze",
          tier_detail: uData.tier_detail || 1,
          collaboration_score: uData.collaboration_score || 10,
        };
      }
    } catch (err) {
      console.warn("작성자 정보 로드 실패:", err.message);
    }
  }

  // (하위 컬렉션 조회부 - 기존과 동일)
  const rolesSnap = await getDocs(
    query(collection(db, TOGETHER_ROLES_COL), where("post_id", "==", postId))
  );
  const techSnap = await getDocs(
    query(collection(db, TECH_STACK_COL), where("post_id", "==", postId))
  );
  const docsSnap = await getDocs(
    query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
  );

  const mappedRoles = rolesSnap.docs.map((r) => {
    const d = r.data();
    return { role: d.role_type, total: d.headcount, current: d.filled_count };
  });

  const attachmentsData = docsSnap.docs.map((docUuid) => {
    const d = docUuid.data();
    return {
      name: d.file_name,
      url: d.file_url,
      visibility: d.visibility || "public",
    };
  });

  return {
    ...pData,
    post_id: postId,
    status: pData.recruitment_status,
    stage: toFormStage(pData.participation_stage),
    totalHeadcount: pData.total_headcount,
    currentMemberCount: pData.current_member_count,
    contactType: pData.contact_type,
    contactValue: pData.contact_value,
    isPrivate: pData.is_private,
    recruitmentStart: pData.recruitment_start || "",
    recruitmentEnd: pData.recruitment_end || "",
    thumbnail: pData.thumbnail_url || "",
    roles: mappedRoles,
    techStack: techSnap.docs.map((t) => t.data().tag),
    attachments: attachmentsData,
    attachmentVisibility: "public",

    // 화면단에 넘겨줄 작성자 오브젝트 추가
    creator: creatorInfo,
  };
}
/**
 * 4. 프로젝트 목록 전체 조회
 */
export async function getProjectList({
  roleFilter,
  statusFilter,
  lastDoc,
} = {}) {
  const baseFilters = [where("is_private", "==", false)];
  const pageConstraints = [orderBy("created_at", "desc"), limit(PAGE_SIZE)];

  if (
    statusFilter &&
    typeof statusFilter === "string" &&
    statusFilter.trim() !== ""
  ) {
    baseFilters.push(where("recruitment_status", "==", statusFilter.trim()));
  }

  if (lastDoc) {
    pageConstraints.push(startAfter(lastDoc));
  }

  const finalConstraints = [...baseFilters, ...pageConstraints];
  const projectQuery = query(
    collection(db, TOGETHERS_COL),
    ...finalConstraints
  );
  const snap = await getDocs(projectQuery);

  if (snap.empty) {
    return { projects: [], lastDoc: null, hasMore: false };
  }

  let allowedPostIds = null;
  if (
    roleFilter &&
    typeof roleFilter === "string" &&
    roleFilter.trim() !== ""
  ) {
    const roleSnap = await getDocs(
      query(
        collection(db, TOGETHER_ROLES_COL),
        where("role_type", "==", roleFilter.trim())
      )
    );
    allowedPostIds = new Set(roleSnap.docs.map((d) => d.data().post_id));
  }

  const projects = [];
  for (const d of snap.docs) {
    const pData = d.data();
    const targetPostId = pData.post_id || d.id;

    if (allowedPostIds && !allowedPostIds.has(targetPostId)) {
      continue;
    }

    if (!targetPostId) continue;

    const rolesSnap = await getDocs(
      query(
        collection(db, TOGETHER_ROLES_COL),
        where("post_id", "==", targetPostId)
      )
    );
    const techSnap = await getDocs(
      query(
        collection(db, TECH_STACK_COL),
        where("post_id", "==", targetPostId)
      )
    );

    projects.push({
      ...pData,
      post_id: targetPostId,
      status: pData.recruitment_status,
      stage: toFormStage(pData.participation_stage),
      roles: rolesSnap.docs.map((r) => r.data()),
      techStack: techSnap.docs.map((t) => t.data().tag),
    });
  }

  const nextLastDoc = snap.docs[snap.docs.length - 1];
  return {
    projects,
    lastDoc: nextLastDoc,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

/**
 * 5. 프로젝트 삭제 (관련 서브 컬렉션 및 모든 지원 내역까지 연쇄 삭제)
 */
export async function deleteProject(postId) {
  if (!postId) return false;

  try {
    // 1. 메인 프로젝트 다큐먼트 참조
    const togetherRef = doc(db, TOGETHERS_COL, postId);

    // 2. 프로젝트 내부 서브 컬렉션 조회 (역할, 기술스택, 문서)
    const rolesSnap = await getDocs(
      query(collection(db, TOGETHER_ROLES_COL), where("post_id", "==", postId))
    );
    const techSnap = await getDocs(
      query(collection(db, TECH_STACK_COL), where("post_id", "==", postId))
    );
    const docsSnap = await getDocs(
      query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
    );

    // 3. 해당 프로젝트에 지원했던 모든 지원서(applicants) 조회
    // ('applicants' 컬렉션 문자열 상수가 project.js에 없다면 직접 "applicants"로 매핑)
    const applicantsSnap = await getDocs(
      query(collection(db, "applicants"), where("post_id", "==", postId))
    );

    // 4. 각 지원서에 매핑되어 있던 지원자 첨부파일(applicant_attachments) 조회 및 담기
    const attachmentPromises = [];
    const applicantDocRefs = [];

    for (const appDoc of applicantsSnap.docs) {
      applicantDocRefs.push(deleteDoc(appDoc.ref)); // 지원서 삭제 등록

      // 각 지원서 ID에 묶인 첨부파일 쿼리
      const appAttachSnap = await getDocs(
        query(
          collection(db, "applicant_attachments"),
          where("applicant_id", "==", appDoc.id)
        )
      );
      appAttachSnap.docs.forEach((attachDoc) => {
        attachmentPromises.push(deleteDoc(attachDoc.ref)); // 지원자 첨부파일 삭제 등록
      });
    }

    // 5. 모든 하위/연관 데이터 병렬 일괄 삭제 실행
    const deletePromises = [
      ...rolesSnap.docs.map((d) => deleteDoc(d.ref)),
      ...techSnap.docs.map((d) => deleteDoc(d.ref)),
      ...docsSnap.docs.map((d) => deleteDoc(d.ref)),
      ...applicantDocRefs,
      ...attachmentPromises,
    ];
    await Promise.all(deletePromises);

    // 6. 최종 메인 프로젝트 다큐먼트 삭제
    await deleteDoc(togetherRef);

    return true;
  } catch (error) {
    console.error("deleteProject 연쇄 삭제 중 에러 발생:", error);
    throw error;
  }
}
