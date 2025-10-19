

// This line imports React plus the state and effect hooks needed for page logic.
import React, { useCallback, useEffect, useState } from "react";

// This line imports the Next.js router so we can access the dynamic route parameter and navigate.
import { useRouter } from "next/router";

// This line imports the authentication context to verify the current session.
import { useAuth } from "../../context/AuthContext";

// This line imports the socket context that provides the live Socket.IO connection and helpers.
import { useSocket } from "../../context/SocketContext";

// This line imports the Card component used to wrap the chat UI in a glassy panel.
import { Card } from "../../components/ui/Card";

// This line imports the Input component used for the message composer.
import { Input } from "../../components/ui/Input";

// This line imports the Button component used to send messages.
import { Button } from "../../components/ui/Button";

// This line imports the Avatar component for showing the conversation partner.
import { Avatar } from "../../components/ui/Avatar";

// This line imports the Toast component to surface errors encountered on the page.
import { Toast } from "../../components/Toast";

// This line imports the shared ChatMessage and User types for strongly typed state.
import type { ChatMessage, User } from "../../types";

// This line imports the helper that produces deterministic room identifiers.
import { buildRoomId } from "../../lib/rooms";

// This line defines the ChatThreadPage component for direct messages.
const ChatThreadPage: React.FC = () => {
  // This line acquires the router to read the dynamic route parameter and navigate on logout.
  const router = useRouter();
  // This line destructures auth state from the authentication context.
  const { user, isLoading } = useAuth();
  // This line pulls the socket connection and helper functions from the socket context.
  const { socket, typingState, markConversationAsRead } = useSocket();
  // This line extracts the userId string from the route query.
  const { userId } = router.query;
  const partnerId = typeof userId === "string" ? userId : "";
  // This line stores the conversation partner's user record.
  const [partner, setPartner] = useState<User | null>(null);
  // This line stores the array of chat messages displayed in the thread.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // This line stores the current message draft typed by the user.
  const [messageInput, setMessageInput] = useState<string>("");
  // This line stores whether the form is currently sending a message.
  const [isSending, setIsSending] = useState<boolean>(false);
  // This line stores the toast message for error feedback.
  const [toastMessage, setToastMessage] = useState<string>("");
  // This line stores the toast variant to control styling.
  const [toastVariant, setToastVariant] = useState<"info" | "success" | "error">("info");
  // This line stores the timeout identifier used to debounce typing stop events.
  const [typingTimeoutId, setTypingTimeoutId] = useState<number | null>(null);
  // This line redirects unauthenticated visitors back to the login page.
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);
  // This line fetches the partner information using the existing users list endpoint.
  useEffect(() => {
    if (!partnerId) {
      return;
    }
    const fetchPartner = async (): Promise<void> => {
      try {
        const response = await fetch("/api/users/list", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load users");
        }
        const data: { success: boolean; data?: User[]; error?: string } = await response.json();
        if (!data.success || !data.data) {
          setPartner(null);
          setToastVariant("error");
          setToastMessage(data.error || "Unable to load your chat partner.");
          return;
        }
        const found = data.data.find((candidate) => candidate._id === partnerId) || null;
        setPartner(found);
        setToastMessage("");
      } catch {
        setPartner(null);
        setToastVariant("error");
        setToastMessage("An unexpected error occurred while loading your chat partner.");
      }
    };
    fetchPartner();
  }, [partnerId]);
  // This line loads the conversation history from the server.
  const loadHistory = useCallback(async () => {
    if (!user || !partnerId) {
      return;
    }
    try {
      const response = await fetch(`/api/messages/history?userId=${encodeURIComponent(partnerId)}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }
      const data: { success: boolean; data?: ChatMessage[]; error?: string } = await response.json();
      if (!data.success || !data.data) {
        setToastVariant("error");
        setToastMessage(data.error || "We could not load this conversation.");
        setMessages([]);
      } else {
        setMessages(data.data);
        setToastMessage("");
      }
    } catch {
      setToastVariant("error");
      setToastMessage("Something went wrong while loading your conversation.");
      setMessages([]);
    }
    markConversationAsRead(partnerId);
  }, [user, partnerId, markConversationAsRead]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!partnerId) {
      return;
    }
    const fetchPartner = async (): Promise<void> => {
      try {
        const response = await fetch("/api/users/list", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load users");
        }
        if (!response.ok) {
          throw new Error("Failed to load users");
        }
        const data: { success: boolean; data?: User[]; error?: string } = await response.json();
        if (!data.success || !data.data) {
          setPartner(null);
          setToastVariant("error");
          setToastMessage(data.error || "Unable to load your chat partner.");
          return;
        }
        const found = data.data.find((candidate) => candidate._id === partnerId) || null;
        setPartner(found);
        setToastMessage("");
      } catch {
        setPartner(null);
        setToastVariant("error");
        setToastMessage("An unexpected error occurred while loading your chat partner.");
      }
    };
    fetchPartner();
  }, [partnerId]);

  useEffect(() => {
    if (!user || !partnerId) {
      return;
    }
    markConversationAsRead(partnerId);
  }, [user, partnerId, markConversationAsRead]);
  // This line subscribes to socket events and joins the room for the conversation.
  useEffect(() => {
    if (!socket || !user || !partnerId) {
      return;
    }
    const roomId = buildRoomId(user._id, partnerId);
    socket.emit("room:join", { otherUserId: partnerId });
    const handleIncomingMessage = (message: ChatMessage): void => {
      if (message.roomId !== roomId) {
        return;
      }
      setMessages((previous) => [...previous, message]);
      markConversationAsRead(partnerId);
    };
    socket.on("message:new", handleIncomingMessage);
    return () => {
      socket.emit("room:leave", { otherUserId: partnerId });
      socket.off("message:new", handleIncomingMessage);
    };
  }, [socket, user, partnerId, markConversationAsRead]);
  // This line automatically scrolls to the bottom whenever messages change.
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const anchor = document.getElementById("message-end-anchor");
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  // This line handles updates to the message composer input.
  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setMessageInput(value);
    if (!socket || !partnerId) {
      return;
    }
    if (typingTimeoutId) {
      window.clearTimeout(typingTimeoutId);
      setTypingTimeoutId(null);
    }
    if (value.trim().length > 0) {
      socket.emit("typing:start", { userId: partnerId, isTyping: true });
      const timeoutId = window.setTimeout(() => {
        socket.emit("typing:stop", { userId: partnerId, isTyping: false });
        setTypingTimeoutId(null);
      }, 1500);
      setTypingTimeoutId(timeoutId);
    } else {
      socket.emit("typing:stop", { userId: partnerId, isTyping: false });
    }
  };
  // This line handles form submission to send a message through Socket.IO.
  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!socket || !user || !partner || messageInput.trim().length === 0) {
      return;
    }
    try {
      setIsSending(true);
      const trimmedContent = messageInput.trim();
      const optimisticMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        fromUserId: user._id,
        toUserId: partner._id,
        content: trimmedContent,
        roomId: buildRoomId(user._id, partner._id),
        createdAt: new Date().toISOString()
      };
      setMessages((previous) => [...previous, optimisticMessage]);
      setMessageInput("");
      socket.emit("message:send", { fromUserId: user._id, toUserId: partner._id, content: trimmedContent });
      socket.emit("typing:stop", { userId: partner._id, isTyping: false });
      if (typingTimeoutId) {
        window.clearTimeout(typingTimeoutId);
        setTypingTimeoutId(null);
      }
      await loadHistory();
    } finally {
      setIsSending(false);
    }
  };
  // This line determines whether the remote user is currently typing based on socket state.
  const remoteTyping = partnerId ? Boolean(typingState[partnerId]) : false;
  // This line renders the conversation UI.
  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 py-6 md:px-12 md:py-10">
      <header className="flex flex-col items-start gap-3 rounded-3xl border border-sky-200/60 bg-gradient-to-r from-white/85 to-[#f1f4ff]/70 px-6 py-6 text-[#6b7598] md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-4">
          <Avatar name={partner?.name || "RoxTalk User"} isOnline={Boolean(partnerId && typingState[partnerId] !== undefined)} sizeClass="h-16 w-16" />
          <div>
            <h1 className="text-2xl font-semibold text-[var(--rt-foreground)]">{partner?.name || "Cargando…"}</h1>
            <p className="text-sm text-[#6f7a9c]">{partner?.email || "Recopilando información de contacto…"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6f7a9c]">{remoteTyping ? "Tu contacto está escribiendo…" : "Los mensajes llegan en tiempo real."}</span>
          <Button variant="ghost" onClick={() => router.push("/chat")}>
            Volver a chats
          </Button>
        </div>
      </header>
      {toastMessage ? (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      ) : null}
      <Card className="glass-panel flex h-[60vh] flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 scrollbar-thin">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-[#7a809c]">Aquí verás la conversación en cuanto envíes un mensaje.</p>
          ) : null}
          {messages.map((message) => {
            const isOwnMessage = user ? message.fromUserId === user._id : false;
            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[70%] rounded-3xl px-5 py-3 text-sm leading-relaxed shadow-lg shadow-[rgba(169,184,209,0.25)] ${isOwnMessage ? "bg-gradient-to-r from-[#c7d2fe] to-[#f5cdfa] text-[var(--rt-foreground)]" : "bg-white/85 text-[var(--rt-foreground)] border border-[#dbe1f7]"}`}>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <span className="mt-2 block text-right text-xs text-[#8a93b8]">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            );
          })}
          <div id="message-end-anchor" />
        </div>
        <form className="border-t border-[#dbe1f7] bg-white/80 px-6 py-4 backdrop-blur" onSubmit={handleSendMessage}>
          <div className="flex items-end gap-4">
            <Input
              label="Mensaje"
              placeholder="Escribe algo amable…"
              value={messageInput}
              onChange={handleMessageChange}
              className="flex-1"
            />
            <Button type="submit" variant="primary" isLoading={isSending} disabled={messageInput.trim().length === 0} className="min-w-28">Enviar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// This line exports the ChatThreadPage component as the default export for /chat/[userId].
export default ChatThreadPage;
