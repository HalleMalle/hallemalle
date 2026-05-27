import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  auth,
  githubProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "../api/firebase";
import { generateUsername } from "../utils/random";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase User + Firestore data merged
  const [loading, setLoading] = useState(true);

  // Firestore에서 사용자 추가 정보 로드
  const loadUserProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // 기존 사용자: Firestore 데이터와 Firebase Auth 데이터 병합
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          ...userDoc.data(),
        });
      } else {
        // 신규 사용자: Firestore 문서 생성
        const newUsername = generateUsername();
        const newUser = {
          displayName: firebaseUser.displayName || "",
          username: newUsername,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          githubUsername: firebaseUser.displayName || "",
          bio: "",
          role: "individual",
          availableRoles: [],
          techStack: [],
          availablePeriod: "",
          availableHours: "",
          collaborationScore: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(userDocRef, newUser);

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          ...newUser,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
      });
    }

    setLoading(false);
  }, []);

  // Auth 상태 리스너
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      loadUserProfile(firebaseUser);
    });

    return () => unsubscribe();
  }, [loadUserProfile]);

  // GitHub OAuth 로그인
  const login = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      return result.user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }, []);

  // 사용자 프로필 업데이트
  const updateProfile = useCallback(
    async (updates) => {
      if (!user?.uid) return;

      const userDocRef = doc(db, "users", user.uid);
      const dataToUpdate = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userDocRef, dataToUpdate);

      setUser((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
