// This line imports React along with the context, state, and effect hooks needed for authentication logic.
import React, { createContext, useContext, useEffect, useState } from "react";

// This line imports the Next.js router so we can navigate during login and logout.
import { useRouter } from "next/router";

// This line imports shared types used by the context to describe API responses and user objects.
import type { ApiResponse, UpdateProfileRequest, User } from "../types";

// This line defines the shape of the authentication context value exposed to components.
interface AuthContextValue {
  // This line provides the current authenticated user or null when unauthenticated.
  user: User | null;
  // This line indicates whether the provider is still loading the session state from the server.
  isLoading: boolean;
  // This line exposes the login helper that accepts credentials and returns the API response.
  login: (email: string, password: string) => Promise<ApiResponse<User>>;
  // This line exposes the register helper that creates a new account and returns the API response.
  register: (name: string, email: string, password: string) => Promise<ApiResponse<User>>;
  // This line exposes the logout helper that clears the user session.
  logout: () => Promise<void>;
  // This line exposes the profile update helper that patches the current user's details.
  updateProfile: (profile: UpdateProfileRequest) => Promise<ApiResponse<User>>;
}

// This line creates the authentication context with an undefined default to detect misuse.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// This line defines the props accepted by the AuthProvider component.
interface AuthProviderProps {
  // This line represents the React node tree that will be wrapped by the provider.
  children: React.ReactNode;
}

// This line defines the AuthProvider component that manages session state.
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // This line stores the current user in state or null when unauthenticated.
  const [user, setUser] = useState<User | null>(null);
  // This line stores whether we are still loading the session state from the API.
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // This line obtains the Next.js router to perform redirects after login or logout.
  const router = useRouter();
  // This line fetches the current session from the server when the provider mounts.
  useEffect(() => {
    const fetchSession = async (): Promise<void> => {
      try {
        const response = await fetch("/api/users/me", { method: "GET" });
        const data: ApiResponse<User> = await response.json();
        if (data.success && data.data) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, []);
  // This line defines the login helper exposed to consumers.
  const login = async (email: string, password: string): Promise<ApiResponse<User>> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data: ApiResponse<User> = await response.json();
      if (data.success && data.data) {
        setUser(data.data);
        router.replace("/chat");
      }
      return data;
    } catch {
      return { success: false, error: "Unable to reach the server. Please try again." };
    }
  };
  // This line defines the register helper exposed to consumers.
  const register = async (name: string, email: string, password: string): Promise<ApiResponse<User>> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data: ApiResponse<User> = await response.json();
      if (data.success && data.data) {
        setUser(data.data);
        router.replace("/chat");
      }
      return data;
    } catch {
      return { success: false, error: "Unable to reach the server. Please try again." };
    }
  };
  // This line defines the logout helper that clears the HttpOnly cookie and state.
  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.replace("/login");
    }
  };
  // This line defines the updateProfile helper that persists modal edits to the server.
  const updateProfile = async (profile: UpdateProfileRequest): Promise<ApiResponse<User>> => {
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const data: ApiResponse<User> = await response.json();
      if (data.success && data.data) {
        setUser(data.data);
      }
      return data;
    } catch {
      return { success: false, error: "No se pudo actualizar el perfil. Intenta nuevamente." };
    }
  };
  // This line memoizes the context value object combining state and helpers.
  const contextValue: AuthContextValue = { user, isLoading, login, register, logout, updateProfile };
  // This line returns the provider component that wraps its children with the context value.
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// This line defines the custom hook used by components to consume the auth context.
export const useAuth = (): AuthContextValue => {
  // This line retrieves the context value from React.
  const context = useContext(AuthContext);
  // This line ensures the hook is used inside an AuthProvider.
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // This line returns the context value to the caller.
  return context;
};
