// This line imports React and useEffect to handle redirect logic.
import React, { useEffect } from "react";

// This line imports the Next.js router to perform client-side navigation.
import { useRouter } from "next/router";

// This line imports the authentication context so we can read the current user state.
import { useAuth } from "../context/AuthContext";

// This line imports the Card component used to display the loading message.
import { Card } from "../components/ui/Card";

// This line defines the IndexPage component rendered at the root path.
const IndexPage: React.FC = () => {
  // This line retrieves the current user and loading status from the auth context.
  const { user, isLoading } = useAuth();
  // This line acquires the Next.js router instance for navigation.
  const router = useRouter();
  // This line triggers a redirect once the authentication state is resolved.
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (user) {
      router.replace("/chat");
    } else {
      router.replace("/login");
    }
  }, [user, isLoading, router]);
  // This line renders a simple card while the redirect is in progress.
  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-6 py-12">
      <Card className="max-w-md text-center text-[#44506d]">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--rt-foreground)]">Verificando tu sesión en RoxTalk…</h1>
        <p className="mt-4 text-sm text-[#6f7a9c]">En un instante te llevaremos a donde corresponde.</p>
      </Card>
    </main>
  );
};

// This line exports the IndexPage component as the default export for the root path.
export default IndexPage;
