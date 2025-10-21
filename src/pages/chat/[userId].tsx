import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import type { ChatMessage, User } from "../../types";
import { Modal } from "../../components/ui/Modal";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Toast } from "../../components/Toast";
import { buildRoomId } from "../../lib/rooms";

const ChatThreadPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { socket, typingState, markConversationAsRead } = useSocket();
  const { userId } = router.query;
  const partnerId = typeof userId === "string" ? userId : "";

  const [partner, setPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [toastVariant, setToastVariant] = useState<"info" | "success" | "error">("info");
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState<boolean>(false);
  const [typingTimeoutId, setTypingTimeoutId] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

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
      markConversationAsRead(partnerId);
    } catch {
      setToastVariant("error");
      setToastMessage("Something went wrong while loading your conversation.");
      setMessages([]);
    }
  }, [user, partnerId, markConversationAsRead]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
        attachments: [],
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

  const openPartnerModal = (): void => {
    if (partner) {
      setIsPartnerModalOpen(true);
    }
  };

  const closePartnerModal = (): void => {
    setIsPartnerModalOpen(false);
  };

  const remoteTyping = partnerId ? Boolean(typingState[partnerId]) : false;

  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 py-6 md:px-12 md:py-10">
      <header className="flex flex-col items-start gap-3 rounded-3xl border border-sky-200/60 bg-gradient-to-r from-white/85 to-[#f1f4ff]/70 px-6 py-6 text-[#6b7598] md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-4">
          <Avatar
            name={partner?.name || "RoxTalk User"}
            imageUrl={partner?.avatar}
            isOnline={Boolean(partnerId && typingState[partnerId] !== undefined)}
            sizeClass="h-16 w-16"
          />
          <div>
            <h1 className="text-2xl font-semibold text-[var(--rt-foreground)]">{partner?.name || "Cargando..."}</h1>
            <p className="text-sm text-[#6f7a9c]">{partner?.email || "Recopilando informacion de contacto..."}</p>
            {partner?.location ? (
              <p className="text-xs text-[#7a809c]">{partner.location}</p>
            ) : null}
            {partner?.bio ? (
              <p className="mt-2 text-xs text-[#6f7a9c]">{partner.bio}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6f7a9c]">{remoteTyping ? "Tu contacto esta escribiendo..." : "Los mensajes llegan en tiempo real."}</span>
          <Button variant="secondary" onClick={openPartnerModal}>
            Ver perfil
          </Button>
          <Button variant="ghost" onClick={() => router.push("/chat")}>
            Volver a chats
          </Button>
        </div>
      </header>
      {partner && isPartnerModalOpen ? (
        <Modal
          title={partner.name}
          description="Detalles del perfil"
          onClose={closePartnerModal}
          onCancel={closePartnerModal}
          onSave={closePartnerModal}
          isSaving={false}
          isSaveDisabled={false}
          isCancelDisabled={false}
          saveLabel="Cerrar"
          cancelLabel="Cerrar"
        >
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
            <Avatar name={partner.name} imageUrl={partner.avatar} sizeClass="h-24 w-24" />
            <div className="space-y-2 text-sm text-[#4b5375]">
              <p><strong>Correo:</strong> {partner.email}</p>
              <p><strong>Ubicacion:</strong> {partner.location || "Sin informacion"}</p>
              <p><strong>Biografia:</strong> {partner.bio || "Sin informacion"}</p>
              <p className="text-xs text-[#7a809c]">Miembro desde {partner.createdAt ? new Date(partner.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "Sin fecha"}</p>
            </div>
          </div>
        </Modal>
      ) : null}

      {toastMessage ? (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      ) : null}
      <Card className="glass-panel flex h-[60vh] flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 scrollbar-thin">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-[#7a809c]">Aqui veras la conversacion en cuanto envies un mensaje.</p>
          ) : null}
          {messages.map((message) => {
            const isOwnMessage = user ? message.fromUserId === user._id : false;
            return (
              <div key={message._id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
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
              placeholder="Escribe algo amable..."
              value={messageInput}
              onChange={handleMessageChange}
              className="flex-1"
            />
            <Button type="submit" variant="primary" isLoading={isSending} disabled={messageInput.trim().length === 0} className="min-w-28">
              Enviar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChatThreadPage;
