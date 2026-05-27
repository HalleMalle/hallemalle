import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "../api/firebase";

const COLLECTION = "projects";

export async function fetchProjects(filters = {}) {
  const constraints = [orderBy("createdAt", "desc")];

  if (filters.role) {
    constraints.push(
      where("positions", "array-contains", { role: filters.role }),
    );
  }

  if (filters.status) {
    constraints.push(where("status", "==", filters.status));
  }

  if (filters.creatorId) {
    constraints.push(where("creatorId", "==", filters.creatorId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProject(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createProject(data) {
  const docRef = doc(collection(db, COLLECTION));
  const payload = {
    ...data,
    views: 0,
    status: "recruiting",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, payload);
  return { id: docRef.id, ...payload };
}

export async function updateProject(id, data) {
  const docRef = doc(db, COLLECTION, id);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  return { id, ...payload };
}

export async function deleteProject(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function incrementViews(id) {
  const docRef = doc(db, COLLECTION, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    await updateDoc(docRef, {
      views: (snap.data().views || 0) + 1,
    });
  }
}
