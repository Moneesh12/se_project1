import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import * as authApi from "@/lib/auth-api";

interface User {
  id: number; name: string; email: string;
  profilePicture: string | null; dietaryPreferences: string[] | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi.getMe()
      .then((user) => setUser(user))
      .catch(() => {
        localStorage.removeItem("auth_token");
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem("auth_token", result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, confirmPassword: string) => {
    const result = await authApi.signup(name, email, password, confirmPassword);
    localStorage.setItem("auth_token", result.token);
    setUser(result.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
