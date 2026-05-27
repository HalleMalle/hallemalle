import {
  db,
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
  serverTimestamp,
} from "./firebase";

// ─── Generic CRUD helpers ───

export async function createDocument(collectionName, data, customId = null) {
  const docRef = customId
    ? doc(db, collectionName, customId)
    : doc(collection(db, collectionName));

  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);
  return { id: docRef.id, ...payload };
}

export async function getDocument(collectionName, id) {
  const docRef = doc(db, collectionName, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateDocument(collectionName, id, data) {
  const docRef = doc(db, collectionName, id);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  return { id, ...payload };
}

export async function deleteDocument(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

export async function queryDocuments(
  collectionName,
  conditions = [],
  orderByField = null,
  limitCount = null,
) {
  let constraints = [];

  conditions.forEach(({ field, operator, value }) => {
    constraints.push(where(field, operator, value));
  });

  if (orderByField) {
    constraints.push(orderBy(orderByField, "desc"));
  }

  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
