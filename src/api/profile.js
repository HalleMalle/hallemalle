import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "./firebase";

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 20;
const BIO_MAX_LENGTH = 200;

function createProfileError(code, message) {
  const error = new Error(message);
  error.code = code;

  return error;
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw createProfileError(
      "PROF-CONFIG-MISSING",
      "Firebase 설정 후 프로필 기능을 사용할 수 있어요.",
    );
  }
}

function assertAuthenticatedUser(uid, code) {
  if (!uid) {
    throw createProfileError(code, "로그인이 필요한 기능입니다.");
  }
}

function normalizeDisplayName(displayName) {
  return String(displayName ?? "").trim();
}

function validateDisplayName(displayName) {
  const normalizedDisplayName = normalizeDisplayName(displayName);

  if (
    normalizedDisplayName.length < DISPLAY_NAME_MIN_LENGTH ||
    normalizedDisplayName.length > DISPLAY_NAME_MAX_LENGTH ||
    /\s/.test(normalizedDisplayName)
  ) {
    throw createProfileError("PROF-002-INVALID-FORMAT", "사용자명 형식을 확인해주세요.");
  }

  return normalizedDisplayName;
}

function normalizeBio(bio) {
  return String(bio ?? "").trim();
}

function validateBio(bio) {
  const normalizedBio = normalizeBio(bio);

  if (normalizedBio.length > BIO_MAX_LENGTH) {
    throw createProfileError("PROF-003-INVALID-BIO", "소개는 200자 이내로 입력해주세요.");
  }

  return normalizedBio;
}

function toProfile(uid, profileData) {
  return {
    uid,
    ...profileData,
    displayName: profileData.display_name || "",
    photoURL: profileData.photo_url || "",
  };
}

export async function getMyProfile(uid) {
  assertFirebaseConfigured();
  assertAuthenticatedUser(uid, "PROF-001-UNAUTHENTICATED");

  const userRef = doc(db, "users", uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw createProfileError("PROF-001-NOT-FOUND", "프로필 정보를 찾을 수 없습니다.");
  }

  return toProfile(uid, userSnapshot.data());
}

export async function updateProfile(uid, profile) {
  assertFirebaseConfigured();
  assertAuthenticatedUser(uid, "PROF-002-UNAUTHENTICATED");

  const nextDisplayName = validateDisplayName(profile?.displayName);
  const nextBio = validateBio(profile?.bio);
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    display_name: nextDisplayName,
    bio: nextBio,
    updated_at: serverTimestamp(),
  });

  return getMyProfile(uid);
}
