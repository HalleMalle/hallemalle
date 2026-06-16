// togethers, together_roles, together_tech_stack, planning_documents 컬렉션을 다룹니다.

import {
  collection,
  doc,
  setDoc,
  addDoc,
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { db, storage } from "./firebase";

// 상수
const TOGETHERS_COL = "togethers";
const TOGETHER_ROLES_COL = "together_roles";
const TECH_STACK_COL = "together_tech_stack";
const DOCUMENTS_COL = "planning_documents";

const PAGE_SIZE = 12;

// 내부 유틸
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

async function uploadThumbnail(file, postId) {
  const storageRef = ref(storage, `togethers/${postId}/thumbnail_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

async function uploadDocument(file, postId) {
  const storageRef = ref(storage, `togethers/${postId}/documents/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * 프로젝트 신규 생성 (with Roles, Documents, Tech Stack)
 */
export async function createProject(formData) {
  const {
    creatorId,
    title,
    description,
    startDate,
    endDate,
    headcount,
    status,
    participationStage,
    positions = [],
    contactType,
    contactValue,
    thumbnail,
    attachments = [],
    techStack = [],
  } = formData;

  const togetherRef = doc(collection(db, TOGETHERS_COL));
  const postId = togetherRef.id;

  // 1) togethers 기본 문서 세팅
  await setDoc(togetherRef, {
    post_id: postId,
    created_by: creatorId,
    title: title.trim(),
    description: description.trim(),
    thumbnail_url: null,
    recruitment_status: toDbStatus(status),
    participation_stage: toDbStage(participationStage),
    recruitment_start: startDate || null,
    recruitment_end: endDate || null,
    total_headcount: headcount ?? 2,
    current_member_count: 0,
    contact_type: contactType,
    contact_value: contactValue.trim(),
    view_count: 0,
    is_private: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // 썸네일 업로드 처리
  if (thumbnail instanceof File) {
    const thumbnailUrl = await uploadThumbnail(thumbnail, postId);
    await updateDoc(togetherRef, { thumbnail_url: thumbnailUrl });
  }

  // 2) 모집 포지션 배열 빌드
  const rolePromises = positions
    .filter((p) => p.total > 0)
    .map((p) =>
      addDoc(collection(db, TOGETHER_ROLES_COL), {
        post_id: postId,
        role_type: p.role,
        headcount: p.total,
        filled_count: 0,
      })
    );

  // 3) 기획 문서 파일 업로드 및 레코드 배열 빌드
  const docPromises = attachments.map(async ({ file, name, visibility }) => {
    if (!(file instanceof File)) return null;
    const fileUrl = await uploadDocument(file, postId);
    return addDoc(collection(db, DOCUMENTS_COL), {
      post_id: postId,
      file_name: name,
      file_url: fileUrl,
      visibility: visibility === "approved_only" ? "approved_only" : "public",
    });
  });

  // 4) 💡 [버그 교정] undefined 유발 map 구문을 거르고 안전하게 프로미스 배열 확보
  const validTechStack = techStack.filter(
    (tag) => typeof tag === "string" && tag.trim() !== ""
  );
  const techPromises = validTechStack.map((tag) =>
    addDoc(collection(db, TECH_STACK_COL), {
      post_id: postId,
      tag: tag.trim(),
    })
  );

  // 5) 비동기 배열 일괄 해제 실행 전 null 이나 undefined 인 찌꺼기들 깔끔하게 쳐내기
  const allPromises = [...rolePromises, ...docPromises, ...techPromises].filter(
    Boolean
  );
  await Promise.all(allPromises);

  return { id: postId };
}

/**
 * 프로젝트 수정 (기존 연관 서브 데이터 일괄 삭제 후 재생성 패턴)
 */
export async function updateProject(postId, currentUserId, formData) {
  const togetherRef = doc(db, TOGETHERS_COL, postId);
  const snap = await getDoc(togetherRef);

  if (!snap.exists()) throw new Error("프로젝트를 찾을 수 없습니다.");
  if (snap.data().created_by !== currentUserId) {
    throw new Error("수정 권한이 없습니다.");
  }

  const {
    title,
    description,
    startDate,
    endDate,
    headcount,
    status,
    participationStage,
    positions = [],
    contactType,
    contactValue,
    thumbnail,
    attachments = [],
    techStack = [],
  } = formData;

  const updatePayload = {
    title: title.trim(),
    description: description.trim(),
    recruitment_status: toDbStatus(status),
    participation_stage: toDbStage(participationStage),
    recruitment_start: startDate || null,
    recruitment_end: endDate || null,
    total_headcount: headcount ?? 2,
    contact_type: contactType,
    contact_value: contactValue.trim(),
    updated_at: serverTimestamp(),
  };

  if (thumbnail instanceof File) {
    const thumbnailUrl = await uploadThumbnail(thumbnail, postId);
    updatePayload.thumbnail_url = thumbnailUrl;
  }

  await updateDoc(togetherRef, updatePayload);

  // 1) 기존 포지션 제거 후 재생성
  const existingRolesSnap = await getDocs(
    query(collection(db, TOGETHER_ROLES_COL), where("post_id", "==", postId))
  );
  await Promise.all(existingRolesSnap.docs.map((d) => deleteDoc(d.ref)));

  const rolePromises = positions
    .filter((p) => p.total > 0)
    .map((p) =>
      addDoc(collection(db, TOGETHER_ROLES_COL), {
        post_id: postId,
        role_type: p.role,
        headcount: p.total,
        filled_count: 0,
      })
    );

  // 2) 기존 기획문서 제거 후 재생성
  const existingDocsSnap = await getDocs(
    query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
  );
  await Promise.all(
    existingDocsSnap.docs.map(async (d) => {
      const data = d.data();
      if (data.file_url) {
        try {
          const fileRef = ref(storage, data.file_url);
          await deleteObject(fileRef);
        } catch (e) {
          console.warn("기존 파일 삭제 실패 (무시 가능):", e);
        }
      }
      await deleteDoc(d.ref);
    })
  );

  const docPromises = attachments.map(
    async ({ file, name, visibility, url }) => {
      if (!file && url) {
        return addDoc(collection(db, DOCUMENTS_COL), {
          post_id: postId,
          file_name: name,
          file_url: url,
          visibility,
        });
      }
      if (file instanceof File) {
        const fileUrl = await uploadDocument(file, postId);
        return addDoc(collection(db, DOCUMENTS_COL), {
          post_id: postId,
          file_name: name,
          file_url: fileUrl,
          visibility,
        });
      }
      return null;
    }
  );

  // 3) 기존 스택 제거 후 재생성
  const existingTechSnap = await getDocs(
    query(collection(db, TECH_STACK_COL), where("post_id", "==", postId))
  );
  await Promise.all(existingTechSnap.docs.map((d) => deleteDoc(d.ref)));

  const validTechStack = techStack.filter(
    (tag) => typeof tag === "string" && tag.trim() !== ""
  );
  const techPromises = validTechStack.map((tag) =>
    addDoc(collection(db, TECH_STACK_COL), {
      post_id: postId,
      tag: tag.trim(),
    })
  );

  const allPromises = [...rolePromises, ...docPromises, ...techPromises].filter(
    Boolean
  );
  await Promise.all(allPromises);
}

/**
 * 단건 프로젝트 및 매핑 데이터 병합 조회 (Detail용)
 */
export async function getProject(postId) {
  const togetherRef = doc(db, TOGETHERS_COL, postId);
  const togetherSnap = await getDoc(togetherRef);

  if (!togetherSnap.exists()) {
    return null;
  }

  const togetherData = togetherSnap.data();

  // 하위 연관 데이터 세트 가져오기
  const rolesSnap = await getDocs(
    query(collection(db, TOGETHER_ROLES_COL), where("post_id", "==", postId))
  );
  const techSnap = await getDocs(
    query(collection(db, TECH_STACK_COL), where("post_id", "==", postId))
  );
  const docsSnap = await getDocs(
    query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
  );

  const roles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const techStack = techSnap.docs.map((d) => d.data().tag);
  const documents = docsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    ...togetherData,
    roles,
    techStack,
    documents,
  };
}

/**
 * 프로젝트 목록 전체 조회 (Firestore 쿼리 순서 제약 조건 완벽 수정 버전)
 */
export async function getProjectList({
  roleFilter,
  statusFilter,
  lastDoc,
} = {}) {
  // 1. 순서 정렬을 위해 기본 필터(where)와 정렬/제한(order/limit) 분리 빌드
  let baseFilters = [where("is_private", "==", false)];
  let pageConstraints = [orderBy("created_at", "desc"), limit(PAGE_SIZE)];

  // statusFilter가 안전한 문자열일 때만 필터(where) 목록 맨 앞에 추가
  if (
    statusFilter &&
    typeof statusFilter === "string" &&
    statusFilter.trim() !== ""
  ) {
    baseFilters.push(where("recruitment_status", "==", statusFilter.trim()));
  }

  // 페이징 스냅샷이 있을 때만 추가
  if (lastDoc) {
    pageConstraints.push(startAfter(lastDoc));
  }

  // 🔥 [핵심 교정] 모든 where 절이 orderBy, limit보다 무조건 앞으로 오도록 순서 보장 조합
  const finalConstraints = [...baseFilters, ...pageConstraints];

  const projectQuery = query(
    collection(db, TOGETHERS_COL),
    ...finalConstraints
  );
  const snap = await getDocs(projectQuery);

  if (snap.empty) {
    return { projects: [], lastDoc: null, hasMore: false };
  }

  // roleFilter가 있을 때 해당 role이 포함된 post_id 집합을 먼저 조회
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

    // 역할 필터가 켜져 있는데 일치하는 post_id 결과 목록에 없다면 스킵
    if (allowedPostIds && !allowedPostIds.has(targetPostId)) {
      continue;
    }

    if (!targetPostId) continue;

    // 연관된 파트(역할) 데이터 병합 조인
    const rolesSnap = await getDocs(
      query(
        collection(db, TOGETHER_ROLES_COL),
        where("post_id", "==", targetPostId)
      )
    );
    // 연관된 기술 스택 데이터 병합 조인
    const techSnap = await getDocs(
      query(
        collection(db, TECH_STACK_COL),
        where("post_id", "==", targetPostId)
      )
    );

    projects.push({
      ...pData,
      post_id: targetPostId,
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
