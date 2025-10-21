/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import type { ApiResponse, CreateStoryRequest, ReactStoryRequest, Story } from "../../types";
import { Card } from "../../components/ui/Card";
import { TextArea } from "../../components/ui/TextArea";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 12;
const MAX_IMAGE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const allowedReactions = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F525}", "\u{1F44F}"];

const toDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No fue posible leer el archivo seleccionado."));
      }
    };
    reader.onerror = () => reject(new Error("No fue posible leer el archivo seleccionado."));
    reader.readAsDataURL(file);
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No fue posible procesar el audio grabado."));
      }
    };
    reader.onerror = () => reject(new Error("No fue posible procesar el audio grabado."));
    reader.readAsDataURL(blob);
  });
};

const stopStream = (stream: MediaStream | null): void => {
  if (!stream) {
    return;
  }
  stream.getTracks().forEach((track) => track.stop());
};

const StoriesPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [audio, setAudio] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReacting, setIsReacting] = useState<Record<string, boolean>>({});

  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shouldDiscardRecordingRef = useRef<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const [recordingError, setRecordingError] = useState<string>("");

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  const fetchStories = async (): Promise<void> => {
    try {
      setIsFetching(true);
      const response = await fetch("/api/stories");
      const data: ApiResponse<Story[]> = await response.json();
      if (!data.success || !data.data) {
        setStories([]);
        setFetchError(data.error || "No pudimos cargar las historias.");
      } else {
        setStories(data.data);
        setFetchError("");
      }
    } catch {
      setStories([]);
      setFetchError("Ocurrio un error inesperado al cargar las historias.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    void fetchStories();
  }, [user]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!isCameraOpen) {
      stopStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      if (videoElement) {
        videoElement.srcObject = null;
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("No fue posible acceder a la camara. Verifica tu navegador.");
      setIsCameraOpen(false);
      return;
    }
    let cancelled = false;
    const enableCamera = async (): Promise<void> => {
      try {
        setIsCameraInitializing(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraError("");
      } catch {
        setCameraError("No pudimos usar la camara. Revisa los permisos del navegador.");
        setIsCameraOpen(false);
      } finally {
        setIsCameraInitializing(false);
      }
    };
    void enableCamera();
    return () => {
      cancelled = true;
      stopStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      stopStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      stopStream(audioStreamRef.current);
      audioStreamRef.current = null;
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const addImagesFromFiles = async (files: FileList | null): Promise<void> => {
    if (!files) {
      return;
    }
    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setFormError(`Solo puedes seleccionar ${MAX_IMAGES} imagenes.`);
      return;
    }
    const selected = Array.from(files).slice(0, remainingSlots);
    const conversions = await Promise.allSettled(
      selected.map(async (file) => {
        if (file.size > MAX_IMAGE_BYTES) {
          throw new Error(`Cada imagen debe pesar menos de ${MAX_IMAGE_SIZE_MB} MB.`);
        }
        const dataUrl = await toDataUrl(file);
        if (!dataUrl.startsWith("data:image/")) {
          throw new Error("Solo puedes subir imagenes.");
        }
        return dataUrl;
      })
    );
    const successful: string[] = [];
    let lastError = "";
    conversions.forEach((result) => {
      if (result.status === "fulfilled") {
        successful.push(result.value);
      } else {
        lastError = result.reason instanceof Error ? result.reason.message : "No se pudo procesar una imagen.";
      }
    });
    if (successful.length > 0) {
      setImages((previous) => [...previous, ...successful]);
      setFormError("");
    } else if (lastError) {
      setFormError(lastError);
    }
  };

  const handleOpenCamera = (): void => {
    if (images.length >= MAX_IMAGES) {
      setFormError(`Solo puedes seleccionar ${MAX_IMAGES} imagenes.`);
      return;
    }
    setCameraError("");
    setFormError("");
    setIsCameraOpen(true);
  };

  const handleCloseCamera = (): void => {
    setIsCameraOpen(false);
    setCameraError("");
    stopStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapturePhoto = (): void => {
    if (!videoRef.current) {
      setCameraError("La camara aun se esta inicializando.");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setFormError(`Solo puedes seleccionar ${MAX_IMAGES} imagenes.`);
      return;
    }
    const video = videoRef.current;
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("No pudimos capturar la imagen. Intenta de nuevo.");
      return;
    }
    context.drawImage(video, 0, 0, width, height);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setImages((previous) => [...previous, dataUrl]);
      setFormError("");
    } catch {
      setCameraError("No pudimos procesar la foto capturada.");
    }
  };

  const handleStartRecording = async (): Promise<void> => {
    if (isRecording) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError("Tu navegador no soporta la grabacion de audio.");
      return;
    }
    try {
      setRecordingError("");
      setFormError("");
      setAudio("");
      audioChunksRef.current = [];
      shouldDiscardRecordingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          options.mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options.mimeType = "audio/mp4";
        }
      }
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setRecordingError("Ocurrio un problema con la grabacion.");
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          window.clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setRecordingSeconds(0);
        stopStream(audioStreamRef.current);
        audioStreamRef.current = null;
        const discard = shouldDiscardRecordingRef.current;
        shouldDiscardRecordingRef.current = false;
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (discard) {
          return;
        }
        if (chunks.length === 0) {
          setRecordingError("No se capturo audio. Intenta nuevamente.");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > MAX_AUDIO_BYTES) {
          setRecordingError("La nota de voz supera el tamano permitido. Graba un audio mas corto.");
          return;
        }
        try {
          const dataUrl = await blobToDataUrl(blob);
          setAudio(dataUrl);
          setRecordingError("");
        } catch (error) {
          const message = error instanceof Error ? error.message : "No pudimos guardar la nota de voz.";
          setRecordingError(message);
        }
      };
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((previous) => previous + 1);
      }, 1000);
    } catch {
      setRecordingError("No pudimos acceder al microfono. Revisa los permisos del navegador.");
      stopStream(audioStreamRef.current);
      audioStreamRef.current = null;
    }
  };

  const handleStopRecording = (): void => {
    if (!mediaRecorderRef.current) {
      return;
    }
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      shouldDiscardRecordingRef.current = true;
      mediaRecorderRef.current.stop();
    } else {
      shouldDiscardRecordingRef.current = false;
      setIsRecording(false);
      setRecordingSeconds(0);
    }
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    stopStream(audioStreamRef.current);
    audioStreamRef.current = null;
  };

  const handleAudioSelection = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setFormError("La nota de voz debe pesar menos de 12 MB.");
      event.target.value = "";
      return;
    }
    try {
      const dataUrl = await toDataUrl(file);
      if (!dataUrl.startsWith("data:audio/")) {
        setFormError("Sube solo notas de voz en formato de audio.");
        return;
      }
      setAudio(dataUrl);
      setFormError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo leer el archivo de audio.";
      setFormError(message);
    } finally {
      event.target.value = "";
    }
  };

  const resetForm = (): void => {
    setContent("");
    setImages([]);
    setAudio("");
    setFormError("");
    setCameraError("");
    setRecordingError("");
  };

  const handleSubmitStory = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!user || isSubmitting) {
      return;
    }
    if (content.trim().length === 0 && images.length === 0 && !audio) {
      setFormError("Comparte texto, una imagen o una nota de voz antes de publicar.");
      return;
    }
    const payload: CreateStoryRequest = {
      content: content.trim(),
      images,
      audio
    };
    try {
      setIsSubmitting(true);
      setFormError("");
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data: ApiResponse<Story> = await response.json();
      if (!data.success) {
        setFormError(data.error || "No pudimos publicar tu historia.");
        return;
      }
      const newStory = data.data;
      if (!newStory) {
        setFormError("No pudimos publicar tu historia.");
        return;
      }
      setStories((previous) => [newStory, ...previous]);
      resetForm();
    } catch {
      setFormError("Ocurrio un error al publicar tu historia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveImage = (index: number): void => {
    setImages((previous) => previous.filter((_, position) => position !== index));
  };

  const handleRemoveAudio = (): void => {
    setAudio("");
    setRecordingError("");
  };

  const handleReact = async (storyId: string, emoji: string): Promise<void> => {
    if (!user) {
      return;
    }
    const reactingKey = `${storyId}-${emoji}`;
    if (isReacting[reactingKey]) {
      return;
    }
    setIsReacting((previous) => ({ ...previous, [reactingKey]: true }));
    try {
      const payload: ReactStoryRequest = { storyId, emoji };
      const response = await fetch("/api/stories/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data: ApiResponse<Story> = await response.json();
      if (!data.success || !data.data) {
        return;
      }
      setStories((previous) => previous.map((candidate) => (candidate._id === storyId ? data.data! : candidate)));
    } finally {
      setIsReacting((previous) => {
        const updated = { ...previous };
        delete updated[reactingKey];
        return updated;
      });
    }
  };

  const storiesByUser = useMemo(() => {
    return stories.reduce<Record<string, number>>((accumulator, story) => {
      accumulator[story.userId] = (accumulator[story.userId] || 0) + 1;
      return accumulator;
    }, {});
  }, [stories]);

  return (
    <div className="flex min-h-screen flex-col gap-10 bg-gradient-to-br from-[#f8fbff] via-white to-[#f3f4ff] px-6 py-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-[var(--rt-foreground)]">Historias</h1>
          <p className="text-sm text-[#6f7a9c]">Comparte momentos que desaparecen en 24 horas con tu comunidad.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => router.push("/chat")}>
            Volver al chat
          </Button>
          <Button variant="ghost" onClick={() => void fetchStories()}>
            Actualizar historias
          </Button>
        </div>
      </header>

      <section>
        <Card className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--rt-foreground)]">Crear nueva historia</h2>
            <p className="text-sm text-[#6f7a9c]">Puedes publicar texto, hasta cuatro imagenes y una nota de voz.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmitStory}>
            <TextArea
              label="Que quieres contar?"
              placeholder="Escribe algo que quieras compartir por 24 horas..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              helperText={`${content.length}/500`}
              maxLength={500}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenCamera}
                disabled={isCameraOpen || isCameraInitializing || images.length >= MAX_IMAGES}
              >
                {isCameraInitializing ? "Activando camara..." : "Abrir camara"}
              </Button>
              <Button
                type="button"
                variant={isRecording ? "primary" : "secondary"}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isCameraInitializing}
              >
                {isRecording ? `Detener (${recordingSeconds}s)` : audio ? "Regrabar audio" : "Grabar audio"}
              </Button>
              {isRecording ? (
                <Button type="button" variant="ghost" onClick={handleCancelRecording}>
                  Cancelar
                </Button>
              ) : null}
              {isRecording ? <span className="text-xs text-[#7a809c]">Grabando... {recordingSeconds}s</span> : null}
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <label className="md:w-1/2">
                <span className="text-sm font-medium text-[#2f2a4a]">Imagenes</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-2 block w-full rounded-2xl border border-dashed border-[#cfd8f6] bg-white/70 px-4 py-6 text-sm text-[#6f7a9c]"
                  onChange={(event) => void addImagesFromFiles(event.target.files)}
                />
                <span className="mt-2 block text-xs text-[#7a809c]">
                  Hasta {MAX_IMAGES} imagenes, maximo {MAX_IMAGE_SIZE_MB} MB cada una.
                </span>
              </label>
              <label className="md:w-1/2">
                <span className="text-sm font-medium text-[#2f2a4a]">Nota de voz</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="mt-2 block w-full rounded-2xl border border-dashed border-[#cfd8f6] bg-white/70 px-4 py-6 text-sm text-[#6f7a9c]"
                  onChange={handleAudioSelection}
                />
                <span className="mt-2 block text-xs text-[#7a809c]">Un archivo de audio, maximo 12 MB.</span>
              </label>
            </div>
            {images.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-4">
                {images.map((image, index) => (
                  <div key={`${image}-${index}`} className="relative">
                    <img src={image} alt={`Imagen ${index + 1}`} className="h-32 w-full rounded-2xl border border-[#dbe1f7] object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0f172a]/70 text-xs text-white"
                      aria-label="Eliminar imagen"
                    >
                    X
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {audio ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#dbe1f7] bg-white/70 px-4 py-3">
                <audio controls src={audio} className="w-full" />
                <button
                  type="button"
                  onClick={handleRemoveAudio}
                  className="text-sm font-semibold text-[#d66586] transition hover:text-[#ab4f68]"
                >
                  Quitar audio
                </button>
              </div>
            ) : null}
            {cameraError ? <p className="text-sm text-[#d66586]">{cameraError}</p> : null}
            {recordingError ? <p className="text-sm text-[#d66586]">{recordingError}</p> : null}
            {formError ? <p className="text-sm text-[#d66586]">{formError}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                Publicar historia
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[var(--rt-foreground)]">Historias recientes</h2>
          <span className="text-xs text-[#7a809c]">Activas: {stories.length}</span>
        </div>
        {isFetching ? (
          <Card className="text-center text-sm text-[#6f7a9c]">Cargando historias...</Card>
        ) : fetchError ? (
          <Card className="text-center text-sm text-[#d66586]">{fetchError}</Card>
        ) : stories.length === 0 ? (
          <Card className="text-center text-sm text-[#6f7a9c]">No hay historias activas, publica la primera!</Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {stories.map((story) => {
              const remainingMs = Math.max(0, new Date(story.expiresAt).getTime() - Date.now());
              const hours = Math.floor(remainingMs / (60 * 60 * 1000));
              const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
              const expiresLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
              const userId = user?._id ?? "";
              const reactionButtons = allowedReactions.map((emoji) => {
                const reactionsForEmoji = story.reactions[emoji] || [];
                const hasReacted = reactionsForEmoji.includes(userId);
                const count = reactionsForEmoji.length;
                const key = `${story._id}-${emoji}`;
                return (
                  <Button
                    key={key}
                    variant={hasReacted ? "primary" : "ghost"}
                    className="px-3 py-1 text-sm"
                    onClick={() => handleReact(story._id, emoji)}
                    disabled={Boolean(isReacting[key])}
                  >
                    {emoji} {count > 0 ? count : ""}
                  </Button>
                );
              });
              return (
                <Card key={story._id} className="space-y-4">
                  <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--rt-foreground)]">{story.author.name}</h3>
                      <p className="text-xs text-[#7a809c]">{story.author.email}</p>
                    </div>
                    <div className="text-right text-xs text-[#7a809c]">
                      <p>{expiresLabel} restantes</p>
                      <p>Historias del autor: {storiesByUser[story.userId] || 0}</p>
                    </div>
                  </header>
                  {story.content ? <p className="text-sm text-[#4b5375]">{story.content}</p> : null}
                  {story.images.length > 0 ? (
                    <div className={`grid gap-3 ${story.images.length > 1 ? "md:grid-cols-2" : ""}`}>
                      {story.images.map((image, index) => (
                        <img
                          key={`${story._id}-image-${index}`}
                          src={image}
                          alt={`Historia de ${story.author.name}`}
                          className="w-full rounded-2xl border border-[#dbe1f7] object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                  {story.audio ? (
                    <div className="rounded-2xl border border-[#dbe1f7] bg-white/80 px-4 py-3">
                      <audio controls src={story.audio} className="w-full" />
                    </div>
                  ) : null}
                  <footer className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">{reactionButtons}</div>
                    <span className="text-xs text-[#7a809c]">
                      Publicada {new Date(story.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </footer>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {isCameraOpen ? (
        <Modal
          title="Camara"
          description="Captura una foto y anadela a tu historia."
          onClose={handleCloseCamera}
          onCancel={handleCloseCamera}
          onSave={handleCapturePhoto}
          isSaving={false}
          isSaveDisabled={isCameraInitializing || images.length >= MAX_IMAGES}
          isCancelDisabled={false}
          saveLabel="Tomar foto"
          cancelLabel="Cerrar"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-[#dbe1f7] bg-black/40">
              <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
            </div>
            <p className="text-sm text-[#6f7a9c]">Presiona Tomar foto para agregar la captura a tu historia.</p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default StoriesPage;
