import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  db,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
} from "../api/firebase";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const MAX_DROPDOWN = 5;

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(items);
        setLoading(false);
      },
      (error) => {
        console.error("Notifications subscription failed:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const recentNotifications = notifications.slice(0, MAX_DROPDOWN);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((n) =>
          updateDoc(doc(db, "notifications", n.id), { read: true }),
        ),
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        recentNotifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
