import { createContext } from "react";

export interface AuthContextType {
  isHostAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  adminPassword: string | null;
  loginHost: (password: string) => boolean;
  loginAdmin: (password: string) => void;
  logoutHost: () => void;
  logoutAdmin: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
