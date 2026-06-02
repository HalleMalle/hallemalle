import {
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  collection,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";

const USERNAME_ADJECTIVES = [
  "brave",
  "calm",
  "clever",
  "kind",
  "steady",
  "bright",
  "quick",
  "solid",
];

const USERNAME_NOUNS = [
  "builder",
  "maker",
  "coder",
  "planner",
  "runner",
  "leader",
  "designer",
  "solver",
];

const USERNAME_RETRY_LIMIT = 5;

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateUsername() {
  const adjective = getRandomItem(USERNAME_ADJECTIVES);
  const noun = getRandomItem(USERNAME_NOUNS);
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

  return `${adjective}-${noun}-${suffix}`;
}

function getGithubProviderData(firebaseUser) {
  return firebaseUser.providerData.find((provider) => provider.providerId === "github.com");
}

function toAppUser(firebaseUser, profileData = {}) {
  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    ...profileData,
  };
}

async function isUsernameAvailable(username) {
  const usernameQuery = query(
    collection(db, "users"),
    where("username", "==", username),
    limit(1),
  );
  const snapshot = await getDocs(usernameQuery);

  return snapshot.empty;
}

async function createUniqueUsername() {
  for (let attempt = 0; attempt < USERNAME_RETRY_LIMIT; attempt += 1) {
    const username = generateUsername();

    if (await isUsernameAvailable(username)) {
      return username;
    }
  }

  throw new Error("AUTH-003-USERNAME-FAILED");
}

export async function ensureUserDoc(firebaseUser) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    return toAppUser(firebaseUser, userSnapshot.data());
  }

  const githubProvider = getGithubProviderData(firebaseUser);
  const username = await createUniqueUsername();
  const userData = {
    username,
    profileImageUrl: firebaseUser.photoURL || null,
    githubLinked: true,
    githubUserId: githubProvider?.uid || firebaseUser.uid,
    githubUsername: githubProvider?.displayName || firebaseUser.displayName || username,
    githubEmail: firebaseUser.email || null,
    createdAt: serverTimestamp(),
    isActive: true,
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

  return ensureUserDoc(credential.user);
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
