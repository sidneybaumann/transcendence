import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { User } from "../types/user";
import { getCsrfToken } from "../services/csrf";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me", {
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        await refreshUser();
      } finally {
        setAuthChecked(true);
      }
    }

    checkAuth();
  }, [refreshUser]);

  useEffect(() => {
    getCsrfToken().catch(() => {});
  }, []);

  useEffect(() => {
    const recheckAuth = () => {
      refreshUser().catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recheckAuth();
      }
    };

    window.addEventListener("focus", recheckAuth);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", recheckAuth);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshUser]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    if (!user) {
      setUser(null);
      return true;
    }

    try {
      const token = await getCsrfToken();

      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "x-csrf-token": token,
        },
      });

      if (res.ok || res.status === 401) {
        setUser(null);
        return true;
      }

      await refreshUser(); // Coucou
      return false;
    } catch {
      await refreshUser();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        authChecked,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
