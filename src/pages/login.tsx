

// This line imports React along with state and effect hooks to manage component logic.
import React, { useEffect, useState } from "react";

// This line imports the Next.js router so we can navigate between pages after login.
import { useRouter } from "next/router";

// This line imports the authentication context to access login helpers and user data.
import { useAuth } from "../context/AuthContext";

// This line imports the Card component that provides the glassmorphism container.
import { Card } from "../components/ui/Card";

// This line imports the Input component used to render styled form fields.
import { Input } from "../components/ui/Input";

// This line imports the Button component for form submission.
import { Button } from "../components/ui/Button";

// This line imports the Toast component for inline status feedback.
import { Toast } from "../components/Toast";

// This line defines the LoginPage functional component.
const LoginPage: React.FC = () => {
  // This line instantiates the Next.js router for navigation after authentication.
  const router = useRouter();
  // This line pulls login helpers and user state from the authentication context.
  const { login, user, isLoading } = useAuth();
  // This line stores the email input value typed by the user.
  const [email, setEmail] = useState<string>("");
  // This line stores the password input value typed by the user.
  const [password, setPassword] = useState<string>("");
  // This line stores an optional inline error message for form validation.
  const [formError, setFormError] = useState<string>("");
  // This line stores the toast message shown above the form.
  const [toastMessage, setToastMessage] = useState<string>("");
  // This line stores the toast variant to control toast styling.
  const [toastVariant, setToastVariant] = useState<"info" | "success" | "error">("info");
  // This line tracks whether the form submission is currently running.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // This line redirects authenticated users away from the login page.
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (user) {
      router.replace("/chat");
    }
  }, [user, isLoading, router]);
  // This line defines the submission handler triggered when the login form is submitted.
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError("");
    if (!email || !password) {
      setFormError("Ingresa tu correo y tu contraseña.");
      setToastVariant("error");
      setToastMessage("No pudimos iniciar sesión: falta el correo o la contraseña.");
      return;
    }
    setIsSubmitting(true);
    const response = await login(email, password);
    setIsSubmitting(false);
    if (!response.success || !response.data) {
      setToastVariant("error");
      setToastMessage(response.error || "No pudimos iniciar sesión. Inténtalo de nuevo.");
      return;
    }
    setToastVariant("success");
    setToastMessage(`Nos alegra verte de vuelta, ${response.data.name}. Entrando a tus chats.`);
  };
  // This line renders the login form UI.
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="glass-panel hidden rounded-3xl bg-gradient-to-br from-[#e8f3ff]/70 via-[#fdf2ff]/60 to-[#fefaf2]/60 p-10 text-[#44506d] shadow-2xl md:flex md:flex-col md:justify-between">
          <div>
            <span className="text-sm uppercase tracking-widest text-[#7a88ad]">RoxTalk</span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--rt-foreground)]">Retoma tus charlas en un ambiente suave y relajado.</h1>
            <p className="mt-5 max-w-sm text-[#63729a]">Mantente cerca de quienes quieres con mensajes rápidos, notificaciones claras y una vista que descansa la vista.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#7a88ad]">Lo que disfrutarás</h2>
            <ul className="mt-4 space-y-3 text-sm text-[#586589]">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#a8ddff]" />
                <p>Sabrás al instante quién está disponible para hablar.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#fbc4ff]" />
                <p>Comparte ideas en burbujas suaves que hacen cada charla agradable.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#ffe0b5]" />
                <p>Recibe avisos discretos cuando haya algo nuevo por leer.</p>
              </li>
            </ul>
          </div>
        </div>
        <Card className="flex flex-col gap-6 text-[#44506d]">
          <div className="space-y-3 text-center">
            <h2 className="text-3xl font-semibold text-[var(--rt-foreground)]">Inicia sesión en RoxTalk</h2>
            <p className="text-sm text-[#62709c]">Usa tu correo y contraseña para continuar tu conversación.</p>
          </div>
          {toastMessage ? (
            <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
          ) : null}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              helperText={formError && !email ? formError : ""}
              isError={Boolean(formError && !email)}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              helperText={formError && email && !password ? formError : ""}
              isError={Boolean(formError && email && !password)}
            />
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full">Sign in</Button>
          </form>
          <div className="text-center text-sm text-[#62709c]">
            <span>¿Es tu primera vez en RoxTalk? </span>
            <button className="font-semibold text-[#6a5acd] hover:text-[#5848c2]" onClick={() => router.push("/register")}>Crea una cuenta</button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// This line exports the LoginPage component as the default export for the /login route.
export default LoginPage;
