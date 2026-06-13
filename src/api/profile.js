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
const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_REPOSITORY_FETCH_LIMIT = 100;
const GITHUB_LANGUAGE_FETCH_LIMIT = 30;

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

function assertGithubLinked(profileData) {
  if (!profileData.github_login) {
    throw createProfileError("PORT-002-GITHUB-NOT-LINKED", "GitHub 계정 연결이 필요합니다.");
  }
}

function createGithubApiUrl(path) {
  return `${GITHUB_API_BASE_URL}${path}`;
}

async function fetchGithubJson(path) {
  const response = await fetch(createGithubApiUrl(path));

  if (response.status === 403) {
    throw createProfileError(
      "PORT-002-RATE-LIMITED",
      "GitHub 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  if (!response.ok) {
    throw createProfileError(
      "PORT-002-PROVIDER-UNAVAILABLE",
      "GitHub 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  return response.json();
}

function getRepositoryScore(repository) {
  return Number(repository.stargazers_count || 0) + Number(repository.forks_count || 0);
}

function sortRepositoriesForLanguageSync(repositories) {
  return [...repositories].sort((firstRepository, secondRepository) => (
    getRepositoryScore(secondRepository) - getRepositoryScore(firstRepository)
  ));
}

function normalizeLanguageSummary(languageBytes) {
  const totalBytes = Object.values(languageBytes).reduce((total, bytes) => total + bytes, 0);

  if (!totalBytes) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(languageBytes)
      .sort(([, firstBytes], [, secondBytes]) => secondBytes - firstBytes)
      .map(([language, bytes]) => [language, Math.round((bytes / totalBytes) * 100)]),
  );
}

async function fetchGithubLanguages(repositories) {
  const selectedRepositories = sortRepositoriesForLanguageSync(repositories)
    .slice(0, GITHUB_LANGUAGE_FETCH_LIMIT);
  const languageEntries = await Promise.all(
    selectedRepositories.map((repository) => fetchGithubJson(
      `/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/languages`,
    )),
  );

  const languageBytes = languageEntries.reduce((summary, languages) => {
    Object.entries(languages).forEach(([language, bytes]) => {
      summary[language] = (summary[language] || 0) + bytes;
    });

    return summary;
  }, {});

  return normalizeLanguageSummary(languageBytes);
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

export async function syncGithubPortfolio(uid) {
  assertFirebaseConfigured();
  assertAuthenticatedUser(uid, "PORT-002-UNAUTHENTICATED");

  const profile = await getMyProfile(uid);
  assertGithubLinked(profile);

  const githubLogin = encodeURIComponent(profile.github_login);
  const [githubUser, repositories] = await Promise.all([
    fetchGithubJson(`/users/${githubLogin}`),
    fetchGithubJson(
      `/users/${githubLogin}/repos?type=owner&sort=updated&per_page=${GITHUB_REPOSITORY_FETCH_LIMIT}`,
    ),
  ]);
  const publicRepositories = repositories.filter((repository) => !repository.private);
  const languageSummary = await fetchGithubLanguages(publicRepositories);
  const githubStars = publicRepositories.reduce(
    (total, repository) => total + Number(repository.stargazers_count || 0),
    0,
  );
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    github_repositories: Number(githubUser.public_repos || publicRepositories.length || 0),
    github_contributions: Number(profile.github_contributions || 0),
    github_followers: Number(githubUser.followers || 0),
    github_stars: githubStars,
    github_language_json: languageSummary,
    github_synced_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return getMyProfile(uid);
}
