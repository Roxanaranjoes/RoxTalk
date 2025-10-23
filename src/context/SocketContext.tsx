import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage, TypingState, UnreadCountMap } from "../types";
import { useAuth } from "./AuthContext";

type PresenceMap = Record<string, boolean>;
type LatestMessageMap = Record<string, ChatMessage>;

interface SocketContextValue {
  socket: Socket | null;
  onlineUsers: PresenceMap;
  typingState: TypingState;
  unreadCounts: UnreadCountMap;
  latestMessages: LatestMessageMap;
  markConversationAsRead: (userId: string) => void;
  notificationPermission: NotificationPermission;
  isNotificationSupported: boolean;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceMap>({});
  const [typingState, setTypingState] = useState<TypingState>({});
  const [unreadCounts, setUnreadCounts] = useState<UnreadCountMap>({});
  const [latestMessages, setLatestMessages] = useState<LatestMessageMap>({});
  const getInitialNotificationPermission = (): NotificationPermission => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "default";
    }
    return window.Notification.permission;
  };
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => getInitialNotificationPermission());
  const [isNotificationSupported, setIsNotificationSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return "Notification" in window;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const supported = "Notification" in window;
    setIsNotificationSupported(supported);
    if (supported) {
      setNotificationPermission(window.Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined" || !isNotificationSupported) {
      return;
    }
    const syncPermission = () => {
      setNotificationPermission(window.Notification.permission);
    };
    document.addEventListener("visibilitychange", syncPermission);
    return () => {
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, [isNotificationSupported]);

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setIsNotificationSupported(false);
      setNotificationPermission("denied");
      return "denied";
    }
    try {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch {
      setNotificationPermission("denied");
      return "denied";
    }
  }, []);

  const showNativeNotification = useCallback(
    (message: ChatMessage) => {
      if (!user) {
        return;
      }
      if (typeof window === "undefined" || typeof document === "undefined") {
        return;
      }
      if (!isNotificationSupported || notificationPermission !== "granted") {
        return;
      }
      if (message.fromUserId === user._id) {
        return;
      }
      const currentPath = window.location.pathname;
      if (document.visibilityState === "visible" && currentPath === `/chat/${message.fromUserId}`) {
        return;
      }
      const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;
      const trimmedContent = message.content ? message.content.trim() : "";
      const snippet =
        trimmedContent.length > 0
          ? trimmedContent.slice(0, 120)
          : hasAttachments
          ? "Te enviaron una imagen."
          : "Nuevo mensaje para ti.";
      const options: NotificationOptions = {
        body: snippet,
        tag: message._id,
        renotify: false,
        data: { fromUserId: message.fromUserId }
      };
      if (hasAttachments) {
        options.image = message.attachments[0];
      }
      try {
        const notification = new window.Notification("Nuevo mensaje", options);
        notification.onclick = () => {
          window.focus();
          const target = `/chat/${message.fromUserId}`;
          if (window.location.pathname !== target) {
            window.location.href = target;
          }
        };
      } catch (error) {
        console.warn("[notifications] failed to display notification", error);
      }
    },
    [isNotificationSupported, notificationPermission, user]
  );

  useEffect(() => {
    if (!user) {
      setSocket((current) => {
        if (current) {
          current.emit("presence:leave");
          current.disconnect();
        }
        return null;
      });
      setOnlineUsers({});
      setTypingState({});
      setUnreadCounts({});
      setLatestMessages({});
      return;
    }

    const socketUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    const nextSocket = io(socketUrl, { withCredentials: true, query: { userId: user._id } });

    nextSocket.on("connect", () => {
      console.log("[socket] connected", nextSocket.id);
    });

    nextSocket.on("connect_error", (error) => {
      console.error("[socket] connect_error", error.message);
    });

    nextSocket.on("disconnect", (reason) => {
      console.log("[socket] disconnected", reason);
    });
    setSocket(nextSocket);

    const handleUserOnline = (payload: { userId: string }) => {
      setOnlineUsers((previous) => ({ ...previous, [payload.userId]: true }));
    };

    const handleUserOffline = (payload: { userId: string }) => {
      setOnlineUsers((previous) => {
        const updated = { ...previous };
        delete updated[payload.userId];
        return updated;
      });
      setTypingState((previous) => {
        const updated = { ...previous };
        delete updated[payload.userId];
        return updated;
      });
    };

    const handleUserTyping = (payload: { userId: string; isTyping: boolean }) => {
      setTypingState((previous) => ({ ...previous, [payload.userId]: payload.isTyping }));
    };

    const handleNewMessage = (message: ChatMessage) => {
      const normalizedMessage: ChatMessage = { ...message, attachments: message.attachments ?? [] };
      setLatestMessages((previous) => ({ ...previous, [normalizedMessage.roomId]: normalizedMessage }));
      if (normalizedMessage.fromUserId !== user._id) {
        setUnreadCounts((previous) => ({
          ...previous,
          [normalizedMessage.fromUserId]: (previous[normalizedMessage.fromUserId] || 0) + 1
        }));
      }
      showNativeNotification(normalizedMessage);
    };

    nextSocket.on("user:online", handleUserOnline);
    nextSocket.on("user:offline", handleUserOffline);
    nextSocket.on("user:typing", handleUserTyping);
    nextSocket.on("message:new", handleNewMessage);

    nextSocket.emit("presence:join");

    fetch("/api/users/online")
      .then((response) => response.json())
      .then((data: { userIds: string[] }) => {
        const merged = data.userIds.reduce<PresenceMap>((accumulator, id) => {
          accumulator[id] = true;
          return accumulator;
        }, {});
        setOnlineUsers((previous) => ({ ...previous, ...merged }));
      })
      .catch(() => undefined);

    return () => {
      nextSocket.emit("presence:leave");
      nextSocket.off("user:online", handleUserOnline);
      nextSocket.off("user:offline", handleUserOffline);
      nextSocket.off("user:typing", handleUserTyping);
      nextSocket.off("message:new", handleNewMessage);
      nextSocket.off("connect");
      nextSocket.off("connect_error");
      nextSocket.off("disconnect");
      nextSocket.disconnect();
    };
  }, [user, showNativeNotification]);

  const markConversationAsRead = useCallback((userId: string) => {
    setUnreadCounts((previous) => {
      const updated = { ...previous };
      updated[userId] = 0;
      return updated;
    });
  }, []);

  const value: SocketContextValue = useMemo(
    () => ({
      socket,
      onlineUsers,
      typingState,
      unreadCounts,
      latestMessages,
      markConversationAsRead,
      notificationPermission,
      isNotificationSupported,
      requestNotificationPermission
    }),
    [
      socket,
      onlineUsers,
      typingState,
      unreadCounts,
      latestMessages,
      markConversationAsRead,
      notificationPermission,
      isNotificationSupported,
      requestNotificationPermission
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
