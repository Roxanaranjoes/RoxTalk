

// This line imports React along with state and effect hooks to manage form behavior.
import React, { useEffect, useState } from "react";

// This line imports the Next.js router so we can navigate programmatically after registration.
import { useRouter } from "next/router";

// This line imports the authentication context to access the register helper and user state.
import { useAuth } from "../context/AuthContext";

// This line imports the Card component that provides the glassmorphism layout.
import { Card } from "../components/ui/Card";

// This line imports the Input component for rendering styled form fields.
import { Input } from "../components/ui/Input";

// This line imports the Button component for submitting the form.
import { Button } from "../components/ui/Button";

// This line imports the Toast component to display feedback messages.
import { Toast } from "../components/Toast";

// This line defines the RegisterPage functional component.
const RegisterPage: React.FC = () => {
  // This line instantiates the router to allow navigation to other pages.
  const router = useRouter();
  // This line pulls register helpers and user state from the authentication context.
  const { register, user, isLoading } = useAuth();
  // This line stores the display name typed by the user.
  const [name, setName] = useState<string>("");
  // This line stores the email typed by the user.
  const [email, setEmail] = useState<string>("");
  // This line stores the password typed by the user.
  const [password, setPassword] = useState<string>("");
  // This line stores the message shown inside the toast component.
  const [toastMessage, setToastMessage] = useState<string>("");
  // This line stores the variant used to style the toast message.
  const [toastVariant, setToastVariant] = useState<"info" | "success" | "error">("info");
  // This line tracks whether the form is currently submitting.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // This line immediately redirects authenticated users away from the registration page.
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (user) {
      router.replace("/chat");
    }
  }, [user, isLoading, router]);
  // This line defines the handler invoked when the registration form is submitted.
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setToastMessage("");
    if (!name || !email || !password) {
      setToastVariant("error");
      setToastMessage("Completa todos los campos para crear tu cuenta.");
      return;
    }
    setIsSubmitting(true);
    const response = await register(name, email, password);
    setIsSubmitting(false);
    if (!response.success || !response.data) {
      setToastVariant("error");
      setToastMessage(response.error || "No pudimos crear la cuenta. Inténtalo más tarde.");
      return;
    }
    setToastVariant("success");
    setToastMessage(`Bienvenido a RoxTalk, ${response.data.name}. Estamos preparando tu espacio.`);
  };
  // This line renders the registration layout and form.
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-3xl space-y-8 text-[#44506d]">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-semibold text-[var(--rt-foreground)]">Crea tu cuenta en RoxTalk</h1>
          <p className="text-sm text-[#6f7a9c]">Comparte tu nombre, correo y una contraseña para empezar a conversar.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--rt-foreground)]">Solo unos pasos más.</h2>
            <p className="text-sm text-[#6f7a9c]">Disfruta un espacio pensado para conversaciones tranquilas, recordatorios suaves y contactos siempre a la vista.</p>
            <div className="space-y-3 rounded-3xl border border-sky-200/60 bg-white/70 p-5 backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#a8ddff] to-[#c7f0ff] text-center text-2xl leading-[2.5rem] text-[var(--rt-foreground)]">1</span>
                <p className="text-sm text-[#5e6c93]">Tus datos quedan guardados de forma privada para que vuelvas cuando quieras.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#ffe0b5] to-[#ffd0f2] text-center text-2xl leading-[2.5rem] text-[var(--rt-foreground)]">2</span>
                <p className="text-sm text-[#5e6c93]">Verás quién está disponible al instante para iniciar una nueva charla.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#d7c8ff] to-[#fbe0ff] text-center text-2xl leading-[2.5rem] text-[var(--rt-foreground)]">3</span>
                <p className="text-sm text-[#5e6c93]">Tus conversaciones se mantienen ordenadas y fáciles de seguir.</p>
              </div>
            </div>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {toastMessage ? (
              <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
            ) : null}
            <Input
              label="Nombre completo"
              placeholder="Tu nombre visible"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Crea una contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full">Crear cuenta</Button>
          </form>
        </div>
        <div className="text-center text-sm text-[#6f7a9c]">
          <span>¿Ya tienes cuenta? </span>
          <button className="font-semibold text-[#6a5acd] hover:text-[#5848c2]" onClick={() => router.push("/login")}>Inicia sesión</button>
        </div>
      </Card>
    </div>
  );
};

// This line exports the RegisterPage component as the default export for the /register route.
export default RegisterPage;
