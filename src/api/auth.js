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
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";

function getGithubProviderData(firebaseUser) {
  return firebaseUser.providerData.find((provider) => provider.providerId === "github.com");
}

function getFallbackGithubLogin(firebaseUser) {
  const githubProvider = getGithubProviderData(firebaseUser);

  return githubProvider?.uid || firebaseUser.uid;
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

export async function ensureUserDoc(firebaseUser, additionalUserInfo = null) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    return toAppUser(firebaseUser, userSnapshot.data());
  }

  const githubLogin = additionalUserInfo?.username || getFallbackGithubLogin(firebaseUser);
  const displayName = firebaseUser.displayName || githubLogin;
  const email = firebaseUser.email || "";
  const userData = {
    github_login: githubLogin,
    display_name: displayName,
    email,
    photo_url: firebaseUser.photoURL || null,
    bio: "",
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
