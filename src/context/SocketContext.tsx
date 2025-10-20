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
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceMap>({});
  const [typingState, setTypingState] = useState<TypingState>({});
  const [unreadCounts, setUnreadCounts] = useState<UnreadCountMap>({});
  const [latestMessages, setLatestMessages] = useState<LatestMessageMap>({});

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
      setLatestMessages((previous) => ({ ...previous, [message.roomId]: message }));
      if (message.fromUserId !== user._id) {
        setUnreadCounts((previous) => ({
          ...previous,
          [message.fromUserId]: (previous[message.fromUserId] || 0) + 1
        }));
      }
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
  }, [user]);

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
      markConversationAsRead
    }),
    [socket, onlineUsers, typingState, unreadCounts, latestMessages, markConversationAsRead]
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
