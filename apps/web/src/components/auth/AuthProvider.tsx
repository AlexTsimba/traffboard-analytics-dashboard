"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { verifyAccessToken } from "@traffboard/auth";

interface User {
  id: number;
  email: string;
  twoFactorEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (!refreshToken) {
      logout();
      return false;
    }

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        login(data.accessToken, data.refreshToken, data.user);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error("Session refresh failed:", error);
      logout();
      return false;
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const accessToken = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");
      
      if (accessToken && userStr) {
        // Verify token is still valid
        const tokenPayload = verifyAccessToken(accessToken);
        if (tokenPayload) {
          setUser(JSON.parse(userStr));
        } else {
          // Token expired, try refresh
          await refreshSession();
        }
      }
      
      setIsLoading(false);
    };

    checkSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
