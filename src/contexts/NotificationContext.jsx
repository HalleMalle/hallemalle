import { createContext, useContext } from "react";

import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const MAX_DROPDOWN = 5;

export function NotificationProvider({ children }) {
  return (
    <NotificationContext.Provider
      value={{
        // notifications,
        // recentNotifications,
        // unreadCount,
        // loading,
        // markAsRead,
        // markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("message");
  }

  return context;
}
