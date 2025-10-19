import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import type { User } from "../../types";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const ChatLobbyPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { onlineUsers, unreadCounts, typingState, latestMessages, markConversationAsRead, socket } = useSocket();

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const fetchUsers = async (): Promise<void> => {
      try {
        setIsFetching(true);
        const response = await fetch("/api/users/list");
        const data: { success: boolean; data?: User[]; error?: string } = await response.json();
        if (!data.success || !data.data) {
          setUsers([]);
          setErrorMessage(data.error || "Unable to load users at this time.");
        } else {
          setUsers(data.data);
          setErrorMessage("");
        }
      } catch {
        setUsers([]);
        setErrorMessage("An unexpected error occurred while loading users.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) {
      return;
    }
    socket.emit("presence:join");
  }, [socket, user]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users
      .filter((candidate) => candidate._id !== user?._id)
      .filter((candidate) => candidate.name.toLowerCase().includes(query) || candidate.email.toLowerCase().includes(query));
  }, [users, user?._id, searchTerm]);

  const handleOpenConversation = (selectedUserId: string) => {
    markConversationAsRead(selectedUserId);
    router.push(`/chat/${selectedUserId}`);
  };

  return (
    <div className="flex min-h-screen flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-[var(--rt-foreground)]">Tus conversaciones</h1>
          <p className="text-sm text-[#6f7a9c]">Encuentra a tus contactos y retoma los mensajes pendientes sin complicaciones.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            label="Search for people"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="md:w-80"
          />
          <Button variant="ghost" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      <Card className="glass-panel space-y-4 p-0">
        <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-white/90 to-white/70 px-8 py-6 text-[#6b7598]">
          <span className="text-sm font-semibold uppercase tracking-wide">Personas</span>
          <span className="text-xs text-[#8791b9]">Los estados se actualizan en tiempo real</span>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-6 scrollbar-thin">
          {isFetching && <p className="px-4 py-6 text-center text-sm text-[#6f7a9c]">Cargando tu lista de contactos…</p>}
          {!isFetching && errorMessage && <p className="px-4 py-6 text-center text-sm text-[#d66586]">{errorMessage}</p>}
          {!isFetching && !errorMessage && filteredUsers.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[#6f7a9c]">Aún no encontramos coincidencias con tu búsqueda.</p>
          )}
          {!isFetching &&
            !errorMessage &&
            filteredUsers.map((person) => {
              const isOnline = Boolean(onlineUsers[person._id]);
              const unread = unreadCounts[person._id] || 0;
              const roomId = user ? `room:${[user._id, person._id].sort().join(":")}` : "";
              const latest = roomId ? latestMessages[roomId] : undefined;
              const isTyping = Boolean(typingState[person._id]);
              return (
                <button
                  key={person._id}
                  className="flex w-full items-center justify-between rounded-3xl border border-transparent px-4 py-4 text-left text-[#44506d] transition-colors hover:border-[#cfd8f6] hover:bg-white/70"
                  onClick={() => handleOpenConversation(person._id)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={person.name} isOnline={isOnline} sizeClass="h-14 w-14" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-[var(--rt-foreground)]">{person.name}</span>
                        <span className={`text-xs font-medium ${isOnline ? "text-[#3ba78c]" : "text-[#9aa3c6]"}`}>{isOnline ? "En línea" : "Ausente"}</span>
                      </div>
                      {isTyping ? (
                        <span className="text-xs text-[#4fb69d]">Escribiendo…</span>
                      ) : latest ? (
                        <span className="text-xs text-[#6f7a9c]">{latest.fromUserId === user?._id ? "Tú: " : ""}{latest.content.slice(0, 60)}</span>
                      ) : (
                        <span className="text-xs text-[#9aa3c6]">Aún no hay mensajes. ¡Saluda!</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge isVisible={unread > 0}>{unread}</Badge>
                    <span className="text-xs text-[#9aa3c6]">
                      {latest ? new Date(latest.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      </Card>
    </div>
  );
};

export default ChatLobbyPage;
