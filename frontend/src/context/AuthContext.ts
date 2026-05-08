import { createContext, useContext } from "react";
import type { User } from "../types/user";

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  login: (userData: User) => void;
  logout: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
