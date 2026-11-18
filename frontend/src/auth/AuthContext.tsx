import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest<T>(path: string, body?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    headers: body ? { Accept: "application/json", "Content-Type": "application/json" } : { Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const result = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(result.error ?? "The authentication service could not complete your request.");
  return result;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    authRequest<{ user: AuthUser }>("me", undefined, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setUser(result.user); })
      .catch(() => { if (!controller.signal.aborted) setUser(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authRequest<{ user: AuthUser }>("login", { email, password });
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await authRequest<{ user: AuthUser }>("register", { name, email, password });
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await authRequest<{ status: string }>("logout", {});
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
