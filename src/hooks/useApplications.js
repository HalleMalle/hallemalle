import {
  db,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "../api/firebase";

const APP_COLLECTION = "applications";
const NOTIF_COLLECTION = "notifications";

// ─── Create notification ───
export async function createNotification({
  recipientId,
  type,
  title,
  message,
  linkUrl,
}) {
  const ref = doc(collection(db, NOTIF_COLLECTION));
  await setDoc(ref, {
    recipientId,
    type,
    title,
    message,
    linkUrl: linkUrl || "",
    read: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Application CRUD ───

export async function applyToProject({ projectId, applicantId, message = "" }) {
  const existing = query(
    collection(db, APP_COLLECTION),
    where("projectId", "==", projectId),
    where("applicantId", "==", applicantId),
  );
  const snap = await getDocs(existing);
  if (!snap.empty) {
    throw new Error("이미 신청한 프로젝트입니다.");
  }

  const ref = doc(collection(db, APP_COLLECTION));
  const data = {
    projectId,
    applicantId,
    message,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);

  // Get project creatorId
  const projectSnap = await getDoc(doc(db, "projects", projectId));
  const project = projectSnap.data();
  if (project) {
    await createNotification({
      recipientId: project.creatorId,
      type: "apply",
      title: "새로운 신청",
      message: `누군가 "${project.title}"에 신청했습니다.`,
      linkUrl: `/project-list/${projectId}`,
    });
  }

  return { id: ref.id, ...data };
}

export async function fetchApplicationsByProject(projectId) {
  const q = query(
    collection(db, APP_COLLECTION),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchApplicationsByApplicant(applicantId) {
  const q = query(
    collection(db, APP_COLLECTION),
    where("applicantId", "==", applicantId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchApplicationsByCreator(creatorId) {
  // First get all projects by creator
  const projectSnap = await getDocs(
    query(
      collection(db, "projects"),
      where("creatorId", "==", creatorId),
      orderBy("createdAt", "desc"),
    ),
  );
  const projectIds = projectSnap.docs.map((d) => d.id);

  if (projectIds.length === 0) return [];

  // Get applications for all creator's projects
  const appSnap = await getDocs(
    query(
      collection(db, APP_COLLECTION),
      where("projectId", "in", projectIds),
      orderBy("createdAt", "desc"),
    ),
  );
  return appSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateApplicationStatus(applicationId, status) {
  const ref = doc(db, APP_COLLECTION, applicationId);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });

  // Get application details for notification
  const appSnap = await getDoc(ref);
  const appData = appSnap.data();

  if (appData && status !== "pending") {
    const projectSnap = await getDoc(doc(db, "projects", appData.projectId));
    const project = projectSnap.data();

    await createNotification({
      recipientId: appData.applicantId,
      type: status === "approved" ? "approved" : "rejected",
      title: status === "approved" ? "신청 승인" : "신청 반려",
      message: `"${project?.title || ""}"에 대한 신청이 ${status === "approved" ? "승인" : "반려"}되었습니다.`,
      linkUrl: `/project-list/${appData.projectId}`,
    });
  }

  return { id: applicationId, status };
}
