import { createContext, useContext } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider
      value={{
        // user,
        // loading,
        // login,
        // logout,
        // updateProfile,
        // isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("message");
  }
  
  return context;
}
