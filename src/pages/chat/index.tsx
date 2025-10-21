/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import type { UpdateProfileRequest, User } from "../../types";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { TextArea } from "../../components/ui/TextArea";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const stopStream = (stream: MediaStream | null): void => {
  if (!stream) {
    return;
  }
  stream.getTracks().forEach((track) => track.stop());
};

const convertFileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No fue posible leer la imagen seleccionada."));
      }
    };
    reader.onerror = () => reject(new Error("No fue posible leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
};

const ChatLobbyPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading, logout, updateProfile } = useAuth();
  const { onlineUsers, unreadCounts, typingState, latestMessages, markConversationAsRead, socket } = useSocket();

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({ location: "", bio: "", avatar: "" });
  const [profileError, setProfileError] = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarError, setAvatarError] = useState<string>("");
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAvatarCameraOpen, setIsAvatarCameraOpen] = useState<boolean>(false);
  const [isAvatarCameraLoading, setIsAvatarCameraLoading] = useState<boolean>(false);
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null);
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const [viewingContact, setViewingContact] = useState<User | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);

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

  useEffect(() => {
    const videoEl = avatarVideoRef.current;
    if (!isAvatarCameraOpen) {
      stopStream(avatarStreamRef.current);
      avatarStreamRef.current = null;
      if (videoEl) {
        videoEl.srcObject = null;
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAvatarError("Tu navegador no permite usar la camara.");
      setIsAvatarCameraOpen(false);
      return;
    }
    let cancelled = false;
    const enableCamera = async (): Promise<void> => {
      try {
        setIsAvatarCameraLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        avatarStreamRef.current = stream;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => undefined);
        }
        setAvatarError("");
      } catch {
        setAvatarError("No pudimos acceder a la camara. Revisa los permisos del navegador.");
        setIsAvatarCameraOpen(false);
      } finally {
        setIsAvatarCameraLoading(false);
      }
    };
    void enableCamera();
    return () => {
      cancelled = true;
      stopStream(avatarStreamRef.current);
      avatarStreamRef.current = null;
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [isAvatarCameraOpen]);

  useEffect(() => {
    return () => {
      stopStream(avatarStreamRef.current);
      avatarStreamRef.current = null;
    };
  }, []);

  const openProfileModal = (): void => {
    if (!user) {
      return;
    }
    setProfileForm({
      location: user.location ?? "",
      bio: user.bio ?? "",
      avatar: user.avatar ?? ""
    });
    setAvatarPreview(user.avatar ?? "");
    setAvatarError("");
    setProfileError("");
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = (): void => {
    if (isSavingProfile) {
      return;
    }
    setIsAvatarCameraOpen(false);
    stopStream(avatarStreamRef.current);
    avatarStreamRef.current = null;
    setIsProfileModalOpen(false);
    setProfileError("");
    setAvatarError("");
  };

  const cancelProfileModal = (): void => {
    if (isSavingProfile) {
      return;
    }
    if (user) {
      setProfileForm({
        location: user.location ?? "",
        bio: user.bio ?? "",
        avatar: user.avatar ?? ""
      });
      setAvatarPreview(user.avatar ?? "");
    }
    setIsAvatarCameraOpen(false);
    stopStream(avatarStreamRef.current);
    avatarStreamRef.current = null;
    setProfileError("");
    setAvatarError("");
    setIsProfileModalOpen(false);
  };

  const handleAvatarUploadClick = (): void => {
    avatarFileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("La imagen debe pesar menos de 5 MB.");
      event.target.value = "";
      return;
    }
    try {
      const dataUrl = await convertFileToDataUrl(file);
      if (!dataUrl.startsWith("data:image/")) {
        setAvatarError("Selecciona un archivo de imagen valido.");
        return;
      }
      setAvatarPreview(dataUrl);
      setProfileForm((previous) => ({ ...previous, avatar: dataUrl }));
      setAvatarError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos leer la imagen seleccionada.";
      setAvatarError(message);
    } finally {
      event.target.value = "";
    }
  };

  const handleClearAvatar = (): void => {
    setAvatarPreview("");
    setProfileForm((previous) => ({ ...previous, avatar: "" }));
    setAvatarError("");
  };

  const openAvatarCamera = (): void => {
    if (isAvatarCameraLoading) {
      return;
    }
    setAvatarError("");
    setIsAvatarCameraOpen(true);
  };

  const closeAvatarCamera = (): void => {
    setIsAvatarCameraOpen(false);
    stopStream(avatarStreamRef.current);
    avatarStreamRef.current = null;
    if (avatarVideoRef.current) {
      avatarVideoRef.current.srcObject = null;
    }
  };

  const handleCaptureAvatar = (): void => {
    const video = avatarVideoRef.current;
    if (!video) {
      setAvatarError("La camara aun se esta preparando.");
      return;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setAvatarError("Espera a que la camara finalice de cargar.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setAvatarError("No pudimos capturar la imagen.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setAvatarPreview(dataUrl);
      setProfileForm((previous) => ({ ...previous, avatar: dataUrl }));
      setAvatarError("");
      closeAvatarCamera();
    } catch {
      setAvatarError("No pudimos capturar la imagen.");
    }
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!user) {
      setProfileError("Necesitas una sesion activa para actualizar tu perfil.");
      return;
    }
    const payload: UpdateProfileRequest = {
      location: profileForm.location.trim(),
      bio: profileForm.bio.trim(),
      avatar: profileForm.avatar
    };
    if (
      payload.location === (user.location ?? "") &&
      payload.bio === (user.bio ?? "") &&
      (payload.avatar || "") === (user.avatar ?? "")
    ) {
      setIsProfileModalOpen(false);
      return;
    }
    try {
      setIsSavingProfile(true);
      setProfileError("");
      const result = await updateProfile(payload);
      if (!result.success) {
        setProfileError(result.error || "No pudimos guardar tus cambios en este momento.");
        return;
      }
      setIsProfileModalOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users
      .filter((candidate) => candidate._id !== user?._id)
      .filter((candidate) => candidate.name.toLowerCase().includes(query) || candidate.email.toLowerCase().includes(query));
  }, [users, user?._id, searchTerm]);

  const profileHasChanges = user
    ? profileForm.location.trim() !== (user.location ?? "") ||
      profileForm.bio.trim() !== (user.bio ?? "") ||
      (profileForm.avatar || "") !== (user.avatar ?? "")
    : false;

  const joinedLabel = user ? new Date(user.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "";


  const openContactModal = (candidate: User): void => {
    setViewingContact(candidate);
    setIsContactModalOpen(true);
  };

  const closeContactModal = (): void => {
    setViewingContact(null);
    setIsContactModalOpen(false);
  };

  const handleOpenConversation = (selectedUserId: string): void => {
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
          <Button variant="secondary" onClick={() => router.push("/stories")}>
            Historias
          </Button>
          <Button variant="secondary" onClick={openProfileModal}>
            Mi perfil
          </Button>
          <Button variant="ghost" onClick={logout}>
            Cerrar sesion
          </Button>
        </div>
      </header>
      <Card className="glass-panel space-y-4 p-0">
        <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-white/90 to-white/70 px-8 py-6 text-[#6b7598]">
          <span className="text-sm font-semibold uppercase tracking-wide">Personas</span>
          <span className="text-xs text-[#8791b9]">Los estados se actualizan en tiempo real</span>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-6 scrollbar-thin">
          {isFetching && <p className="px-4 py-6 text-center text-sm text-[#6f7a9c]">Cargando tu lista de contactos...</p>}
          {!isFetching && errorMessage && <p className="px-4 py-6 text-center text-sm text-[#d66586]">{errorMessage}</p>}
          {!isFetching && !errorMessage && filteredUsers.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[#6f7a9c]">Aun no encontramos coincidencias con tu busqueda.</p>
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
                    <Avatar name={person.name} imageUrl={person.avatar} isOnline={isOnline} sizeClass="h-14 w-14" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-[var(--rt-foreground)]">{person.name}</span>
                        <span className={`text-xs font-medium ${isOnline ? "text-[#3ba78c]" : "text-[#9aa3c6]"}`}>{isOnline ? "En linea" : "Ausente"}</span>
                      </div>
                      {person.location ? (
                        <span className="text-xs text-[#4b5375]">{person.location}</span>
                      ) : null}
                      {isTyping ? (
                        <span className="text-xs text-[#4fb69d]">Escribiendo...</span>
                      ) : latest ? (
                        <span className="text-xs text-[#6f7a9c]">
                          {latest.fromUserId === user?._id ? "Tu: " : ""}
                          {latest.content.slice(0, 60)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9aa3c6]">Aun no hay mensajes. Saluda!</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          openContactModal(person);
                        }}
                      >
                        Ver perfil
                      </Button>
                    </div>
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
      {isProfileModalOpen && user ? (
        <Modal
          title="Tu perfil"
          description="Actualiza los detalles que tus contactos veran."
          onClose={closeProfileModal}
          onCancel={cancelProfileModal}
          onSave={handleSaveProfile}
          isSaving={isSavingProfile}
          isSaveDisabled={!profileHasChanges || isSavingProfile}
          isCancelDisabled={isSavingProfile}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre"
              value={user.name}
              disabled
              readOnly
              className="disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Input
              label="Correo"
              value={user.email}
              disabled
              readOnly
              className="disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[#d4dcf8] bg-white/70">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <Avatar name={user.name} imageUrl={user.avatar} sizeClass="h-24 w-24" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={handleAvatarUploadClick}>
                    Subir foto
                  </Button>
                  <Button type="button" variant="ghost" onClick={openAvatarCamera} disabled={isAvatarCameraLoading}>
                    Usar camara
                  </Button>
                  {avatarPreview ? (
                    <Button type="button" variant="ghost" onClick={handleClearAvatar}>
                      Quitar foto
                    </Button>
                  ) : null}
                </div>
                <span className="text-xs text-[#7a809c]">Formatos permitidos: JPG/PNG. Maximo 5 MB.</span>
              </div>
            </div>
            <input ref={avatarFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
          </div>
          <Input
            label="Ubicacion"
            placeholder="Ciudad, pais"
            value={profileForm.location}
            onChange={(event) => setProfileForm((previous) => ({ ...previous, location: event.target.value }))}
            maxLength={120}
          />
          <TextArea
            label="Biografia"
            placeholder="Cuenta algo sobre ti y lo que disfrutas."
            value={profileForm.bio}
            onChange={(event) => setProfileForm((previous) => ({ ...previous, bio: event.target.value }))}
            maxLength={600}
            rows={5}
            helperText={`${profileForm.bio.length}/600`}
            className="min-h-[140px]"
          />
          {joinedLabel ? (
            <p className="text-xs text-[#7a809c]">Miembro desde {joinedLabel}.</p>
          ) : null}
          {avatarError ? (
            <p className="text-xs font-medium text-[#d66586]">{avatarError}</p>
          ) : null}
          {profileError ? (
            <p className="text-xs font-medium text-[#d66586]">{profileError}</p>
          ) : null}
        </Modal>
      ) : null}
      {isContactModalOpen && viewingContact ? (
        <Modal
          title={viewingContact.name}
          description="Detalles del perfil"
          onClose={closeContactModal}
          onCancel={closeContactModal}
          onSave={closeContactModal}
          isSaving={false}
          isSaveDisabled={false}
          isCancelDisabled={false}
          saveLabel="Cerrar"
          cancelLabel=""
        >
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
            <Avatar name={viewingContact.name} imageUrl={viewingContact.avatar} sizeClass="h-24 w-24" />
            <div className="space-y-2 text-sm text-[#4b5375]">
              <p><strong>Correo:</strong> {viewingContact.email}</p>
              <p><strong>Ubicacion:</strong> {viewingContact.location || "Sin informacion"}</p>
              <p><strong>Biografia:</strong> {viewingContact.bio || "Sin informacion"}</p>
              {viewingContact.createdAt ? (
                <p className="text-xs text-[#7a809c]">Miembro desde {new Date(viewingContact.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}      {isAvatarCameraOpen ? (
        <Modal
          title="Camara"
          description="Ajusta tu foto de perfil con la camara del dispositivo."
          onClose={closeAvatarCamera}
          onCancel={closeAvatarCamera}
          onSave={handleCaptureAvatar}
          isSaving={false}
          isSaveDisabled={isAvatarCameraLoading}
          isCancelDisabled={false}
          saveLabel="Capturar"
          cancelLabel=""
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-[#dbe1f7] bg-black/40">
              <video ref={avatarVideoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
            </div>
            {isAvatarCameraLoading ? <p className="text-sm text-[#6f7a9c]">Activando la camara...</p> : null}
            <p className="text-xs text-[#7a809c]">Mantente centrado en la imagen antes de capturar.</p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default ChatLobbyPage;
