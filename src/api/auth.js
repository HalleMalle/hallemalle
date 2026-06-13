import {
  getAdditionalUserInfo,
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";

function getGithubProviderData(firebaseUser) {
  return firebaseUser.providerData.find((provider) => provider.providerId === "github.com");
}

function getGithubProfile(additionalUserInfo) {
  return additionalUserInfo?.profile || {};
}

function getFallbackGithubId(firebaseUser) {
  const githubProvider = getGithubProviderData(firebaseUser);

  return githubProvider?.uid || firebaseUser.uid;
}

function normalizeGithubId(githubId) {
  const numericGithubId = Number(githubId);

  return Number.isSafeInteger(numericGithubId) ? numericGithubId : githubId;
}

function getGithubLogin(firebaseUser, additionalUserInfo) {
  const githubProfile = getGithubProfile(additionalUserInfo);

  return (
    githubProfile.login ||
    additionalUserInfo?.username ||
    firebaseUser.reloadUserInfo?.screenName ||
    firebaseUser.displayName ||
    firebaseUser.uid
  );
}

function getGithubId(firebaseUser, additionalUserInfo) {
  const githubProfile = getGithubProfile(additionalUserInfo);

  return normalizeGithubId(githubProfile.id || getFallbackGithubId(firebaseUser));
}

function toAppUser(firebaseUser, profileData = {}) {
  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    ...profileData,
    email: profileData.email || firebaseUser.email || "",
    displayName: profileData.display_name || firebaseUser.displayName || "",
    photoURL: profileData.photo_url || firebaseUser.photoURL || "",
  };
}

async function syncGithubIdentity(userRef, firebaseUser, additionalUserInfo, profileData) {
  if (!additionalUserInfo?.profile) {
    return profileData;
  }

  const githubLogin = getGithubLogin(firebaseUser, additionalUserInfo);
  const githubId = getGithubId(firebaseUser, additionalUserInfo);

  if (profileData.github_login === githubLogin && profileData.github_id === githubId) {
    return profileData;
  }

  const nextProfileData = {
    ...profileData,
    github_login: githubLogin,
    github_id: githubId,
    updated_at: serverTimestamp(),
  };

  await updateDoc(userRef, {
    github_login: githubLogin,
    github_id: githubId,
    updated_at: serverTimestamp(),
  });

  return nextProfileData;
}

export async function ensureUserDoc(firebaseUser, additionalUserInfo = null) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    const profileData = await syncGithubIdentity(
      userRef,
      firebaseUser,
      additionalUserInfo,
      userSnapshot.data(),
    );

    return toAppUser(firebaseUser, profileData);
  }

  const githubLogin = getGithubLogin(firebaseUser, additionalUserInfo);
  const githubId = getGithubId(firebaseUser, additionalUserInfo);
  const githubProfile = getGithubProfile(additionalUserInfo);
  const displayName = firebaseUser.displayName || githubLogin;
  const email = firebaseUser.email || "";
  const userData = {
    github_login: githubLogin,
    github_id: githubId,
    display_name: displayName,
    email,
    photo_url: firebaseUser.photoURL || null,
    bio: githubProfile.bio || "",
    collaboration_score: 10.0,
    tier: "bronze",
    tier_detail: 1,
    github_repositories: 0,
    github_contributions: 0,
    github_followers: 0,
    github_stars: 0,
    github_language_json: {},
    github_synced_at: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(userRef, userData);

  return toAppUser(firebaseUser, userData);
}

export async function signInWithGithub() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase 설정 후 GitHub 로그인을 사용할 수 있어요.");
  }

  const provider = new GithubAuthProvider();
  provider.addScope("read:user");
  provider.addScope("user:email");

  const credential = await signInWithPopup(auth, provider);

  return ensureUserDoc(credential.user, getAdditionalUserInfo(credential));
}

export function subscribeToAuthState(onChange, onError) {
  if (!isFirebaseConfigured) {
    onChange(null);
    return () => {};
  }

  return onAuthStateChanged(
    auth,
    async (firebaseUser) => {
      if (!firebaseUser) {
        onChange(null);
        return;
      }

      const appUser = await ensureUserDoc(firebaseUser);
      onChange(appUser);
    },
    onError,
  );
}

export function signOut() {
  return firebaseSignOut(auth);
}
