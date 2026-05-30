import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  signInWithGithub,
  signOut as signOutFromFirebase,
  subscribeToAuthState,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeToAuthState(
      (nextUser) => {
        if (!isMounted) {
          return;
        }

        setUser(nextUser);
        setLoading(false);
      },
      () => {
        if (!isMounted) {
          return;
        }

        setUser(null);
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    const nextUser = await signInWithGithub();
    setUser(nextUser);
    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    await signOutFromFirebase();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      isAuthenticated: Boolean(user),
    }),
    [loading, signIn, signOut, user],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
