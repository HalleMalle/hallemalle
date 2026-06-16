// togethers, together_roles, together_tech_stack, planning_documents 컬렉션을 다룸

import {
  collection,
  doc,
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

/**
 * ProjectForm의 participationStage 값을 DB 스키마의 participation_stage 값으로 변환
 * planning → plan | development → dev | maintenance → maintain
 */
function toDbStage(formStage) {
  const map = { planning: "plan", development: "dev", maintenance: "maintain" };
  return map[formStage] ?? formStage;
}

/**
 * DB의 participation_stage 값을 ProjectForm의 participationStage 값으로 변환
 */
function toFormStage(dbStage) {
  const map = { plan: "planning", dev: "development", maintain: "maintenance" };
  return map[dbStage] ?? dbStage;
}

/**
 * ProjectForm의 status 값을 DB 스키마의 recruitment_status 값으로 변환
 * recruiting → recruiting | paused → recruiting(그대로) | closed → closed
 * (스키마상 paused 없음 → recruiting 유지)
 */
function toDbStatus(formStatus) {
  if (formStatus === "closed") return "closed";
  return "recruiting";
}

/**
 * Storage에 썸네일 이미지를 업로드하고 다운로드 URL을 반환합니다.
 * @param {File} file
 * @param {string} postId
 * @returns {Promise<string>} downloadURL
 */
async function uploadThumbnail(file, postId) {
  const ext = file.name.split(".").pop();
  const storageRef = ref(storage, `togethers/${postId}/thumbnail.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Storage에 기획 문서를 업로드하고 다운로드 URL을 반환합니다.
 * @param {File} file
 * @param {string} postId
 * @returns {Promise<string>} downloadURL
 */
async function uploadDocument(file, postId) {
  const storageRef = ref(storage, `togethers/${postId}/documents/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// 프로젝트 생성

/**
 * 새 프로젝트를 생성합니다.
 *
 * ProjectForm이 넘기는 data 구조:
 *   title, description, startDate, endDate, headcount,
 *   status, participationStage, positions (role/label/total/current),
 *   contactType, contactValue,
 *   thumbnail (File | null),
 *   attachments ([{ name, file, visibility }])
 *
 * 추가로 ProjectCreate가 붙이는 필드:
 *   creatorId (uid)
 *
 * @param {{ creatorId: string } & object} formData
 * @returns {Promise<{ id: string }>}
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
  } = formData;

  // 1) togethers 문서 생성 (post_id는 Firestore auto-id)
  const togetherRef = await addDoc(collection(db, TOGETHERS_COL), {
    created_by: creatorId,
    title: title.trim(),
    description: description.trim(),
    thumbnail_url: null, // 업로드 후 갱신
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

  const postId = togetherRef.id;

  // 2) 썸네일 업로드
  if (thumbnail instanceof File) {
    const thumbnailUrl = await uploadThumbnail(thumbnail, postId);
    await updateDoc(togetherRef, { thumbnail_url: thumbnailUrl });
  }

  // 3) together_roles 서브 문서 일괄 생성
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

  // 4) planning_documents 서브 문서 일괄 생성
  const docPromises = attachments.map(async ({ file, name, visibility }) => {
    if (!(file instanceof File)) return;
    const fileUrl = await uploadDocument(file, postId);
    return addDoc(collection(db, DOCUMENTS_COL), {
      post_id: postId,
      file_name: name,
      file_url: fileUrl,
      visibility: visibility === "approved" ? "approved_only" : "public",
    });
  });

  await Promise.all([...rolePromises, ...docPromises]);

  return { id: postId };
}

// 프로젝트 수정 (작성자만)

/**
 * 기존 프로젝트를 수정합니다.
 * positions와 attachments는 기존 서브컬렉션을 삭제 후 재생성합니다.
 *
 * @param {string} postId
 * @param {string} currentUserId  - 로그인 유저 uid
 * @param {object} formData       - ProjectForm이 넘기는 data 구조와 동일
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
  } = formData;

  // 1) togethers 문서 갱신
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

  // 2) 새 썸네일이 있으면 업로드
  if (thumbnail instanceof File) {
    const thumbnailUrl = await uploadThumbnail(thumbnail, postId);
    updatePayload.thumbnail_url = thumbnailUrl;
  }

  await updateDoc(togetherRef, updatePayload);

  // 3) together_roles 재구성 (기존 삭제 → 재생성)
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
        filled_count: p.current || 0,
      })
    );

  // 4) planning_documents 재구성 (기존 삭제 → 재생성)
  //    File 인스턴스인 항목만 새로 업로드, 나머지(기존 URL)는 그대로 유지
  const existingDocsSnap = await getDocs(
    query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
  );
  await Promise.all(existingDocsSnap.docs.map((d) => deleteDoc(d.ref)));

  const docPromises = attachments.map(
    async ({ file, name, visibility, url }) => {
      let fileUrl = url || null;
      if (file instanceof File) {
        fileUrl = await uploadDocument(file, postId);
      }
      if (!fileUrl) return;
      return addDoc(collection(db, DOCUMENTS_COL), {
        post_id: postId,
        file_name: name,
        file_url: fileUrl,
        visibility: visibility === "approved" ? "approved_only" : "public",
      });
    }
  );

  await Promise.all([...rolePromises, ...docPromises]);
}

// 프로젝트 삭제 (작성자만)

/**
 * 프로젝트와 연관 서브컬렉션 문서를 모두 삭제합니다.
 *
 * @param {string} postId
 * @param {string} currentUserId
 */
export async function deleteProject(postId, currentUserId) {
  const togetherRef = doc(db, TOGETHERS_COL, postId);
  const snap = await getDoc(togetherRef);

  if (!snap.exists()) throw new Error("프로젝트를 찾을 수 없습니다.");
  if (snap.data().created_by !== currentUserId) {
    throw new Error("삭제 권한이 없습니다.");
  }

  const data = snap.data();

  // 1) Storage 썸네일 삭제 (있을 때만)
  if (data.thumbnail_url) {
    try {
      const thumbRef = ref(storage, data.thumbnail_url);
      await deleteObject(thumbRef);
    } catch {
      // 파일이 없는 경우 무시
    }
  }

  // 2) 서브컬렉션 삭제
  const subCollections = [TOGETHER_ROLES_COL, TECH_STACK_COL, DOCUMENTS_COL];
  await Promise.all(
    subCollections.map(async (col) => {
      const subSnap = await getDocs(
        query(collection(db, col), where("post_id", "==", postId))
      );
      return Promise.all(subSnap.docs.map((d) => deleteDoc(d.ref)));
    })
  );

  // 3) togethers 문서 삭제
  await deleteDoc(togetherRef);
}

// 프로젝트 단건 조회

/**
 * postId로 프로젝트 단건을 조회하고 roles, techStack, documents를 함께 반환합니다.
 *
 * @param {string} postId
 * @returns {Promise<object>}
 */
export async function getProject(postId) {
  const togetherRef = doc(db, TOGETHERS_COL, postId);
  const snap = await getDoc(togetherRef);
  if (!snap.exists()) throw new Error("프로젝트를 찾을 수 없습니다.");

  const data = { post_id: snap.id, ...snap.data() };

  // 서브컬렉션 병렬 조회
  const [rolesSnap, techSnap, docsSnap] = await Promise.all([
    getDocs(
      query(collection(db, TOGETHER_ROLES_COL), where("post_id", "==", postId))
    ),
    getDocs(
      query(collection(db, TECH_STACK_COL), where("post_id", "==", postId))
    ),
    getDocs(
      query(collection(db, DOCUMENTS_COL), where("post_id", "==", postId))
    ),
  ]);

  return {
    ...data,
    // ProjectForm 호환 필드로 변환
    participationStage: toFormStage(data.participation_stage),
    roles: rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    techStack: techSnap.docs.map((d) => d.data().tag),
    documents: docsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

// 프로젝트 리스트 조회

/**
 * 프로젝트 목록을 페이지네이션으로 조회합니다.
 *
 * @param {{
 *   roleFilter?: string,       // together_roles.role_type 필터 (선택)
 *   statusFilter?: string,     // 'recruiting' | 'closed' (선택)
 *   lastDoc?: object,          // 이전 페이지의 마지막 문서 스냅샷 (더보기용)
 * }} options
 * @returns {Promise<{ projects: object[], lastDoc: object | null, hasMore: boolean }>}
 */
export async function getProjectList({
  roleFilter,
  statusFilter,
  lastDoc,
} = {}) {
  let constraints = [orderBy("created_at", "desc"), limit(PAGE_SIZE)];

  if (statusFilter) {
    constraints = [
      where("recruitment_status", "==", statusFilter),
      ...constraints,
    ];
  }

  if (lastDoc) {
    constraints = [...constraints, startAfter(lastDoc)];
  }

  const projectQuery = query(collection(db, TOGETHERS_COL), ...constraints);
  const snap = await getDocs(projectQuery);

  if (snap.empty) {
    return { projects: [], lastDoc: null, hasMore: false };
  }

  // roleFilter가 있을 때 해당 role이 포함된 post_id 집합을 먼저 조회
  let allowedPostIds = null;
  if (roleFilter) {
    const roleSnap = await getDocs(
      query(
        collection(db, TOGETHER_ROLES_COL),
        where("role_type", "==", roleFilter)
      )
    );
    allowedPostIds = new Set(roleSnap.docs.map((d) => d.data().post_id));
  }

  const projects = snap.docs
    .filter((d) => !allowedPostIds || allowedPostIds.has(d.id))
    .map((d) => ({ post_id: d.id, ...d.data() }));

  return {
    projects,
    lastDoc: snap.docs[snap.docs.length - 1],
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}
