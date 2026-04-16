import { createContext } from "react";

export interface AuthContextType {
  isHostAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  hostToken: string | null;
  adminToken: string | null;
  loginHost: (password: string) => Promise<boolean>;
  loginAdmin: (password: string) => Promise<boolean>;
  logoutHost: () => void;
  logoutAdmin: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
