import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getNotifications,
  markAllAsRead as requestMarkAllAsRead,
  markAsRead as requestMarkAsRead,
} from "@/api/notifications";

import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const MAX_DROPDOWN = 5;

// F-NOTI-001/002: 로그인 사용자의 알림 목록을 로드하고, 미확인 수·읽음 처리를
// 헤더 뱃지/드롭다운/알림 페이지가 공유하도록 전역으로 제공한다.
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!uid) {
      setNotifications([]);
      return;
    }

    setLoading(true);

    try {
      const next = await getNotifications(uid);
      setNotifications(next);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      if (!uid) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const next = await getNotifications(uid);

        if (isMounted) {
          setNotifications(next);
        }
      } catch {
        if (isMounted) {
          setNotifications([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [uid]);

  // 읽음 처리(클릭 시). 낙관적으로 갱신하고 실패 시 서버 기준으로 재조회한다.
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!uid || !notificationId) {
        return;
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      );

      try {
        await requestMarkAsRead({ uid, notificationId });
      } catch {
        load();
      }
    },
    [uid, load],
  );

  const markAllAsRead = useCallback(async () => {
    if (!uid) {
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true })),
    );

    try {
      await requestMarkAllAsRead(uid);
    } catch {
      load();
    }
  }, [uid, load]);

  const value = useMemo(() => {
    const unreadCount = notifications.filter(
      (notification) => !notification.isRead,
    ).length;

    return {
      notifications,
      recentNotifications: notifications.slice(0, MAX_DROPDOWN),
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      reload: load,
    };
  }, [notifications, loading, markAsRead, markAllAsRead, load]);

  return (
    <NotificationContext.Provider value={value}>
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
